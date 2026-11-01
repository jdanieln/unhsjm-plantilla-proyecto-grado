import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import Order from '#models/order'
import Payment from '#models/payment'
import Client from '#models/client'
import Company from '#models/company'
import User from '#models/user'
import { OrderStatus } from '#enums/order_status'
import { PaymentMethod } from '#enums/payment_method'
import { PaymentStatus } from '#enums/payment_status'

type SimulatePaymentPayload = {
  method: PaymentMethod
  billingEmail: string
  cardHolderName?: string
  cardNumber?: string
  expiry?: string
  cvc?: string
  transferReference?: string
}

type PaymentFilters = {
  page?: number
  perPage?: number
  idClient?: number
  idCompany?: number
  status?: PaymentStatus
  summaryStatus?: PaymentStatus
  method?: PaymentMethod
  search?: string
}

type PaymentAccessScope = {
  role?: string
  idClient?: number
  idCompany?: number
}

@inject()
export default class PaymentService {
  async simulateOrderPayment(
    idOrder: number,
    payload: SimulatePaymentPayload,
    user: User
  ): Promise<Order> {
    try {
      const client = await this.getClientForUser(user)
      const order = await Order.query()
        .whereNull('deletedAt')
        .where('idOrder', idOrder)
        .where('idClient', client.idClient)
        .preload('details')
        // @ts-ignore
        .preload('payment')
        .firstOrFail()

      if (order.status !== OrderStatus.WAITING_APPROVAL && order.status !== OrderStatus.ACCEPTED) {
        throw new Error(
          'Solo se pueden pagar pedidos cotizados pendientes de aprobación o aceptados sin pago.'
        )
      }

      if (order.payment?.status === PaymentStatus.PAID) {
        throw new Error('Este pedido ya tiene un pago registrado.')
      }

      const amount = this.getOrderAmount(order)
      if (amount <= 0) {
        throw new Error('El pedido no tiene un monto valido para pagar.')
      }

      this.validatePaymentPayload(payload)

      const cardSummary =
        payload.method === PaymentMethod.CARD ? this.getCardSummary(payload.cardNumber!) : null

      await Payment.create({
        idOrder: order.idOrder,
        idClient: order.idClient,
        idCompany: order.idCompany,
        amount,
        status: PaymentStatus.PAID,
        method: payload.method,
        billingEmail: payload.billingEmail,
        cardHolderName: payload.method === PaymentMethod.CARD ? payload.cardHolderName! : null,
        cardBrand: cardSummary?.brand ?? null,
        last4: cardSummary?.last4 ?? null,
        transferReference:
          payload.method === PaymentMethod.TRANSFER ? payload.transferReference! : null,
        referenceCode: this.generateReferenceCode(),
        paidAt: DateTime.now(),
      })

      order.status = OrderStatus.ACCEPTED as string
      await order.save()

      logger.info({ idOrder: order.idOrder }, 'Simulated payment processed successfully')

      return await this.findOrderWithPayment(order.idOrder)
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Order not found.')
      }
      logger.error({ err: error }, 'Failed to simulate order payment')
      throw error
    }
  }

  async list(filters: PaymentFilters, user: User) {
    try {
      const page = filters.page || 1
      const perPage = filters.perPage || 10
      const scope = await this.getPaymentAccessScope(user)
      const query = Payment.query()
        .whereNull('deletedAt')
        // @ts-ignore
        .preload('order')
        // @ts-ignore
        .preload('client', (clientQuery) => clientQuery.preload('user'))
        .preload('company')

      this.applyPaymentFilters(query, filters, scope)

      const summaryQuery = Payment.query().whereNull('deletedAt')
      this.applyPaymentFilters(
        summaryQuery,
        { ...filters, status: filters.summaryStatus ?? filters.status },
        scope
      )
      const summaryRow = await summaryQuery.sum('amount as totalAmount').first()
      const totalAmount = Number(
        summaryRow?.$extras?.totalAmount ??
          summaryRow?.$extras?.total_amount ??
          summaryRow?.$extras?.totalamount ??
          0
      )

      const paginator = await query.orderBy('idPayment', 'desc').paginate(page, perPage)
      return {
        ...paginator.serialize(),
        summary: { totalAmount },
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list payments')
      throw new Error('Failed to retrieve payments.')
    }
  }

  async findByOrder(idOrder: number, user: User): Promise<Payment> {
    try {
      const query = Payment.query()
        .whereNull('deletedAt')
        .where('idOrder', idOrder)
        // @ts-ignore
        .preload('order')
        // @ts-ignore
        .preload('client', (clientQuery) => clientQuery.preload('user'))
        .preload('company')

      await user.load('role')
      const role = user.role?.name?.toLowerCase()
      if (role === 'company') {
        const company = await this.getCompanyForUser(user)
        query.where('idCompany', company.idCompany)
      } else if (role === 'client') {
        const client = await this.getClientForUser(user)
        query.where('idClient', client.idClient)
      }

      return await query.firstOrFail()
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Payment not found.')
      }
      logger.error({ err: error }, 'Failed to find order payment')
      throw error
    }
  }

  async cancel(idPayment: number, reason: string, user: User): Promise<Payment> {
    try {
      const client = await this.getClientForUser(user)
      const payment = await Payment.query()
        .whereNull('deletedAt')
        .where('idPayment', idPayment)
        .where('idClient', client.idClient)
        // @ts-ignore
        .preload('order')
        // @ts-ignore
        .preload('client', (clientQuery) => clientQuery.preload('user'))
        .preload('company')
        .firstOrFail()

      if (payment.status === PaymentStatus.CANCELLED) {
        throw new Error('Este pago ya se encuentra cancelado.')
      }

      const orderStatus = payment.order?.status
      if ([OrderStatus.DELIVERED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERY_PENDING, OrderStatus.DELIVERY_DISPUTED, OrderStatus.REDELIVERY].includes(orderStatus as OrderStatus)) {
        throw new Error('No se puede cancelar un pago de un pedido en proceso de entrega o ya entregado.')
      }

      if (orderStatus === OrderStatus.ACCEPTED && payment.status === PaymentStatus.PAID) {
        throw new Error('No se puede cancelar el pago de un pedido aceptado y pagado.')
      }

      payment.status = PaymentStatus.CANCELLED
      payment.cancellationReason = reason

      if (payment.order?.status === OrderStatus.ACCEPTED) {
        payment.order.status = OrderStatus.ANNULLED as string
        await payment.order.save()
      }

      await payment.save()

      logger.info({ idPayment: payment.idPayment }, 'Payment cancelled successfully')

      return payment
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Payment not found.')
      }
      logger.error({ err: error }, 'Failed to cancel payment')
      throw error
    }
  }

  private async getPaymentAccessScope(user: User): Promise<PaymentAccessScope> {
    await user.load('role')
    const role = user.role?.name?.toLowerCase()

    if (role === 'company') {
      const company = await this.getCompanyForUser(user)
      return { role, idCompany: company.idCompany }
    }

    if (role === 'client') {
      const client = await this.getClientForUser(user)
      return { role, idClient: client.idClient }
    }

    return { role }
  }

  private applyPaymentFilters(
    query: any,
    filters: PaymentFilters,
    scope: PaymentAccessScope
  ): void {
    if (scope.role === 'company' && scope.idCompany) {
      query.where('idCompany', scope.idCompany)
    } else if (scope.role === 'client' && scope.idClient) {
      query.where('idClient', scope.idClient)
    }

    if (filters.idClient) query.where('idClient', filters.idClient)
    if (filters.idCompany && scope.role !== 'company') query.where('idCompany', filters.idCompany)
    if (filters.status) query.where('status', filters.status)
    if (filters.method) query.where('method', filters.method)
    if (filters.search) {
      query.where((builder: any) => {
        builder
          .where('referenceCode', 'like', `%${filters.search}%`)
          .orWhere('transferReference', 'like', `%${filters.search}%`)
      })
    }
  }
  private async findOrderWithPayment(idOrder: number): Promise<Order> {
    return await Order.query()
      .whereNull('deletedAt')
      .where('idOrder', idOrder)
      .preload('client', (clientQuery: any) => clientQuery.preload('user'))
      .preload('company')
      .preload('details', (detailsQuery: any) => {
        detailsQuery.preload('driver', (dq: any) => dq.preload('user'))
      })
      // @ts-ignore
      .preload('payment')
      .firstOrFail()
  }

  private async getClientForUser(user: User): Promise<Client> {
    return await Client.query().where('user_id', user.idUser).firstOrFail()
  }

  private async getCompanyForUser(user: User): Promise<Company> {
    return await Company.query().where('idUser', user.idUser).firstOrFail()
  }

  private getOrderAmount(order: Order): number {
    return order.details.reduce((sum, detail) => sum + Number(detail.amount || 0), 0)
  }

  private validatePaymentPayload(payload: SimulatePaymentPayload): void {
    if (payload.method === PaymentMethod.CARD) {
      const digits = this.onlyDigits(payload.cardNumber || '')
      if (!payload.cardHolderName || digits.length < 12 || !payload.expiry || !payload.cvc) {
        throw new Error('Los datos de la tarjeta son requeridos.')
      }
      return
    }

    if (payload.method === PaymentMethod.TRANSFER && !payload.transferReference) {
      throw new Error('La referencia de transferencia es requerida.')
    }
  }

  private getCardSummary(cardNumber: string): { brand: string; last4: string } {
    const digits = this.onlyDigits(cardNumber)
    return {
      brand: this.detectCardBrand(digits),
      last4: digits.slice(-4),
    }
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '')
  }

  private detectCardBrand(digits: string): string {
    if (digits.startsWith('4')) return 'Visa'
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard'
    if (/^3[47]/.test(digits)) return 'American Express'
    if (digits.startsWith('6')) return 'Discover'
    return 'Tarjeta'
  }

  private generateReferenceCode(): string {
    const timestamp = DateTime.now().toFormat('yyyyLLddHHmmss')
    const random = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `PAY-${timestamp}-${random}`
  }
}
