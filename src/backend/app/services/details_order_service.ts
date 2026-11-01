import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import DetailsOrder from '#models/details_order'
import Order from '#models/order'
import Payment from '#models/payment'
import { OrderStatus } from '#enums/order_status'
import { PaymentStatus } from '#enums/payment_status'

@inject()
export default class DetailsOrderService {
  async create(data: {
    idOrder: number
    idDriver?: number | null
    cargoDescription: string
    amount: number
    unitWeight: string
    deliveryAddress: string
    typePackaging: any
  }): Promise<DetailsOrder> {
    try {
      const order = await Order.query()
        .where('idOrder', data.idOrder)
        .whereNull('deletedAt')
        .firstOrFail()
      if (
        order.status !== OrderStatus.PENDING ||
        (data.idDriver !== undefined && data.idDriver !== null)
      ) {
        throw new Error('Solo se pueden añadir cargas sin conductor a pedidos pendientes.')
      }
      const detail = await DetailsOrder.create(data)
      logger.info({ idDetails: detail.idDetails }, 'Order detail created successfully')
      return detail
    } catch (error: any) {
      if (error.message === 'Solo se pueden añadir cargas sin conductor a pedidos pendientes.')
        throw error
      logger.error({ err: error }, 'Failed to create order detail')
      throw new Error('Failed to create order detail.')
    }
  }

  async update(
    id: number,
    data: Partial<{
      idDriver: number | null
      cargoDescription: string
      amount: number
      unitWeight: string
      deliveryAddress: string
      typePackaging: any
    }>
  ): Promise<DetailsOrder> {
    try {
      const detail = await DetailsOrder.query()
        .whereNull('deletedAt')
        .where('idDetails', id)
        .firstOrFail()

      if (data.amount !== undefined) {
        throw new Error(
          'El precio de las cargas solo se cambia mediante una cotización del pedido.'
        )
      }
      if (data.idDriver !== undefined && data.idDriver !== null) {
        const order = await Order.query().where('idOrder', detail.idOrder).firstOrFail()
        const payment = await Payment.query()
          .where('idOrder', detail.idOrder)
          .whereNull('deletedAt')
          .first()
        if (order.status !== OrderStatus.ACCEPTED || payment?.status !== PaymentStatus.PAID) {
          throw new Error(
            'Solo se puede asignar un conductor cuando el pedido está aceptado y pagado.'
          )
        }
      }

      detail.merge(data)
      await detail.save()

      logger.info({ idDetails: detail.idDetails }, 'Order detail updated successfully')
      return detail
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Detail not found.')
      }
      if (
        error.message?.startsWith('El precio de las cargas') ||
        error.message?.startsWith('Solo se puede asignar')
      ) {
        throw error
      }
      logger.error({ err: error }, 'Failed to update order detail')
      throw new Error('Failed to update order detail.')
    }
  }

  async findById(id: number): Promise<DetailsOrder> {
    try {
      return await DetailsOrder.query()
        .whereNull('deletedAt')
        .where('idDetails', id)
        .preload('driver')
        .firstOrFail()
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Detail not found.')
      }
      logger.error({ err: error }, 'Failed to find detail')
      throw new Error('Failed to find detail.')
    }
  }

  async softDelete(id: number): Promise<void> {
    try {
      const detail = await this.findById(id)
      detail.deletedAt = DateTime.now()
      await detail.save()
      logger.info({ idDetails: detail.idDetails }, 'Order detail soft-deleted successfully')
    } catch (error: any) {
      if (error.message === 'Detail not found.') throw error
      logger.error({ err: error }, 'Failed to soft-delete detail')
      throw new Error('Failed to soft-delete detail.')
    }
  }
  async createWithCalculation(data: any): Promise<DetailsOrder> {
    try {
      const order = await Order.query()
        .where('idOrder', data.idOrder)
        .whereNull('deletedAt')
        .firstOrFail()
      if (order.status !== OrderStatus.PENDING || data.idDriver !== undefined) {
        throw new Error('Solo se pueden añadir cargas sin conductor a pedidos pendientes.')
      }
      const rate = data.rate || 0
      const quantity = data.quantity || 1
      const numericWeight = Number.parseFloat(String(data.unitWeight).replace(/[^\d.]/g, '')) || 0

      const totalAmount = rate * quantity * numericWeight

      const { rate: rateToExclude, ...payload } = data

      const detail = await DetailsOrder.create({
        ...payload,
        amount: totalAmount,
      })

      logger.info({ idDetails: detail.idDetails }, 'Order detail created with calculation')
      return detail
    } catch (error: any) {
      if (error.message === 'Solo se pueden añadir cargas sin conductor a pedidos pendientes.')
        throw error
      logger.error({ err: error }, 'Failed to create order detail')
      throw new Error('Failed to create order detail.')
    }
  }
}
