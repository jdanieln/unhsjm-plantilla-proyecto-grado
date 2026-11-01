import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('details_orders', (table) => {
      table.string('delivery_status').notNullable().defaultTo('pending')
    })
    this.schema.createTable('delivery_reports', (table) => {
      table.increments('id')
      table.integer('detail_id').notNullable().references('idDetails').inTable('details_orders')
      table.integer('driver_id').notNullable().references('idDriver').inTable('drivers')
      table.string('status').notNullable().defaultTo('awaiting_confirmation')
      table.text('note').nullable()
      table.text('photo_url').nullable()
      table.text('photo_public_id').nullable()
      table.boolean('cleanup_pending').notNullable().defaultTo(false)
      table.integer('cleanup_attempts').notNullable().defaultTo(0)
      table.timestamp('cleanup_after', { useTz: true }).nullable()
      table.timestamp('reported_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.integer('responded_by').nullable()
      table.timestamp('responded_at', { useTz: true }).nullable()
      table.text('response_reason').nullable()
      table.integer('resolved_by').nullable()
      table.timestamp('resolved_at', { useTz: true }).nullable()
      table.text('resolution_reason').nullable()
      table.index(['detail_id', 'id'])
      table.index(['status', 'reported_at'])
    })
    this.schema.createTable('delivery_media_cleanup', (table) => {
      table.increments('id')
      table.text('public_id').notNullable().unique()
      table.integer('attempts').notNullable().defaultTo(0)
      table.timestamp('retry_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
    this.schema.raw(`UPDATE details_orders d SET delivery_status = CASE
      WHEN o.status = 'entregado' THEN 'confirmed'
      WHEN o.status = 'en_transito' THEN 'in_transit' ELSE 'pending' END
      FROM orders o WHERE d.id_order = o."idOrder"`)
    // Legacy assignment only populated the first cargo. Preserve explicit assignments.
    this.schema.raw(`UPDATE details_orders d SET id_driver = source.driver FROM
      (SELECT id_order, MIN(id_driver) AS driver FROM details_orders
       WHERE "deletedAt" IS NULL GROUP BY id_order HAVING COUNT(DISTINCT id_driver) = 1) source
      WHERE d.id_order = source.id_order AND d.id_driver IS NULL AND d."deletedAt" IS NULL`)
  }
  async down() {
    this.schema.dropTable('delivery_media_cleanup')
    this.schema.dropTable('delivery_reports')
    this.schema.alterTable('details_orders', (table) => table.dropColumn('delivery_status'))
  }
}
