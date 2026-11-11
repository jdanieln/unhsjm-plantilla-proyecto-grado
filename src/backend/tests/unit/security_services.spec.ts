import { test } from '@japa/runner'
import CryptoService from '#services/crypto_service'
import CloudinaryService from '#services/cloudinary_service'
import PaymentService from '#services/payment_service'
import { PaymentMethod } from '#enums/payment_method'
import type { MultipartFile } from '@adonisjs/core/types/bodyparser'

test.group('CryptoService', () => {
  test('encrypts with a random nonce and restores the original text', ({ assert }) => {
    const service = new CryptoService()
    const first = service.encrypt('dato privado')
    const second = service.encrypt('dato privado')
    assert.notEqual(first, second)
    assert.equal(service.decrypt(first), 'dato privado')
    assert.equal(service.decrypt(second), 'dato privado')
  })

  test('rejects malformed and tampered ciphertext', ({ assert }) => {
    const service = new CryptoService()
    assert.throws(() => service.decrypt('invalid'))
    const parts = service.encrypt('dato').split(':')
    parts[2] = Buffer.alloc(16).toString('base64')
    assert.throws(() => service.decrypt(parts.join(':')))
  })
})

test.group('CloudinaryService validation', () => {
  const file = (mime: string, size: number, tmpPath?: string) =>
    ({ headers: { 'content-type': mime }, size, tmpPath }) as unknown as MultipartFile

  test('accepts a small image and rejects missing uploads', ({ assert }) => {
    const service = new CloudinaryService()
    assert.doesNotThrow(() => service.validateImage(file('image/png', 1024, 'image.png')))
    assert.throws(() => service.validateImage(file('image/png', 1024)), 'No file was uploaded.')
  })

  test('rejects unsupported types and files over two megabytes', ({ assert }) => {
    const service = new CloudinaryService()
    assert.throws(
      () => service.validateImage(file('text/plain', 10, 'file.txt')),
      /Invalid file type/
    )
    assert.throws(
      () => service.validateImage(file('image/jpeg', 2 * 1024 * 1024 + 1, 'image.jpg')),
      /exceeds the 2 MB limit/
    )
  })

  test('does nothing when there is no remote image id', async ({ assert }) => {
    assert.isTrue(await new CloudinaryService().delete(null))
  })
})

test.group('PaymentService calculations and card checks', () => {
  // These helpers are internal, so access them structurally without changing the production API.
  const service = new PaymentService() as unknown as {
    getOrderAmount(order: { details: { amount: number | null }[] }): number
    getCardSummary(number: string): { brand: string; last4: string }
    validatePaymentPayload(payload: Record<string, unknown>): void
  }

  test('sums cargo prices without including empty amounts', ({ assert }) => {
    assert.equal(
      service.getOrderAmount({ details: [{ amount: 120 }, { amount: null }, { amount: 35 }] }),
      155
    )
  })

  test('detects card brand and exposes only the final four digits', ({ assert }) => {
    assert.deepEqual(service.getCardSummary('4111 1111 1111 1234'), {
      brand: 'Visa',
      last4: '1234',
    })
    assert.equal(service.getCardSummary('5555 5555 5555 4444').brand, 'Mastercard')
  })

  test('requires the details appropriate to each payment method', ({ assert }) => {
    assert.throws(() => service.validatePaymentPayload({ method: PaymentMethod.CARD }), /tarjeta/)
    assert.throws(
      () => service.validatePaymentPayload({ method: PaymentMethod.TRANSFER }),
      /referencia/
    )
    assert.doesNotThrow(() =>
      service.validatePaymentPayload({
        method: PaymentMethod.TRANSFER,
        transferReference: 'ABC123',
      })
    )
  })
})
