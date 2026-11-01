import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Truck from '#models/truck'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class TruckService {
  private async ensureStatusColumn() {
    try {
      await db.rawQuery(
        "ALTER TABLE trucks ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'active';"
      )
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Failed to check/create status column in trucks table')
    }
  }

  async create(data: {
    idCompany: number
    idDriver: number
    idCategory: number
    chassis: string
    plate: string
    status?: string
    maintenanceReason?: string
  }): Promise<Truck> {
    await this.ensureStatusColumn()
    if (data.status === 'mantenimiento' && !data.maintenanceReason?.trim()) {
      throw new Error('Indica el motivo del mantenimiento del camión.')
    }
    if (data.idDriver) {
      const existing = await Truck.query()
        .whereNull('deletedAt')
        .where('id_driver', data.idDriver)
        .first()
      if (existing) {
        throw new Error('This driver is already assigned to another truck.')
      }
    }
    try {
      const truck = await Truck.create(data)
      logger.info({ idTruck: truck.idTruck }, 'Truck created successfully')
      return truck
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create truck')
      throw new Error(error.message || 'Failed to create truck.')
    }
  }

  async update(
    id: number,
    data: Partial<{
      idCompany: number
      idDriver: number
      idCategory: number
      chassis: string
      plate: string
      status: string
      maintenanceReason: string
    }>
  ): Promise<Truck> {
    await this.ensureStatusColumn()
    if (data.idDriver) {
      const existing = await Truck.query()
        .whereNull('deletedAt')
        .where('id_driver', data.idDriver)
        .whereNot('id_truck', id)
        .first()
      if (existing) {
        throw new Error('This driver is already assigned to another truck.')
      }
    }
    try {
      const truck = await Truck.query().whereNull('deletedAt').where('id_truck', id).firstOrFail()
      if (data.status === 'mantenimiento' && !(data.maintenanceReason || truck.maintenanceReason)) {
        throw new Error('Indica el motivo del mantenimiento del camión.')
      }
      truck.merge(data)
      if (data.status && data.status !== 'mantenimiento') truck.maintenanceReason = null
      await truck.save()
      logger.info({ idTruck: truck.idTruck }, 'Truck updated successfully')
      return truck
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Truck not found.')
      }
      logger.error({ err: error }, 'Failed to update truck')
      throw new Error(error.message || 'Failed to update truck.')
    }
  }

  async list(
    filters: { page?: number; perPage?: number; idCompany?: number; search?: string } = {}
  ) {
    await this.ensureStatusColumn()
    try {
      const page = filters.page || 1
      const perPage = filters.perPage || 10
      const query = Truck.query()
        .whereNull('deletedAt')
        .preload('company')
        .preload('driver', (driverQuery) => {
          // @ts-ignore: circular dependency relation works at runtime
          driverQuery.preload('user')
        })
        .preload('category')

      if (filters.idCompany) {
        query.where('id_company', filters.idCompany)
      }
      if (filters.search) {
        query.where((builder) =>
          builder
            .whereILike('plate', `%${filters.search}%`)
            .orWhereILike('chassis', `%${filters.search}%`)
        )
      }

      return await query.orderBy('id_truck', 'desc').paginate(page, perPage)
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list trucks')
      throw new Error('Failed to retrieve trucks.')
    }
  }

  async findById(id: number): Promise<Truck> {
    try {
      return await Truck.query()
        .whereNull('deletedAt')
        .where('id_truck', id)
        .preload('company')
        .preload('driver', (driverQuery) => {
          // @ts-ignore: circular dependency relation works at runtime
          driverQuery.preload('user')
        })
        .preload('category')
        .firstOrFail()
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Truck not found.')
      }
      logger.error({ err: error }, 'Failed to find truck')
      throw new Error('Failed to find truck.')
    }
  }

  async findByDriverId(idDriver: number): Promise<Truck> {
    await this.ensureStatusColumn()
    try {
      return await Truck.query()
        .whereNull('deletedAt')
        .where('id_driver', idDriver)
        .preload('company')
        .preload('driver', (driverQuery) => {
          // @ts-ignore: circular dependency relation works at runtime
          driverQuery.preload('user')
        })
        .preload('category')
        .firstOrFail()
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Assigned truck not found.')
      }
      logger.error({ err: error }, 'Failed to find assigned truck')
      throw new Error('Failed to find assigned truck.')
    }
  }

  async reportMaintenanceForDriver(idDriver: number, reason: string): Promise<Truck> {
    const truck = await this.findByDriverId(idDriver)
    truck.status = 'mantenimiento'
    truck.maintenanceReason = reason
    await truck.save()
    logger.info({ idTruck: truck.idTruck, idDriver }, 'Driver reported truck maintenance')
    return await this.findById(truck.idTruck)
  }
  async softDelete(id: number): Promise<void> {
    try {
      const truck = await this.findById(id)
      truck.deletedAt = DateTime.now()
      await truck.save()
      logger.info({ idTruck: truck.idTruck }, 'Truck soft-deleted successfully')
    } catch (error: any) {
      if (error.message === 'Truck not found.') throw error
      logger.error({ err: error }, 'Failed to soft-delete truck')
      throw new Error('Failed to soft-delete truck.')
    }
  }
}
