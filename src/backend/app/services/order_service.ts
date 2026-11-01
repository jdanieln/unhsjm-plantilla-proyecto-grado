import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import { OrderStatus } from '#enums/order_status'
import Driver from '#models/driver'
import { DriverStatus } from '#enums/driver_status'
import { PaymentStatus } from '#enums/payment_status'

@inject()
export default class OrderService {
  async create(data: {
    idClient: number
    idCompany: number
    status?: OrderStatus
  }): Promise<Order> {
    try {
      const order = await Order.create(data)
      logger.info({ idOrder: order.idOrder }, 'Order header created successfully')
      return order
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create order')
      throw new Error('Failed to create order.')
    }
  }

  async update(
    id: number,
    data: Partial<{ idClient: number; idCompany: number; status: OrderStatus }>
  ): Promise<Order> {
    try {
      if (data.status === OrderStatus.DELIVERED)
        throw new Error('La entrega requiere confirmación del cliente.')
      const orderAnterior = await this.findById(id)
      const order = await Order.query().whereNull('deletedAt').where('idOrder', id).firstOrFail()

      if (orderAnterior.status === OrderStatus.ANNULLED && data.status === OrderStatus.IN_TRANSIT) {
        throw new Error('No se puede iniciar una orden anulada.')
      }

      if (
        orderAnterior.payment?.status === PaymentStatus.PAID &&
        (data.status === OrderStatus.ANNULLED || data.status === OrderStatus.CANCELLED)
      ) {
        throw new Error('No se puede anular un pedido que ya fue pagado.')
      }

      order.merge(data)
      await order.save()

      // Driver status sync logic
      if (
        data.status === OrderStatus.IN_TRANSIT &&
        orderAnterior.status !== OrderStatus.IN_TRANSIT
      ) {
        const detail = orderAnterior.details[0]
        if (detail?.idDriver) {
          const driver = await Driver.findOrFail(detail.idDriver)
          driver.status = DriverStatus.ONTRIP as any
          await driver.save()
        }
      } else if (
        data.status === OrderStatus.CANCELLED &&
        orderAnterior.status === OrderStatus.IN_TRANSIT
      ) {
        const detail = orderAnterior.details[0]
        if (detail?.idDriver) {
          const activeTripsCount = await db
            .from('details_orders')
            .innerJoin('orders', 'details_orders.id_order', 'orders.idOrder')
            .where('details_orders.id_driver', detail.idDriver)
            .where('orders.status', OrderStatus.IN_TRANSIT)
            .whereNull('orders.deletedAt')
            .count('* as total')
            .first()

          if (Number(activeTripsCount?.total || 0) === 0) {
            const driver = await Driver.findOrFail(detail.idDriver)
            if (driver.status === (DriverStatus.ONTRIP as any)) {
              driver.status = DriverStatus.AVAILABLE as any
              await driver.save()
            }
          }
        }
      }

      logger.info({ idOrder: order.idOrder }, 'Order updated successfully')
      return order
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND' || error.message === 'Order not found.') {
        throw new Error('Order not found.')
      }
      if (
        error.message === 'No se puede iniciar una orden anulada.' ||
        error.message === 'No se puede anular un pedido que ya fue pagado.'
      ) {
        throw error
      }
      logger.error({ err: error }, 'Failed to update order')
      throw new Error('Failed to update order.')
    }
  }

  async list(
    filters: {
      page?: number
      perPage?: number
      idClient?: number
      idCompany?: number
      idDriver?: number
    } = {}
  ) {
    try {
      const page = filters.page || 1
      const perPage = filters.perPage || 10
      const query = Order.query()
        .whereNull('deletedAt')
        .preload('client', (clientQuery: any) => clientQuery.preload('user'))
        .preload('company')
        .preload('details', (detailsQuery: any) => {
          detailsQuery.whereNull('deletedAt')
          detailsQuery.preload('driver', (dq: any) => {
            dq.preload('user')
          })
        })
        // @ts-ignore
        .preload('payment')

      if (filters.idClient) {
        query.where('idClient', filters.idClient)
      }
      if (filters.idCompany) {
        query.where('idCompany', filters.idCompany)
      }
      if (filters.idDriver) {
        query.whereHas('details', (dq) => {
          dq.where('idDriver', filters.idDriver!)
        })
      }

      return await query.orderBy('idOrder', 'desc').paginate(page, perPage)
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list orders')
      throw new Error('Failed to retrieve orders.')
    }
  }

  async findById(id: number): Promise<Order> {
    try {
      return await Order.query()
        .whereNull('deletedAt')
        .where('idOrder', id)
        .preload('client', (clientQuery: any) => clientQuery.preload('user'))
        .preload('company')
        .preload('details', (detailsQuery: any) => {
          detailsQuery.whereNull('deletedAt')
          detailsQuery.preload('driver', (dq: any) => dq.preload('user'))
        })
        // @ts-ignore
        .preload('payment')
        .firstOrFail()
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Order not found.')
      }
      logger.error({ err: error }, 'Failed to find order')
      throw new Error('Failed to find order.')
    }
  }

  async softDelete(id: number): Promise<void> {
    try {
      const order = await this.findById(id)
      order.deletedAt = DateTime.now()
      await order.save()
      logger.info({ idOrder: order.idOrder }, 'Order soft-deleted successfully')
    } catch (error: any) {
      if (error.message === 'Order not found.') throw error
      logger.error({ err: error }, 'Failed to soft-delete order')
      throw new Error('Failed to soft-delete order.')
    }
  }

  async assignDriver(idOrder: number, idDriver: number): Promise<Order> {
    try {
      const order = await this.findById(idOrder)
      if (
        ![OrderStatus.ACCEPTED, OrderStatus.REDELIVERY].includes(order.status as OrderStatus) ||
        order.payment?.status !== PaymentStatus.PAID
      )
        throw new Error('El pedido debe estar pagado y listo para asignación.')
      await db.transaction(async (trx) => {
        const current = await trx.from('orders').where('idOrder', idOrder).forUpdate().firstOrFail()
        if (!['aceptado', 'requiere_nueva_entrega'].includes(current.status))
          throw new Error('El pedido cambió de estado. Actualiza la vista.')
        const moving = await trx
          .from('details_orders')
          .where('id_order', idOrder)
          .where('delivery_status', 'in_transit')
          .whereNull('deletedAt')
          .first()
        if (moving)
          throw new Error(
            'Espera a que termine el viaje actual antes de programar el nuevo intento.'
          )
        const driver = await Driver.query({ client: trx })
          .where('idDriver', idDriver)
          .where('idCompany', order.idCompany)
          .whereNull('deletedAt')
          .firstOrFail()
        if (driver.status !== 'available') throw new Error('El conductor no está disponible.')
        const activeOrders = await trx.from('details_orders as d').join('orders as o','o.idOrder','d.id_order')
          .where('d.id_driver', idDriver).whereNot('d.id_order',idOrder).whereNull('d.deletedAt').whereNull('o.deletedAt')
          .whereIn('d.delivery_status',['pending','in_transit']).countDistinct('d.id_order as total').first()
        if (Number(activeOrders?.total || 0) >= 5) throw new Error('El conductor ya tiene el máximo de 5 viajes activos permitidos.')

        const truck = await trx
          .from('trucks')
          .where('id_driver', idDriver)
          .whereNull('deleted_at')
          .first()
        if (!truck || !['active', 'activo'].includes(truck.status))
          throw new Error('El conductor necesita un camión activo.')
        await trx
          .from('details_orders')
          .where('id_order', idOrder)
          .whereNull('deletedAt')
          .whereIn('delivery_status', ['pending', 'rescheduled'])
          .update({ id_driver: idDriver, delivery_status: 'pending' })
        await trx.from('orders').where('idOrder', idOrder).update({ status: OrderStatus.ACCEPTED })
      })
      return await this.findById(idOrder)
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Order not found.')
      }
      throw error
    }
  }

  async assignPrice(
    idOrder: number,
    prices: { idDetails: number; amount: number }[]
  ): Promise<Order> {
    try {
      const order = await this.findById(idOrder)
      if (![OrderStatus.PENDING, OrderStatus.DENIED].includes(order.status as OrderStatus)) {
        throw new Error('La cotización está bloqueada hasta que el cliente responda.')
      }
      const ids = order.details.map((detail) => detail.idDetails)
      if (
        !ids.length ||
        prices.length !== ids.length ||
        new Set(prices.map((price) => price.idDetails)).size !== ids.length ||
        prices.some(
          (price) =>
            !ids.includes(price.idDetails) || !Number.isFinite(price.amount) || price.amount <= 0
        )
      ) {
        throw new Error('Indica un precio válido para cada carga del pedido.')
      }
      await db.transaction(async (trx) => {
        for (const price of prices) {
          await trx
            .from('details_orders')
            .where('idDetails', price.idDetails)
            .where('id_order', order.idOrder)
            .whereNull('deletedAt')
            .update({ amount: price.amount })
        }
        await trx
          .from('orders')
          .where('idOrder', order.idOrder)
          .update({ status: OrderStatus.WAITING_APPROVAL })
      })
      logger.info({ idOrder }, 'Order quotation updated successfully')

      return await this.findById(idOrder)
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Order not found.')
      }
      logger.error({ err: error }, 'Failed to assign price to order')
      throw error
    }
  }

  async respondPrice(idOrder: number, accepted: boolean): Promise<Order> {
    try {
      const order = await this.findById(idOrder)
      if (order.status !== OrderStatus.WAITING_APPROVAL) {
        throw new Error('Este pedido no tiene una cotización pendiente.')
      }
      if (accepted) {
        order.status = OrderStatus.ACCEPTED as string
      } else {
        order.status = OrderStatus.DENIED as string
      }
      await order.save()

      logger.info({ idOrder, accepted }, 'Order price responded successfully')

      return await this.findById(idOrder)
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Order not found.')
      }
      logger.error({ err: error }, 'Failed to respond to order price')
      throw error
    }
  }
}
