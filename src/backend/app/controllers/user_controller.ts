import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator } from '#validators/user_validator'
import RegisterService from '#services/register_service'
import UserService from '#services/user_service'

@inject()
export default class UsersController {
  async index({ request, response }: HttpContext) {
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const perPage = Math.min(100, Math.max(1, Number(request.input('perPage', 10)) || 10))
    return response.ok(
      await this.userService.list({ page, perPage, search: request.input('search') })
    )
  }

  async getUnassignedDriverAccounts({ response }: HttpContext) {
    return response.ok(await this.userService.getUnassignedDriverAccounts())
  }

  constructor(
    private registerService: RegisterService,
    private userService: UserService
  ) {}

  /**
   * @register
   * @description Registers a new user into the system
   * @tag Auth
   * @requestBody { "name": "string", "email": "string", "password": "string", "roleId": "number" }
   * @responseBody 201 - <User>
   * @responseBody 422 - Validation failed
   */
  async register({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)
    const result = await this.registerService.register(data, auth)

    if (!result.success) {
      return response.unprocessableEntity({ message: result.error })
    }

    return response.created({
      message: 'User registered successfully',
      token: result.tokenValue,
      user: result.user,
    })
  }

  /**
   * @getUnassignedCompanyUsers
   * @description Fetches all users with role 'company' that are not assigned to a company
   * @tag Users
   * @responseBody 200 - Array of unassigned company users
   */
  async getUnassignedCompanyUsers({ response }: HttpContext) {
    const users = await this.userService.getUnassignedCompanyUsers()
    return response.ok(users)
  }

  /**
   * @getUnassignedDriverUsers
   * @description Fetches all users with role 'driver' that are not assigned to a company
   * @tag Users
   * @responseBody 200 - Array of unassigned driver users
   */
  async getUnassignedDriverUsers({ response }: HttpContext) {
    const users = await this.userService.getUnassignedDriverUsers()
    return response.ok(users)
  }

  /**
   * @getDriversWithoutUserByCompany
   * @description Fetches all drivers belonging to a company that have no user assigned yet (user_id IS NULL)
   * @tag Users
   * @paramQuery idCompany - Company ID to filter drivers - @type(number) @required
   * @responseBody 200 - Array of drivers without an assigned user
   * @responseBody 400 - { "message": "idCompany is required" }
   */
  async getDriversWithoutUserByCompany({ request, response }: HttpContext) {
    const idCompany = request.input('idCompany')

    if (!idCompany) {
      return response.badRequest({ message: 'idCompany is required' })
    }

    const drivers = await this.userService.getDriversWithoutUserByCompany(Number(idCompany))
    return response.ok(drivers)
  }

  /**
   * @getUnassignedClientUsers
   * @description Fetches all users with role 'client' that are not yet associated to any client record in the clients table
   * @tag Users
   * @responseBody 200 - Array of users with role 'client' not yet linked to the clients table
   */
  async getUnassignedClientUsers({ response }: HttpContext) {
    const users = await this.userService.getUnassignedClientUsers()
    return response.ok(users)
  }
}
