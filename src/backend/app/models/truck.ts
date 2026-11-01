import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Company from '#models/company'
import Driver from '#models/driver'
import Category from '#models/category'

export default class Truck extends BaseModel {
  public static table = 'trucks'

  @column({ isPrimary: true, columnName: 'id_truck' })
  declare idTruck: number

  @column({ columnName: 'id_company' })
  declare idCompany: number

  @column({ columnName: 'id_driver' })
  declare idDriver: number

  @column({ columnName: 'id_category' })
  declare idCategory: number

  @column()
  declare chassis: string

  @column()
  declare plate: string

  @column()
  declare status: string

  @column({ columnName: 'maintenance_reason' })
  declare maintenanceReason: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @belongsTo(() => Company, { foreignKey: 'idCompany' })
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => Driver, { foreignKey: 'idDriver' })
  declare driver: BelongsTo<typeof Driver>

  @belongsTo(() => Category, { foreignKey: 'idCategory' })
  declare category: BelongsTo<typeof Category>
}
