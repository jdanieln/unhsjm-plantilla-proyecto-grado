import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import Driver from '#models/driver'

export default class DetailsOrder extends BaseModel {
  public static table = 'details_orders'

  @column({ isPrimary: true, columnName: 'idDetails' })
  declare idDetails: number

  @column({ columnName: 'id_order' })
  declare idOrder: number

  @column({ columnName: 'id_driver' })
  declare idDriver: number | null

  @column({ columnName: 'delivery_status' })
  declare deliveryStatus: string

  @column({ columnName: 'cargoDescription' })
  declare cargoDescription: string

  @column({ columnName: 'amount' })
  declare amount: number

  @column({ columnName: 'quantity' })
  declare quantity: number

  @column({ columnName: 'unitWeight' })
  declare unitWeight: string

  @column({ columnName: 'deliveryAddress' })
  declare deliveryAddress: string

  @column({
    columnName: 'typePackaging',
    prepare: (value?: string) => value || 'pallet',
  })
  declare typePackaging: string

  @column.dateTime({ autoCreate: true, columnName: 'createdAt' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updatedAt' })
  declare updatedAt: DateTime

  @column.dateTime({ columnName: 'deletedAt' })
  declare deletedAt: DateTime | null

  @belongsTo(() => Order, { foreignKey: 'idOrder' })
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Driver, {
    foreignKey: 'idDriver',
  })
  declare driver: BelongsTo<typeof Driver>
}
