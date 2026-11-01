import type User from '#models/user'
import Order from '#models/order'

export async function orderAccess(user: User, id: number) {
  const order = await Order.query()
    .where('idOrder', id)
    .whereNull('deletedAt')
    .preload('details', (q) => q.whereNull('deletedAt'))
    .firstOrFail()
  await user.load('role')
  const role = user.role.name.toLowerCase()
  if (role === 'platform_admin') return order
  if (role === 'client') {
    await user.load('client')
    if (user.client?.idClient === order.idClient) return order
  }
  if (role === 'company') {
    await user.load('company')
    if (user.company?.idCompany === order.idCompany) return order
  }
  if (role === 'driver') {
    await user.load('driver')
    if (order.details.some((d) => d.idDriver === user.driver?.idDriver)) return order
  }
  throw Object.assign(new Error('No tienes acceso a este pedido.'), { status: 403 })
}
