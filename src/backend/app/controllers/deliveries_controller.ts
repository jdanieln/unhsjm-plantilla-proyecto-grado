import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import DeliveryService from '#services/delivery_service'

export default class DeliveriesController {
  private service = new DeliveryService()
  async index({ auth, params, response }: HttpContext) {
    try {
      return response.ok(await this.service.list(auth.user!, Number(params.id)))
    } catch (e: any) {
      return response.status(e.status || 422).send({ message: e.message })
    }
  }
  async pending({ auth, response }: HttpContext) {
    await auth.user!.load('client')
    if (!auth.user!.client)
      return response.forbidden({ message: 'No tienes un perfil de cliente.' })
    const rows = await db
      .from('delivery_reports as r')
      .join('details_orders as d', 'd.idDetails', 'r.detail_id')
      .join('orders as o', 'o.idOrder', 'd.id_order')
      .where('o.id_client', auth.user!.client.idClient)
      .whereNull('o.deletedAt')
      .whereNull('d.deletedAt')
      .where('r.status', 'awaiting_confirmation')
      .select('r.id', 'd.id_order', 'd.cargoDescription')
      .orderBy('r.reported_at', 'asc')
    return response.ok(rows)
  }
  async review({ response }: HttpContext) {
    return response.ok(await this.service.review())
  }
  async report({ auth, params, request, response }: HttpContext) {
    const rawNote = request.input('note')
    const note = typeof rawNote === 'string' ? rawNote.trim() : ''
    if (note.length > 500)
      return response.unprocessableEntity({ message: 'La nota admite hasta 500 caracteres.' })
    try {
      await this.service.report(
        auth.user!,
        Number(params.id),
        Number(params.detailId),
        note,
        request.file('photo')
      )
      return response.created({ message: 'Entrega reportada. Esperando confirmación del cliente.' })
    } catch (e: any) {
      return response.status(e.status || 422).send({ message: e.message })
    }
  }
  async respond(ctx: HttpContext) {
    return this.answer(ctx, false)
  }
  async resolve(ctx: HttpContext) {
    return this.answer(ctx, true)
  }
  private async answer({ auth, params, request, response }: HttpContext, admin: boolean) {
    const confirmed = request.input('confirmed')
    const rawReason = request.input('reason')
    const reason = typeof rawReason === 'string' ? rawReason.trim() : ''
    if (
      typeof confirmed !== 'boolean' ||
      reason.length > 500 ||
      ((admin || !confirmed) && reason.length < 10)
    ) {
      return response.unprocessableEntity({
        message: 'Indica una decisión y un motivo de 10 a 500 caracteres cuando corresponda.',
      })
    }
    try {
      await this.service.respond(
        auth.user!,
        Number(params.id),
        Number(params.reportId),
        confirmed,
        reason,
        admin
      )
      return response.ok({ message: 'Respuesta registrada.' })
    } catch (e: any) {
      return response.status(e.status || 422).send({ message: e.message })
    }
  }
}
