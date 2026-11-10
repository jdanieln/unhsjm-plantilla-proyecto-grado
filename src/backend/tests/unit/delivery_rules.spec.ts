import { test } from '@japa/runner'
import { aggregateDeliveryStatus, needsDeliveryReview } from '#services/delivery_rules'

test.group('Delivery rules', () => {
  test('marks a delivery as delivered when every detail is confirmed', ({ assert }) => {
    assert.equal(aggregateDeliveryStatus(['confirmed', 'confirmed']), 'entregado')
  })

  test('prioritizes disputed deliveries', ({ assert }) => {
    assert.equal(
      aggregateDeliveryStatus(['confirmed', 'disputed', 'in_transit']),
      'entrega_disputada'
    )
  })

  test('marks a delivery as in transit when a detail is pending or in transit', ({ assert }) => {
    assert.equal(aggregateDeliveryStatus(['confirmed', 'in_transit']), 'en_transito')
  })

  test('requires a new delivery when a detail is rescheduled', ({ assert }) => {
    assert.equal(aggregateDeliveryStatus(['confirmed', 'rescheduled']), 'requiere_nueva_entrega')
  })

  test('keeps an empty or unconfirmed delivery pending', ({ assert }) => {
    assert.equal(aggregateDeliveryStatus([]), 'pendiente_confirmacion')
    assert.equal(aggregateDeliveryStatus(['awaiting_confirmation']), 'pendiente_confirmacion')
  })

  test('requires review after 48 hours without confirmation', ({ assert }) => {
    const reportedAt = new Date('2026-01-01T00:00:00.000Z')
    const now = reportedAt.getTime() + 48 * 60 * 60 * 1000

    assert.isTrue(needsDeliveryReview('awaiting_confirmation', reportedAt, now))
    assert.isTrue(needsDeliveryReview('disputed', reportedAt, reportedAt.getTime()))
    assert.isFalse(needsDeliveryReview('awaiting_confirmation', reportedAt, now - 1))
    assert.isFalse(needsDeliveryReview('confirmed', reportedAt, now))
  })
})
