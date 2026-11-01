import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type User from '#models/user'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import CloudinaryService from '#services/cloudinary_service'
import { orderAccess } from '#services/order_access'
import { aggregateDeliveryStatus, needsDeliveryReview } from '#services/delivery_rules'

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text && !['null', 'undefined'].includes(text.toLowerCase()) ? text : null
}

export default class DeliveryService {
  async start(user: User, orderId: number) {
    await orderAccess(user, orderId)
    await user.load('driver')
    await db.transaction(async (trx) => {
      const order = await trx.from('orders').where('idOrder', orderId).forUpdate().firstOrFail()
      const driver = await trx
        .from('drivers')
        .where('idDriver', user.driver!.idDriver)
        .forUpdate()
        .firstOrFail()
      const payment = await trx
        .from('payments')
        .where('id_order', orderId)
        .where('status', 'pagado')
        .whereNull('deletedAt')
        .first()
      const truck = await trx
        .from('trucks')
        .where('id_driver', driver.idDriver)
        .whereNull('deleted_at')
        .first()
      const active = await trx
        .from('details_orders')
        .where('id_driver', driver.idDriver)
        .where('delivery_status', 'in_transit')
        .whereNull('deletedAt')
        .first()
      const loads = await trx
        .from('details_orders')
        .where('id_order', orderId)
        .where('delivery_status', 'pending')
        .whereNull('deletedAt')
      if (
        order.status !== 'aceptado' ||
        !payment ||
        active ||
        driver.status !== 'available' ||
        !truck ||
        !['active', 'activo'].includes(truck.status) ||
        !loads.length ||
        loads.some((d) => d.id_driver !== driver.idDriver)
      )
        throw new Error(
          'El viaje requiere pago, todas las cargas asignadas a ti y un conductor y camión disponibles.'
        )
      await trx
        .from('details_orders')
        .whereIn(
          'idDetails',
          loads.map((d) => d.idDetails)
        )
        .update({ delivery_status: 'in_transit' })
      await trx.from('drivers').where('idDriver', driver.idDriver).update({ status: 'ontrip' })
      await trx.from('order_trackings').where('order_id', orderId).delete()
      await this.sync(trx, orderId)
    })
  }
  async list(user: User, orderId: number) {
    await orderAccess(user, orderId)
    const details = await db
      .from('details_orders')
      .where('id_order', orderId)
      .whereNull('deletedAt')
    const reports = await db
      .from('delivery_reports')
      .whereIn(
        'detail_id',
        details.map((d) => d.idDetails)
      )
      .orderBy('id', 'desc')
    return details.map((d) => ({
      idDetails: d.idDetails,
      cargoDescription: d.cargoDescription,
      deliveryStatus: d.delivery_status,
      idDriver: d.id_driver,
      reports: reports
        .filter((r) => r.detail_id === d.idDetails)
        .map((r) => ({
          ...r,
          note: optionalText(r.note),
          response_reason: optionalText(r.response_reason),
          resolution_reason: optionalText(r.resolution_reason),
          photo_public_id: undefined,
          photo_url: ['confirmed', 'rescheduled'].includes(r.status) ? null : r.photo_url,
          needsReview: needsDeliveryReview(r.status, r.reported_at),
        })),
    }))
  }

  async report(
    user: User,
    orderId: number,
    detailId: number,
    note: string,
    photo?: MultipartFile | null
  ) {
    await orderAccess(user, orderId)
    await user.load('driver')
    const media = new CloudinaryService()
    let uploaded: { secureUrl: string; publicId: string } | undefined
    if (photo) uploaded = await media.upload(photo, 'travelDLS/deliveries')
    try {
      await db.transaction(async (trx) => {
        await trx.from('orders').where('idOrder', orderId).forUpdate().firstOrFail()
        const d = await trx
          .from('details_orders')
          .where('idDetails', detailId)
          .where('id_order', orderId)
          .whereNull('deletedAt')
          .forUpdate()
          .firstOrFail()
        if (d.id_driver !== user.driver?.idDriver || d.delivery_status !== 'in_transit')
          throw new Error('Solo puedes reportar una carga tuya que esté en tránsito.')
        await trx.table('delivery_reports').insert({
          detail_id: detailId,
          driver_id: d.id_driver,
          note: note || null,
          photo_url: uploaded?.secureUrl,
          photo_public_id: uploaded?.publicId,
        })
        await trx
          .from('details_orders')
          .where('idDetails', detailId)
          .update({ delivery_status: 'awaiting_confirmation' })
        await this.sync(trx, orderId)
        const driver = await trx
          .from('drivers')
          .where('idDriver', d.id_driver)
          .forUpdate()
          .firstOrFail()
        const remaining = await trx
          .from('details_orders')
          .where('id_driver', d.id_driver)
          .where('delivery_status', 'in_transit')
          .whereNull('deletedAt')
          .first()
        if (!remaining && driver.status === 'ontrip')
          await trx.from('drivers').where('idDriver', d.id_driver).update({ status: 'available' })
      })
    } catch (error) {
      if (uploaded)
        await db.table('delivery_media_cleanup').insert({ public_id: uploaded.publicId })
      throw error
    }
  }

  async respond(
    user: User,
    orderId: number,
    reportId: number,
    confirmed: boolean,
    reason: string,
    admin = false
  ) {
    await orderAccess(user, orderId)
    await db.transaction(async (trx) => {
      await trx.from('orders').where('idOrder', orderId).forUpdate().firstOrFail()
      const r = await trx.from('delivery_reports').where('id', reportId).forUpdate().firstOrFail()
      const d = await trx
        .from('details_orders')
        .where('idDetails', r.detail_id)
        .where('id_order', orderId)
        .whereNull('deletedAt')
        .firstOrFail()
      if (
        admin ? !needsDeliveryReview(r.status, r.reported_at) : r.status !== 'awaiting_confirmation'
      )
        throw new Error('Este reporte ya fue respondido o no requiere revisión.')
      const status = confirmed ? 'confirmed' : admin ? 'rescheduled' : 'disputed'
      const now = new Date()
      await trx
        .from('delivery_reports')
        .where('id', reportId)
        .update({
          status,
          ...(admin
            ? { resolved_by: user.idUser, resolved_at: now, resolution_reason: reason }
            : { responded_by: user.idUser, responded_at: now, response_reason: reason || null }),
          ...(['confirmed', 'rescheduled'].includes(status)
            ? { photo_url: null, cleanup_pending: Boolean(r.photo_public_id), cleanup_after: now }
            : {}),
        })
      await trx
        .from('details_orders')
        .where('idDetails', d.idDetails)
        .update({
          delivery_status: status,
          ...(status === 'rescheduled' ? { id_driver: null } : {}),
        })
      await this.sync(trx, orderId)
    })
    // The durable cleanup marker was committed together with the confirmation.
    try {
      await this.cleanup()
    } catch (error) {
      logger.warn({ err: error }, 'Delivery confirmed; cleanup will retry')
    }
  }

  async sync(trx: any, orderId: number) {
    const details = await trx
      .from('details_orders')
      .where('id_order', orderId)
      .whereNull('deletedAt')
    await trx
      .from('orders')
      .where('idOrder', orderId)
      .update({
        status: aggregateDeliveryStatus(details.map((d: any) => d.delivery_status)),
        updatedAt: new Date(),
      })
  }

  async review() {
    const rows = await db
      .from('delivery_reports as r')
      .join('details_orders as d', 'd.idDetails', 'r.detail_id')
      .join('orders as o', 'o.idOrder', 'd.id_order')
      .whereNull('d.deletedAt')
      .whereNull('o.deletedAt')
      .where((q) =>
        q
          .where('r.status', 'disputed')
          .orWhere((sub) =>
            sub
              .where('r.status', 'awaiting_confirmation')
              .where('r.reported_at', '<=', new Date(Date.now() - 48 * 3600000))
          )
      )
      .select('r.*', 'd.cargoDescription', 'd.id_order')
      .orderBy('r.reported_at', 'asc')

    return rows.map(({ photo_public_id, ...r }) => r)
  }

  async cleanup() {
    const media = new CloudinaryService()
    const rows = await db
      .from('delivery_reports')
      .where('cleanup_pending', true)
      .where('cleanup_after', '<=', new Date())
      .limit(50)
    for (const row of rows) {
      const deleted = await media.delete(row.photo_public_id)
      await db
        .from('delivery_reports')
        .where('id', row.id)
        .update(
          deleted
            ? { photo_public_id: null, cleanup_pending: false }
            : {
                cleanup_attempts: row.cleanup_attempts + 1,
                cleanup_after: new Date(Date.now() + 3600000),
              }
        )
    }
    const orphans = await db
      .from('delivery_media_cleanup')
      .where('retry_at', '<=', new Date())
      .limit(50)
    for (const row of orphans) {
      if (await media.delete(row.public_id))
        await db.from('delivery_media_cleanup').where('id', row.id).delete()
      else
        await db
          .from('delivery_media_cleanup')
          .where('id', row.id)
          .update({ attempts: row.attempts + 1, retry_at: new Date(Date.now() + 3600000) })
    }
  }
}
