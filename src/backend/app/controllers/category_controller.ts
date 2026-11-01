import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import CategoryService from '#services/category_service'
import { createCategoryValidator, updateCategoryValidator } from '#validators/category_validator'

@inject()
export default class CategoriesController {
  constructor(private categoryService: CategoryService) {}

  /**
   * @index
   * @description Lists all truck categories with pagination
   * @tag Categories
   * @paramQuery page - Page number - @type(number)
   * @paramQuery perPage - Items per page - @type(number)
   * @responseBody 200 - Paginador de categorías
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 10)
    try {
      const categories = await this.categoryService.list({
        page,
        perPage,
        search: request.input('search'),
      })
      return response.ok(categories)
    } catch {
      return response.internalServerError({ message: 'Failed to retrieve categories.' })
    }
  }

  /**
   * @show
   * @description Finds a category by ID
   * @tag Categories
   * @paramPath id - Category ID - @type(number) @required
   * @responseBody 200 - Objeto de categoría
   * @responseBody 404 - Category not found
   */
  async show({ params, response }: HttpContext) {
    try {
      const category = await this.categoryService.findById(params.id)
      return response.ok(category)
    } catch {
      return response.notFound({ message: 'Category not found.' })
    }
  }

  /**
   * @store
   * @description Creates a new truck category
   * @tag Categories
   * @requestBody { "nameCategory": "string", "status": "string?" }
   * @responseBody 201 - <Category>
   * @responseBody 422 - Validation failed
   */
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createCategoryValidator)
    try {
      const category = await this.categoryService.create(data)
      return response.created(category)
    } catch (error: any) {
      return response.unprocessableEntity({ message: error.message })
    }
  }

  /**
   * @update
   * @description Updates an existing category
   * @tag Categories
   * @paramPath id - Category ID - @type(number) @required
   * @requestBody { "nameCategory": "string?", "status": "string?" }
   * @responseBody 200 - <Category>
   * @responseBody 404 - Category not found
   * @responseBody 422 - Validation failed
   */
  async update({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateCategoryValidator)
    try {
      const category = await this.categoryService.update(params.id, data)
      return response.ok(category)
    } catch (error: any) {
      if (error.message === 'Category not found.') {
        return response.notFound({ message: error.message })
      }
      return response.unprocessableEntity({ message: error.message })
    }
  }

  /**
   * @destroy
   * @description Soft-deletes a category
   * @tag Categories
   * @paramPath id - Category ID - @type(number) @required
   * @responseBody 200 - { "message": "Category deleted successfully." }
   * @responseBody 404 - Category not found
   */
  async destroy({ params, response }: HttpContext) {
    try {
      await this.categoryService.softDelete(params.id)
      return response.ok({ message: 'Category deleted successfully.' })
    } catch {
      return response.notFound({ message: 'Category not found.' })
    }
  }
}
