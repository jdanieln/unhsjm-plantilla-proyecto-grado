import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Company from '#models/company'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { OrderStatus } from '#enums/order_status'

export interface CompanyFilters {
  page?: number
  perPage?: number
  search?: string
}

@inject()
export default class CompanyService {
  async create({
    data,
  }: {
    data: {
      ruc: string
      businessName: string
      photoUrl?: string | null
      userId?: number
    }
  }): Promise<Company> {
    try {
      const company = await Company.create(data)
      logger.info({ idCompany: company.idCompany }, 'Company created successfully')
      return company
    } catch (error: any) {
      if (['23505', 19, 'ER_DUP_ENTRY'].includes(error.code || error.errno)) {
        throw new Error('A company with this RUC already exists.')
      }
      logger.error({ err: error }, 'Failed to create company')
      throw new Error('Failed to create company.')
    }
  }

  async update(
    id: number,
    data: Partial<{
      ruc: string
      businessName: string
      photoUrl: string | null
      userId: number
    }>
  ): Promise<Company> {
    try {
      const company = await this.findById(id)

      company.merge(data)
      await company.save()

      logger.info({ idCompany: company.idCompany }, 'Company updated successfully')
      return company
    } catch (error: any) {
      if (error.message === 'Company not found.') throw error
      if (['23505', 19, 'ER_DUP_ENTRY'].includes(error.code || error.errno)) {
        throw new Error('A company with this RUC already exists.')
      }
      logger.error({ err: error }, 'Failed to update company')
      throw new Error('Failed to update company.')
    }
  }
  async list(filters: CompanyFilters = {}) {
    const page = filters.page || 1
    const perPage = filters.perPage || 10
    // @ts-ignore
    const query = Company.query().whereNull('deletedAt').preload('user')

    if (filters.search) {
      query.where((builder) => {
        builder
          .where('businessName', 'ILIKE', `%${filters.search}%`)
          .orWhere('ruc', 'ILIKE', `%${filters.search}%`)
          // @ts-ignore: circular dependency type error
          .orWhereHas('user', (userQuery: any) => {
            userQuery.where('name', 'ILIKE', `%${filters.search}%`)
          })
      })
    }
    const paginator = await query.orderBy('idCompany', 'desc').paginate(page, perPage)
    const companies = paginator.all()
    if (companies.length === 0) return paginator.serialize()

    const delivered = await db
      .from('orders')
      .select('id_company')
      .count('* as total')
      .whereIn(
        'id_company',
        companies.map((company) => company.idCompany)
      )
      .where('status', OrderStatus.DELIVERED)
      .whereNull('deletedAt')
      .groupBy('id_company')
    const counts = new Map(delivered.map((row) => [Number(row.id_company), Number(row.total)]))

    return {
      ...paginator.serialize(),
      data: companies.map((company) => ({
        ...company.serialize(),
        deliveredShipmentsCount: counts.get(company.idCompany) ?? 0,
      })),
    }
  }

  async findById(id: number): Promise<Company> {
    try {
      return await Company.query().whereNull('deletedAt').where('idCompany', id).firstOrFail()
    } catch {
      throw new Error('Company not found.')
    }
  }

  async softDelete(id: number): Promise<void> {
    const company = await this.findById(id)
    company.deletedAt = DateTime.now()
    await company.save()
  }
}
