import 'ts-node-maintained/register/esm'
import 'reflect-metadata'
import assert from 'node:assert/strict'
import { Ignitor } from '@adonisjs/core'
const root = new URL('../', import.meta.url)
const app = new Ignitor(root, {
  importer: (path) => import(path.startsWith('.') ? new URL(path, root).href : path),
}).createApp('console')
app.booting(() => import('#start/env'))
await app.init()
await app.boot()
const { default: db } = await import('@adonisjs/lucid/services/db')
const { default: User } = await import('#models/user')
const { default: Order } = await import('#models/order')
const { default: Payment } = await import('#models/payment')
const { default: Controller } = await import('#controllers/order_controller')
const { default: OrderService } = await import('#services/order_service')
const { default: Detail } = await import('#models/details_order')
const { default: Service } = await import('#services/delivery_service')
const { default: Cloud } = await import('#services/cloudinary_service')
const { aggregateDeliveryStatus, needsDeliveryReview } = await import('#services/delivery_rules')
const service = new Service()
let cleanupOriginal = Cloud.prototype.delete
Cloud.prototype.delete = async () => true
await db.beginGlobalTransaction()
try {
  assert.equal(
    aggregateDeliveryStatus(['confirmed', 'awaiting_confirmation']),
    'pendiente_confirmacion'
  )
  assert.equal(aggregateDeliveryStatus(['confirmed', 'in_transit']), 'en_transito')
  assert.equal(aggregateDeliveryStatus(['confirmed', 'confirmed']), 'entregado')
  assert.equal(
    needsDeliveryReview('awaiting_confirmation', new Date(Date.now() - 49 * 3600000)),
    true
  )
  const driver = await User.query()
    .whereHas('role', (q) => q.where('name', 'driver'))
    .whereHas('driver', (q) =>
      q.whereNull('deletedAt').whereHas('trucks', (t) => t.whereNull('deletedAt'))
    )
    .firstOrFail()
  await driver.load('driver')
  const client = await User.query()
    .whereHas('role', (q) => q.where('name', 'client'))
    .whereHas('client', (q) => q.whereNull('deletedAt'))
    .firstOrFail()
  await client.load('client')
  const admin = await User.query()
    .whereHas('role', (q) => q.where('name', 'platform_admin'))
    .firstOrFail()
  await db
    .from('details_orders')
    .where('id_driver', driver.driver.idDriver)
    .where('delivery_status', 'in_transit')
    .update({ delivery_status: 'pending' })
  const order = await Order.create({
    idClient: client.client.idClient,
    idCompany: driver.driver.idCompany,
    status: 'aceptado',
  })
  const loads = []
  for (let i = 0; i < 2; i++)
    loads.push(
      await Detail.create({
        idOrder: order.idOrder,
        idDriver: driver.driver.idDriver,
        cargoDescription: 'Delivery regression fixture',
        amount: 10,
        quantity: 1,
        unitWeight: '1 kg',
        deliveryAddress: 'Test address',
        typePackaging: 'caja',
        deliveryStatus: 'pending',
      })
    )
  await Payment.create({
    idOrder: order.idOrder,
    idClient: order.idClient,
    idCompany: order.idCompany,
    amount: 20,
    status: 'pagado',
    method: 'transfer',
    billingEmail: 'test@example.invalid',
    referenceCode: 'delivery-test-' + order.idOrder,
  })
  const truck = await db
    .from('trucks')
    .where('id_driver', driver.driver.idDriver)
    .whereNull('deleted_at')
    .firstOrFail()
  await db.from('drivers').where('idDriver', driver.driver.idDriver).update({ status: 'available' })
  await db.from('trucks').where('id_truck', truck.id_truck).update({ status: 'mantenimiento' })
  await assert.rejects(() => service.start(driver, order.idOrder))
  await db.from('trucks').where('id_truck', truck.id_truck).update({ status: 'active' })
  await db.from('details_orders').where('id_order',order.idOrder).update({id_driver:null})
  await new OrderService().assignDriver(order.idOrder,driver.driver.idDriver)
  const assigned=await db.from('details_orders').where('id_order',order.idOrder)
  assert.ok(assigned.every(d=>d.id_driver===driver.driver.idDriver))
  await service.start(driver, order.idOrder)
  await assert.rejects(() => service.start(driver, order.idOrder))
  const result = await new Controller(new OrderService()).update({
    auth: { user: driver },
    params: { id: order.idOrder },
    request: { validateUsing: async () => ({ status: 'entregado' }) },
    response: { forbidden: () => 403 },
  })
  assert.equal(result, 403)

  await service.report(driver, order.idOrder, loads[0].idDetails, 'Test report')
  assert.equal(
    (await db.from('drivers').where('idDriver', driver.driver.idDriver).first()).status,
    'ontrip'
  )
  await assert.rejects(() => service.report(driver, order.idOrder, loads[0].idDetails, 'Duplicate'))
  let rows = await service.list(client, order.idOrder)
  const first = rows.find((r) => r.idDetails === loads[0].idDetails).reports[0]
  await service.respond(client, order.idOrder, first.id, true, '')
  assert.equal((await Order.findOrFail(order.idOrder)).status, 'en_transito')
  await assert.rejects(() => service.respond(client, order.idOrder, first.id, true, ''))
  await service.report(driver, order.idOrder, loads[1].idDetails, 'Test second')
  assert.equal(
    (await db.from('drivers').where('idDriver', driver.driver.idDriver).first()).status,
    'available'
  )
  rows = await service.list(client, order.idOrder)
  const second = rows.find((r) => r.idDetails === loads[1].idDetails).reports[0]
  await db
    .from('delivery_reports')
    .where('id', second.id)
    .update({ photo_url: 'https://example.invalid/test.jpg', photo_public_id: 'test-only' })
  await service.respond(client, order.idOrder, second.id, false, 'No he recibido esta carga.')
  assert.equal((await Order.findOrFail(order.idOrder)).status, 'entrega_disputada')
  assert.ok((await service.review()).some(r=>r.id===second.id))
  assert.equal(
    (await db.from('delivery_reports').where('id', second.id).first()).photo_public_id,
    'test-only'
  )
  Cloud.prototype.delete = async () => false
  await service.respond(
    admin,
    order.idOrder,
    second.id,
    false,
    'Reprogramar la entrega pendiente.',
    true
  )
  let report = await db.from('delivery_reports').where('id', second.id).first()
  assert.equal(report.photo_url, null)
  assert.equal(report.cleanup_pending, true)
  assert.equal((await Detail.findOrFail(loads[1].idDetails)).idDriver, null)
  Cloud.prototype.delete = async () => true
  await db
    .from('delivery_reports')
    .where('id', second.id)
    .update({ cleanup_after: new Date(0) })
  await service.cleanup()
  report = await db.from('delivery_reports').where('id', second.id).first()
  assert.equal(report.photo_public_id, null)
  assert.equal(report.cleanup_pending, false)
  // Simulate the next dispatched trip; a fresh report must not reuse the old evidence.
  await db
    .from('details_orders')
    .where('idDetails', loads[1].idDetails)
    .update({ id_driver: driver.driver.idDriver, delivery_status: 'in_transit' })
  await service.report(driver, order.idOrder, loads[1].idDetails, 'Segundo intento')
  rows = await service.list(client, order.idOrder)
  const retry = rows.find((r) => r.idDetails === loads[1].idDetails)
  assert.equal(retry.reports.length, 2)
  await service.respond(client, order.idOrder, retry.reports[0].id, true, '')
  assert.equal((await Order.findOrFail(order.idOrder)).status, 'entregado')
  const unrelated = await User.query()
    .whereHas('role', (q) => q.where('name', 'client'))
    .whereHas('client', (q) => q.whereNot('idClient', client.client.idClient))
    .first()
  if (unrelated) await assert.rejects(() => service.list(unrelated, order.idOrder))
  console.log(
    'PASS: partial deliveries, duplicates, disputes, retries, cleanup failure/recovery, ownership and historical-compatible aggregation'
  )
} finally {
  Cloud.prototype.delete = cleanupOriginal
  await db.rollbackGlobalTransaction()
  await app.terminate()
}
