/* eslint-disable @unicorn/no-await-expression-member */
import { test } from '@japa/runner'
import Rol from '#models/rol'
import User from '#models/user'
import Company from '#models/company'
import Driver from '#models/driver'
import Category from '#models/category'
import Truck from '#models/truck'

test.group('DriverController / TruckController', () => {
  test('company manages a driver and truck; driver sees its assigned truck', async ({
    client,
    assert,
  }) => {
    const companyRole = await Rol.firstOrCreate({ name: 'company' })
    const driverRole = await Rol.firstOrCreate({ name: 'driver' })
    const suffix = Math.random().toString(36).slice(2)
    const companyUser = await User.create({
      name: `Empresa ${suffix}`,
      email: `company-${suffix}@example.test`,
      password: 'password123',
      roleId: companyRole.id,
    })
    const driverUser = await User.create({
      name: `Conductor ${suffix}`,
      email: `driver-${suffix}@example.test`,
      password: 'password123',
      roleId: driverRole.id,
    })
    const company = await Company.create({
      userId: companyUser.idUser,
      businessName: 'Flota Prueba',
      ruc: `F${Date.now()}`,
    })
    const category = await Category.create({ nameCategory: 'Pesado', status: 'activo' })
    const companyToken = (await User.accessTokens.create(companyUser)).value!.release()
    const driverToken = (await User.accessTokens.create(driverUser)).value!.release()

    const createDriver = await client
      .post('/api/drivers')
      .header('Authorization', `Bearer ${companyToken}`)
      .json({
        idCompany: company.idCompany,
        userId: driverUser.idUser,
        license: `L${suffix}`,
        passport: `P${suffix}`,
      })
    createDriver.assertStatus(201)
    const idDriver = createDriver.body().idDriver

    const createTruck = await client
      .post('/api/trucks')
      .header('Authorization', `Bearer ${companyToken}`)
      .json({
        idCompany: company.idCompany,
        idDriver,
        idCategory: category.idCategory,
        chassis: `CH${suffix}`,
        plate: `PL${suffix}`,
      })
    createTruck.assertStatus(201)
    const idTruck = createTruck.body().idTruck

    const assigned = await client
      .get('/api/driver/truck')
      .header('Authorization', `Bearer ${driverToken}`)
    assigned.assertStatus(200)
    assert.equal(assigned.body().idTruck, idTruck)

    const duplicate = await client
      .post('/api/trucks')
      .header('Authorization', `Bearer ${companyToken}`)
      .json({
        idCompany: company.idCompany,
        idDriver,
        idCategory: category.idCategory,
        chassis: `CH2${suffix}`,
        plate: `PL2${suffix}`,
      })
    duplicate.assertStatus(422)

    const removeTruck = await client
      .delete(`/api/trucks/${idTruck}`)
      .header('Authorization', `Bearer ${companyToken}`)
    removeTruck.assertStatus(200)
    assert.exists((await Truck.find(idTruck))?.deletedAt)
    const removeDriver = await client
      .delete(`/api/drivers/${idDriver}`)
      .header('Authorization', `Bearer ${companyToken}`)
    removeDriver.assertStatus(200)
    assert.exists((await Driver.find(idDriver))?.deletedAt)
  })
})
