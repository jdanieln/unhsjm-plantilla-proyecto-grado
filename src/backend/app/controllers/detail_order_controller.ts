import { orderAccess } from '#services/order_access'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import DetailsOrderService from '#services/details_order_service'
import {
  createDetailsOrderValidator,
  updateDetailsOrderValidator,
} from '#validators/details_order_validator'

@inject()
export default class DetailsOrdersController {
  constructor(private detailsService: DetailsOrderService) {}

  /**
   * @store
   * @description Agrega un nuevo detalle de carga a una orden.
   * @tag OrderDetails
   * @requestBody { "idOrder": "number", "idDriver": "number?", "cargoDescription": "string", "amount": "number", "unitWeight": "string", "deliveryAddress": "string", "typePackaging": "pallet" }
   * @responseBody 201 - <DetailsOrder>
   * @responseBody 422 - Validation failed
   */
  async store({ auth, request, response }: HttpContext) {
    // 1. Validamos los datos de entrada
    const data = await request.validateUsing(createDetailsOrderValidator)
    await orderAccess(auth.user!, data.idOrder)

    try {
      // 2. Llamamos al método especializado del servicio que hace el cálculo
      // En lugar de this.detailsService.create(data), usamos createWithCalculation
      const detail = await this.detailsService.createWithCalculation(data)

      return response.created(detail)
    } catch (error: any) {
      return response.unprocessableEntity({ message: error.message })
    }
  }
  /**
   * @show
   * @description Busca un detalle específico por ID (incluye datos del conductor si existe)
   * @tag OrderDetails
   * @paramPath id - ID del detalle - @type(number) @required
   * @responseBody 200 - Objeto de detalle
   * @responseBody 404 - Detail not found
   */
  async show({ auth, params, response }: HttpContext) {
    try {
      const detail = await this.detailsService.findById(Number(params.id))
      await orderAccess(auth.user!, detail.idOrder)
      return response.ok(detail)
    } catch {
      return response.notFound({ message: 'Detail not found.' })
    }
  }

  /**
   * @update
   * @description Actualiza los datos de la carga o asigna/cambia al conductor
   * @tag OrderDetails
   * @paramPath id - ID del detalle - @type(number) @required
   * @requestBody { "idDriver": "number?", "cargoDescription": "string?", "amount": "number?", "unitWeight": "string?", "deliveryAddress": "string?", "typePackaging": "pallet" }
   * @responseBody 200 - <DetailsOrder>
   * @responseBody 404 - Detail not found
   * @responseBody 422 - Validation failed
   */
  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateDetailsOrderValidator)

    try {
      const previous = await this.detailsService.findById(Number(params.id))
      const order = await orderAccess(auth.user!, previous.idOrder)
      if (order.status !== 'pendiente' || data.idDriver !== undefined)
        return response.forbidden({
          message:
            'Solo puedes editar cargas pendientes; usa la asignación del pedido para elegir conductor.',
        })
      const detail = await this.detailsService.update(Number(params.id), data)
      await orderAccess(auth.user!, detail.idOrder)
      return response.ok(detail)
    } catch (error: any) {
      if (error.message === 'Detail not found.') {
        return response.notFound({ message: error.message })
      }
      return response.unprocessableEntity({ message: error.message })
    }
  }

  /**
   * @destroy
   * @description Borrado lógico de un detalle de orden
   * @tag OrderDetails
   * @paramPath id - ID del detalle - @type(number) @required
   * @responseBody 200 - { "message": "Detail removed successfully." }
   * @responseBody 404 - Detail not found
   */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      const previous = await this.detailsService.findById(Number(params.id))
      const order = await orderAccess(auth.user!, previous.idOrder)
      if (order.status !== 'pendiente')
        return response.forbidden({ message: 'Solo se pueden eliminar cargas pendientes.' })
      await this.detailsService.softDelete(Number(params.id))
      return response.ok({ message: 'Detail removed successfully.' })
    } catch {
      return response.notFound({ message: 'Detail not found.' })
    }
  }
}
