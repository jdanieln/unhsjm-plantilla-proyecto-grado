import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trucks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('maintenanceReason').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('maintenanceReason')
    })
  }
}
