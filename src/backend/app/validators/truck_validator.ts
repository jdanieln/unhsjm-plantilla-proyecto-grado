import vine from '@vinejs/vine'

export const createTruckValidator = vine.compile(
  vine.object({
    idCompany: vine.number().exists({ table: 'companies', column: 'idCompany' }),
    idDriver: vine.number().exists({ table: 'drivers', column: 'idDriver' }),
    idCategory: vine.number().exists({ table: 'truck_categories', column: 'idCategory' }),
    chassis: vine.string().trim().minLength(5).maxLength(100),
    plate: vine.string().trim().minLength(3).maxLength(50),
    status: vine.string().trim().optional(),
    maintenanceReason: vine.string().trim().minLength(10).maxLength(500).optional(),
  })
)

export const updateTruckValidator = vine.compile(
  vine.object({
    idCompany: vine.number().exists({ table: 'companies', column: 'idCompany' }).optional(),
    idDriver: vine.number().exists({ table: 'drivers', column: 'idDriver' }).optional(),
    idCategory: vine
      .number()
      .exists({ table: 'truck_categories', column: 'idCategory' })
      .optional(),
    chassis: vine.string().trim().minLength(5).maxLength(100).optional(),
    plate: vine.string().trim().minLength(3).maxLength(50).optional(),
    status: vine.string().trim().optional(),
    maintenanceReason: vine.string().trim().minLength(10).maxLength(500).optional(),
  })
)

export const reportTruckMaintenanceValidator = vine.compile(
  vine.object({
    status: vine.string().trim(),
    reason: vine.string().trim().minLength(10).maxLength(500),
  })
)
