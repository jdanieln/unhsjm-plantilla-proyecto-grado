import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trucks'

  async up() {
    const hasSnakeCase = await this.schema.hasColumn(this.tableName, 'maintenance_reason')
    if (hasSnakeCase) return

    const hasCamelCase = await this.schema.hasColumn(this.tableName, 'maintenanceReason')
    this.schema.alterTable(this.tableName, (table) => {
      if (hasCamelCase) {
        table.renameColumn('maintenanceReason', 'maintenance_reason')
      } else {
        table.text('maintenance_reason').nullable()
      }
    })
  }

  async down() {
    const hasCamelCase = await this.schema.hasColumn(this.tableName, 'maintenanceReason')
    if (hasCamelCase) return

    const hasSnakeCase = await this.schema.hasColumn(this.tableName, 'maintenance_reason')
    if (!hasSnakeCase) return

    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('maintenance_reason', 'maintenanceReason')
    })
  }
}
