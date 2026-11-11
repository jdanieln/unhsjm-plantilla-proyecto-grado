/* eslint-disable @unicorn/no-await-expression-member */
import { test } from '@japa/runner'
import Rol from '#models/rol'
import User from '#models/user'
import Client from '#models/client'
import Company from '#models/company'
import Order from '#models/order'
import DetailsOrder from '#models/details_order'
import Payment from '#models/payment'

async function actor(roleName: string) {
  const role = await Rol.firstOrCreate({ name: roleName })
  const suffix = Math.random().toString(36).slice(2)
  const user = await User.create({
    name: `Actor ${suffix}`,
    email: `${suffix}@example.test`,
    password: 'password123',
    roleId: role.id,
  })
  const token = (await User.accessTokens.create(user)).value!.release()
  return { user, token }
}

test.group('OrderController / OrderService', () => {
  test('client creates and deletes its own pending order; another client cannot read it', async ({
    client,
    assert,
  }) => {
    const owner = await actor('client')
    const other = await actor('client')
    const profile = await Client.create({
      userId: owner.user.idUser,
      companyName: 'Dueño',
      ruc: `O${Date.now()}`,
      address: 'Managua',
      typeClient: 'legal',
    })
    const company = await Company.create({ businessName: 'Transportista', ruc: `T${Date.now()}` })

    const create = await client
      .post('/api/orders')
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ idClient: profile.idClient, idCompany: company.idCompany })
    create.assertStatus(201)
    const id = create.body().idOrder
    assert.isNumber(id)

    const show = await client
      .get(`/api/orders/${id}`)
      .header('Authorization', `Bearer ${owner.token}`)
    show.assertStatus(200)
    const otherShow = await client
      .get(`/api/orders/${id}`)
      .header('Authorization', `Bearer ${other.token}`)
    otherShow.assertStatus(404)

    const detailResponse = await client
      .post('/api/order-details')
      .header('Authorization', `Bearer ${owner.token}`)
      .json({
        idOrder: id,
        cargoDescription: 'Carga de alimentos',
        amount: 0,
        unitWeight: '10 kg',
        deliveryAddress: 'Managua centro',
        typePackaging: 'caja',
        rate: 5,
        quantity: 2,
      })
    detailResponse.assertStatus(201)
    const detailId = detailResponse.body().idDetails
    assert.equal(Number(detailResponse.body().amount), 100)

    const changePrice = await client
      .put(`/api/order-details/${detailId}`)
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ amount: 200 })
    changePrice.assertStatus(422)
    const updateDetail = await client
      .put(`/api/order-details/${detailId}`)
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ cargoDescription: 'Carga refrigerada' })
    updateDetail.assertStatus(200)

    const noTracking = await client
      .get(`/api/orders/${id}/tracking`)
      .header('Authorization', `Bearer ${owner.token}`)
    noTracking.assertStatus(404)
    const otherTracking = await client
      .get(`/api/orders/${id}/tracking`)
      .header('Authorization', `Bearer ${other.token}`)
    otherTracking.assertStatus(403)

    const deleteDetail = await client
      .delete(`/api/order-details/${detailId}`)
      .header('Authorization', `Bearer ${owner.token}`)
    deleteDetail.assertStatus(200)
    assert.exists((await DetailsOrder.find(detailId))?.deletedAt)

    const remove = await client
      .delete(`/api/orders/${id}`)
      .header('Authorization', `Bearer ${owner.token}`)
    remove.assertStatus(200)
    assert.exists((await Order.find(id))?.deletedAt)
  })

  test('rejects an order owned by another client', async ({ client }) => {
    const requester = await actor('client')
    const owner = await actor('client')
    const profile = await Client.create({
      userId: owner.user.idUser,
      companyName: 'Otro cliente',
      ruc: `P${Date.now()}`,
      address: 'Managua',
      typeClient: 'natural',
    })
    const company = await Company.create({ businessName: 'Empresa', ruc: `E${Date.now()}` })
    const response = await client
      .post('/api/orders')
      .header('Authorization', `Bearer ${requester.token}`)
      .json({ idClient: profile.idClient, idCompany: company.idCompany })
    response.assertStatus(403)
  })
})

test.group('PaymentController / DeliveryController validation', () => {
  test('simulates a transfer once and prevents a second payment', async ({ client, assert }) => {
    const owner = await actor('client')
    const profile = await Client.create({
      userId: owner.user.idUser,
      companyName: 'Pagador',
      ruc: `PAY${Date.now()}`,
      address: 'Managua',
      typeClient: 'legal',
    })
    const company = await Company.create({
      businessName: 'Transportista pago',
      ruc: `TP${Date.now()}`,
    })
    const order = await Order.create({
      idClient: profile.idClient,
      idCompany: company.idCompany,
      status: 'esperando_aprobacion',
    })
    await DetailsOrder.create({
      idOrder: order.idOrder,
      cargoDescription: 'Carga pagada',
      amount: 250,
      unitWeight: '5 kg',
      deliveryAddress: 'Managua',
      typePackaging: 'caja',
    })

    const payload = {
      method: 'transfer',
      billingEmail: 'pagador@example.test',
      transferReference: 'TRX-12345',
    }
    const payment = await client
      .post(`/api/orders/${order.idOrder}/payments/simulate`)
      .header('Authorization', `Bearer ${owner.token}`)
      .json(payload)
    payment.assertStatus(200)
    const saved = await Payment.findByOrFail('idOrder', order.idOrder)
    assert.equal(saved.status, 'pagado')
    assert.equal(Number(saved.amount), 250)

    const duplicate = await client
      .post(`/api/orders/${order.idOrder}/payments/simulate`)
      .header('Authorization', `Bearer ${owner.token}`)
      .json(payload)
    duplicate.assertStatus(422)
    const show = await client
      .get(`/api/orders/${order.idOrder}/payment`)
      .header('Authorization', `Bearer ${owner.token}`)
    show.assertStatus(200)
  })

  test('rejects malformed payment and delivery decisions', async ({ client }) => {
    const { token } = await actor('client')
    const payment = await client
      .post('/api/orders/999999/payments/simulate')
      .header('Authorization', `Bearer ${token}`)
      .json({ method: 'card', billingEmail: 'invalid' })
    payment.assertStatus(422)
    const cancellation = await client
      .patch('/api/payments/999999/cancel')
      .header('Authorization', `Bearer ${token}`)
      .json({ reason: 'no' })
    cancellation.assertStatus(422)
    const decision = await client
      .post('/api/orders/999999/deliveries/999999/respond')
      .header('Authorization', `Bearer ${token}`)
      .json({ confirmed: false, reason: 'no' })
    decision.assertStatus(422)
  })

  test('rejects oversized delivery notes and invalid driver maintenance reports', async ({
    client,
  }) => {
    const { token } = await actor('driver')
    const report = await client
      .post('/api/orders/999999/deliveries/999999/report')
      .header('Authorization', `Bearer ${token}`)
      .json({ note: 'x'.repeat(501) })
    report.assertStatus(422)
    const maintenance = await client
      .patch('/api/driver/truck/status')
      .header('Authorization', `Bearer ${token}`)
      .json({ status: 'activo', reason: 'Revisión necesaria de frenos' })
    maintenance.assertStatus(422)
  })
})
