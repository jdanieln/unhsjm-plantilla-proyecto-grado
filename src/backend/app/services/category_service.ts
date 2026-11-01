import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Category from '#models/category'
import logger from '@adonisjs/core/services/logger'
import { CategoryStatus } from '#enums/category_status'

@inject()
export default class CategoryService {
  async create(data: { nameCategory: string; status?: CategoryStatus }): Promise<Category> {
    try {
      const category = await Category.create({
        ...data,
        status: data.status ?? CategoryStatus.ACTIVE,
      })
      logger.info({ idCategory: category.idCategory }, 'Category created successfully')
      return category
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create category')
      throw new Error('Failed to create category.')
    }
  }

  async update(
    id: number,
    data: Partial<{ nameCategory: string; status: CategoryStatus }>
  ): Promise<Category> {
    try {
      const category = await Category.query()
        .whereNull('deletedAt')
        .where('idCategory', id)
        .firstOrFail()
      category.merge(data)
      await category.save()
      logger.info({ idCategory: category.idCategory }, 'Category updated successfully')
      return category
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Category not found.')
      }
      logger.error({ err: error }, 'Failed to update category')
      throw new Error('Failed to update category.')
    }
  }

  async list(filters: { page?: number; perPage?: number; search?: string } = {}) {
    try {
      const page = filters.page || 1
      const perPage = filters.perPage || 10
      const query = Category.query().whereNull('deletedAt')
      if (filters.search) query.whereILike('nameCategory', `%${filters.search}%`)
      return await query.orderBy('idCategory', 'desc').paginate(page, perPage)
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list categories')
      throw new Error('Failed to retrieve categories.')
    }
  }

  async findById(id: number): Promise<Category> {
    try {
      return await Category.query().whereNull('deletedAt').where('idCategory', id).firstOrFail()
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        throw new Error('Category not found.')
      }
      logger.error({ err: error }, 'Failed to find category')
      throw new Error('Failed to find category.')
    }
  }

  async softDelete(id: number): Promise<void> {
    try {
      const category = await this.findById(id)
      category.deletedAt = DateTime.now()
      await category.save()
      logger.info({ idCategory: category.idCategory }, 'Category soft-deleted successfully')
    } catch (error: any) {
      if (error.message === 'Category not found.') throw error
      logger.error({ err: error }, 'Failed to soft-delete category')
      throw new Error('Failed to soft-delete category.')
    }
  }
}
