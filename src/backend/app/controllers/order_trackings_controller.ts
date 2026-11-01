import type { HttpContext } from '@adonisjs/core/http'
import OrderTracking from '#models/order_tracking'
import Order from '#models/order'
import type User from '#models/user'

export default class OrderTrackingsController {
  private async authorizedOrder(orderId: number, user: User) {
    const order = await Order.query()
      .where('idOrder', orderId)
      .whereNull('deletedAt')
      .preload('details', (query) => query.whereNull('deletedAt'))
      .first()

    if (!order) return null

    await user.load('role')
    const role = user.role?.name?.toLowerCase()
    if (role === 'client') {
      await user.load('client')
      return user.client?.idClient === order.idClient ? order : null
    }
    if (role === 'company') {
      await user.load('company')
      return user.company?.idCompany === order.idCompany ? order : null
    }
    if (role === 'driver') {
      await user.load('driver')
      return order.details.some((detail) => detail.idDriver === user.driver?.idDriver)
        ? order
        : null
    }
    return null
  }

  public async store({ auth, request, params, response }: HttpContext) {
    const orderId = Number(params.id)
    if (!Number.isInteger(orderId) || orderId < 1) {
      return response.unprocessableEntity({ message: 'Pedido inválido.' })
    }
    const order = await this.authorizedOrder(orderId, auth.user!)
    if (!order) return response.forbidden({ message: 'No tienes acceso a este pedido.' })
    if (!order.details.some((d) => d.deliveryStatus === 'in_transit')) {
      return response.unprocessableEntity({
        message: 'Solo se puede compartir ubicación durante el viaje.',
      })
    }
    const rawLatitude = request.input('latitude')
    const rawLongitude = request.input('longitude')
    const latitude = Number(rawLatitude)
    const longitude = Number(rawLongitude)
    if (
      rawLatitude === null ||
      rawLatitude === undefined ||
      rawLongitude === null ||
      rawLongitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return response.unprocessableEntity({ message: 'Coordenadas inválidas.' })
    }

    let tracking = await OrderTracking.findBy('orderId', orderId)

    if (tracking) {
      tracking.latitude = latitude
      tracking.longitude = longitude
      await tracking.save()
    } else {
      tracking = await OrderTracking.create({ orderId, latitude, longitude })
    }

    return response.json(tracking)
  }

  public async show({ auth, params, response }: HttpContext) {
    const orderId = Number(params.id)
    if (!Number.isInteger(orderId) || orderId < 1) {
      return response.unprocessableEntity({ message: 'Pedido inválido.' })
    }
    const order = await this.authorizedOrder(orderId, auth.user!)
    if (!order) return response.forbidden({ message: 'No tienes acceso a este pedido.' })
    const tracking = await OrderTracking.findBy('orderId', orderId)

    if (!tracking) {
      return response.notFound({ message: 'Ubicación no encontrada para esta orden' })
    }

    return response.json(tracking)
  }
}
