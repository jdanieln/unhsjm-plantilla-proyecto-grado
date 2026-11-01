import User from '#models/user'
import Rol from '#models/rol'
import Driver from '#models/driver'

export default class UserService {
  async list(filters: { page: number; perPage: number; search?: string }) {
    const query = User.query().preload('role')
    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${filters.search}%`)
          .orWhereILike('email', `%${filters.search}%`)
      })
    }
    return query.orderBy('idUser', 'desc').paginate(filters.page, filters.perPage)
  }

  async getUnassignedDriverAccounts() {
    const role = await Rol.findBy('name', 'driver')
    if (!role) return []
    return User.query().where('role_id', role.id).doesntHave('driver')
  }

  /**
   * Obtiene todos los usuarios que tienen el rol de 'company'
   * pero que aún no están asignados a ninguna empresa.
   */
  async getUnassignedCompanyUsers() {
    // Buscar el rol 'company'
    const companyRole = await Rol.findBy('name', 'company')

    if (!companyRole) {
      return []
    }

    // Retornar los usuarios que tienen este rol y no tienen una empresa asignada
    const users = await User.query().where('role_id', companyRole.id).doesntHave('company')

    return users
  }

  /**
   * Obtiene todos los conductores (Driver) que no tienen empresa asignada (idCompany IS NULL).
   * Incluye el idDriver para que el frontend pueda hacer el PUT /api/drivers/:idDriver.
   */
  async getUnassignedDriverUsers() {
    const drivers = await Driver.query()
      .whereNull('idCompany')
      .whereNull('deletedAt')
      // @ts-ignore
      .preload('user')

    return drivers.map((d) => ({
      idUser: d.userId,
      idDriver: d.idDriver,
      name: d.user?.name ?? '',
      email: d.user?.email ?? '',
    }))
  }

  /**
   * Obtiene los conductores (Driver) de una empresa que aún NO tienen un usuario asignado (userId IS NULL).
   * Filtra por idCompany para que cada company solo vea sus propios drivers sin asignar.
   */
  async getDriversWithoutUserByCompany(idCompany: number) {
    const drivers = await Driver.query()
      .where('idCompany', idCompany)
      .whereNull('user_id')
      .whereNull('deletedAt')

    return drivers.map((d) => ({
      idDriver: d.idDriver,
      idCompany: d.idCompany,
      license: d.license,
      passport: d.passport,
      status: d.status,
    }))
  }

  /**
   * Obtiene todos los usuarios con rol 'client' que aún NO están asociados a ningún registro
   * en la tabla clients (es decir, su user_id no aparece en clients).
   */
  async getUnassignedClientUsers() {
    const clientRole = await Rol.findBy('name', 'client')

    if (!clientRole) {
      return []
    }

    const users = await User.query().where('role_id', clientRole.id).doesntHave('client')

    return users.map((u) => ({
      idUser: u.idUser,
      name: u.name,
      email: u.email,
    }))
  }
}
