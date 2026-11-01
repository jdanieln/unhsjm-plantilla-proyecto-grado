import vine from '@vinejs/vine'
import { PackagingType } from '#enums/orders_packaging_type'

export const createDetailsOrderValidator = vine.compile(
  vine.object({
    idOrder: vine.number().exists({ table: 'orders', column: 'idOrder' }),
    idDriver: vine.number().exists({ table: 'drivers', column: 'idDriver' }).optional(),
    cargoDescription: vine.string().trim().minLength(3).maxLength(255),
    amount: vine.number().min(0),
    unitWeight: vine.string().trim().maxLength(50),
    deliveryAddress: vine.string().trim().minLength(5).maxLength(255),
    typePackaging: vine.enum(Object.values(PackagingType)),
    rate: vine.number().positive().min(0).optional(),
    quantity: vine.number().positive().min(0).optional(),
  })
)

export const updateDetailsOrderValidator = vine.compile(
  vine.object({
    idOrder: vine.number().exists({ table: 'orders', column: 'idOrder' }).optional(),
    idDriver: vine.number().exists({ table: 'drivers', column: 'idDriver' }).optional(),
    cargoDescription: vine.string().trim().minLength(3).maxLength(255).optional(),
    amount: vine.number().positive().optional(),
    unitWeight: vine.string().trim().maxLength(50).optional(),
    deliveryAddress: vine.string().trim().minLength(5).maxLength(255).optional(),
    typePackaging: vine.enum(Object.values(PackagingType)).optional(),
    rate: vine.number().positive().optional(),
    quantity: vine.number().positive().min(0).optional(),
  })
)
