import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import TruckService from '#services/truck_services'
import {
  createTruckValidator,
  updateTruckValidator,
  reportTruckMaintenanceValidator,
} from '#validators/truck_validator'

@inject()
export default class TrucksController {
  constructor(private truckService: TruckService) {}

  async myTruck({ auth, response }: HttpContext) {
    try {
      const user = auth.user
      if (!user) return response.unauthorized({ message: 'Unauthorized' })

      await user.load('driver')
      const idDriver = user.driver?.idDriver
      if (!idDriver) return response.notFound({ message: 'Driver profile not found.' })

      const truck = await this.truckService.findByDriverId(idDriver)
      return response.ok(truck)
    } catch (error: any) {
      if (error.message === 'Assigned truck not found.') {
        return response.notFound({ message: error.message })
      }
      return response.internalServerError({ message: 'Failed to retrieve assigned truck.' })
    }
  }

  async reportMyTruckMaintenance({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(reportTruckMaintenanceValidator)
    if (payload.status !== 'mantenimiento') {
      return response.unprocessableEntity({
        message: 'Only mantenimiento status can be reported by drivers.',
      })
    }

    try {
      const user = auth.user
      if (!user) return response.unauthorized({ message: 'Unauthorized' })

      await user.load('driver')
      const idDriver = user.driver?.idDriver
      if (!idDriver) return response.notFound({ message: 'Driver profile not found.' })

      const truck = await this.truckService.reportMaintenanceForDriver(idDriver, payload.reason)
      return response.ok(truck)
    } catch (error: any) {
      if (error.message === 'Assigned truck not found.') {
        return response.notFound({ message: error.message })
      }
      return response.unprocessableEntity({ message: error.message })
    }
  }
  /**
   * @index
   * @description Lists all trucks with pagination
   * @tag Trucks
   * @paramQuery page - Page number - @type(number)
   * @paramQuery perPage - Items per page - @type(number)
   * @paramQuery idCompany - Optional company ID filter - @type(number)
   * @responseBody 200 - Paginador de camiones
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 10)
    const idCompany = request.input('idCompany')

    try {
      const trucks = await this.truckService.list({
        page,
        perPage,
        idCompany,
        search: request.input('search'),
      })
      return response.ok(trucks)
    } catch {
      return response.internalServerError({ message: 'Failed to retrieve trucks.' })
    }
  }

  /**
   * @show
   * @description Finds a truck by ID
   * @tag Trucks
   * @paramPath id - Truck ID - @type(number) @required
   * @responseBody 200 - Objeto de camión
   * @responseBody 404 - Truck not found
   */
  async show({ params, response }: HttpContext) {
    try {
      const truck = await this.truckService.findById(params.id)
      return response.ok(truck)
    } catch {
      return response.notFound({ message: 'Truck not found.' })
    }
  }

  /**
   * @store
   * @description Creates a new truck
   * @tag Trucks
   * @requestBody { "idCompany": "number", "idDriver": "number", "idCategory": "number", "chassis": "string", "plate": "string" }
   * @responseBody 201 - <Truck>
   * @responseBody 422 - Validation failed
   */
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createTruckValidator)

    try {
      const truck = await this.truckService.create(data)
      return response.created(truck)
    } catch (error: any) {
      return response.unprocessableEntity({ message: error.message })
    }
  }

  /**
   * @update
   * @description Updates an existing truck
   * @tag Trucks
   * @paramPath id - Truck ID - @type(number) @required
   * @requestBody { "idCompany": "number?", "idDriver": "number?", "idCategory": "number?", "chassis": "string?", "plate": "string?" }
   * @responseBody 200 - <Truck>
   * @responseBody 404 - Truck not found
   * @responseBody 422 - Validation failed
   */
  async update({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateTruckValidator)

    try {
      const truck = await this.truckService.update(params.id, data)
      return response.ok(truck)
    } catch (error: any) {
      if (error.message === 'Truck not found.') {
        return response.notFound({ message: error.message })
      }
      return response.unprocessableEntity({ message: error.message })
    }
  }

  /**
   * @destroy
   * @description Soft-deletes a truck
   * @tag Trucks
   * @paramPath id - Truck ID - @type(number) @required
   * @responseBody 200 - { "message": "Truck deleted successfully." }
   * @responseBody 404 - Truck not found
   */
  async destroy({ params, response }: HttpContext) {
    try {
      await this.truckService.softDelete(params.id)
      return response.ok({ message: 'Truck deleted successfully.' })
    } catch {
      return response.notFound({ message: 'Truck not found.' })
    }
  }
}
