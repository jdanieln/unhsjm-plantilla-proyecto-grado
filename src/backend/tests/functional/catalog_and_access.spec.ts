/* eslint-disable @unicorn/no-await-expression-member */
import { test } from '@japa/runner'
import Rol from '#models/rol'
import User from '#models/user'
import Category from '#models/category'
import Client from '#models/client'
import Company from '#models/company'

async function account(roleName: string) {
  const role = await Rol.firstOrCreate({ name: roleName })
  const user = await User.create({
    name: `${roleName} Tester ${Math.random().toString(36).slice(2)}`,
    email: `${roleName}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
    password: 'password123',
    roleId: role.id,
  })
  return (await User.accessTokens.create(user)).value!.release()
}

test.group('CategoryController / CategoryService', () => {
  test('company creates, lists, updates and soft-deletes a category', async ({
    client,
    assert,
  }) => {
    const token = await account('company')
    const create = await client
      .post('/api/categories')
      .header('Authorization', `Bearer ${token}`)
      .json({ nameCategory: 'Camión de prueba' })
    create.assertStatus(201)
    const id = create.body().idCategory
    assert.isNumber(id)

    const list = await client
      .get('/api/categories?search=Camión')
      .header('Authorization', `Bearer ${token}`)
    list.assertStatus(200)
    assert.isAbove(list.body().data.length, 0)

    const update = await client
      .put(`/api/categories/${id}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ nameCategory: 'Camión actualizado' })
    update.assertStatus(200)
    assert.equal(update.body().nameCategory, 'Camión actualizado')

    const remove = await client
      .delete(`/api/categories/${id}`)
      .header('Authorization', `Bearer ${token}`)
    remove.assertStatus(200)
    const missing = await client
      .get(`/api/categories/${id}`)
      .header('Authorization', `Bearer ${token}`)
    missing.assertStatus(404)
    assert.exists((await Category.find(id))?.deletedAt)
  })

  test('validates category names and returns 404 for missing rows', async ({ client }) => {
    const token = await account('platform_admin')
    const invalid = await client
      .post('/api/categories')
      .header('Authorization', `Bearer ${token}`)
      .json({ nameCategory: 'x' })
    invalid.assertStatus(422)
    const missing = await client
      .get('/api/categories/999999')
      .header('Authorization', `Bearer ${token}`)
    missing.assertStatus(404)
  })

  test('blocks a client from category management', async ({ client }) => {
    const token = await account('client')
    const response = await client.get('/api/categories').header('Authorization', `Bearer ${token}`)
    response.assertStatus(403)
  })
})

test.group('ClientController / ClientService', () => {
  test('creates, updates and soft-deletes a client profile', async ({ client, assert }) => {
    const token = await account('platform_admin')
    const create = await client
      .post('/api/clients')
      .header('Authorization', `Bearer ${token}`)
      .json({
        companyName: 'Cliente Logístico',
        ruc: `R${Date.now()}`,
        address: 'Managua centro',
        typeClient: 'legal',
      })
    create.assertStatus(201)
    const id = create.body().idClient
    const list = await client
      .get('/api/clients?search=Logístico')
      .header('Authorization', `Bearer ${token}`)
    list.assertStatus(200)
    assert.isAbove(list.body().data.length, 0)
    const update = await client
      .put(`/api/clients/${id}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ address: 'Nueva dirección Managua' })
    update.assertStatus(200)
    assert.equal(update.body().address, 'Nueva dirección Managua')
    const remove = await client
      .delete(`/api/clients/${id}`)
      .header('Authorization', `Bearer ${token}`)
    remove.assertStatus(200)
    const missing = await client
      .get(`/api/clients/${id}`)
      .header('Authorization', `Bearer ${token}`)
    missing.assertStatus(404)
    assert.exists((await Client.find(id))?.deletedAt)
  })

  test('validates client type and missing records', async ({ client }) => {
    const token = await account('platform_admin')
    const invalid = await client
      .post('/api/clients')
      .header('Authorization', `Bearer ${token}`)
      .json({ companyName: 'Prueba', ruc: 'X1', address: 'Managua', typeClient: 'unknown' })
    invalid.assertStatus(422)
    const missing = await client
      .get('/api/clients/999999')
      .header('Authorization', `Bearer ${token}`)
    missing.assertStatus(404)
  })
})

test.group('CompanyController / CompanyService', () => {
  test('creates, updates and soft-deletes a company', async ({ client, assert }) => {
    const token = await account('platform_admin')
    const create = await client
      .post('/api/companies')
      .header('Authorization', `Bearer ${token}`)
      .json({ ruc: `C${Date.now()}`, businessName: 'Transportes Prueba' })
    create.assertStatus(201)
    const id = create.body().idCompany
    const list = await client
      .get('/api/companies?search=Transportes')
      .header('Authorization', `Bearer ${token}`)
    list.assertStatus(200)
    assert.isAbove(list.body().data.length, 0)
    const update = await client
      .put(`/api/companies/${id}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ businessName: 'Transportes Actualizados' })
    update.assertStatus(200)
    const remove = await client
      .delete(`/api/companies/${id}`)
      .header('Authorization', `Bearer ${token}`)
    remove.assertStatus(200)
    const missing = await client
      .get(`/api/companies/${id}`)
      .header('Authorization', `Bearer ${token}`)
    missing.assertStatus(404)
    assert.exists((await Company.find(id))?.deletedAt)
  })

  test('rejects incomplete company data', async ({ client }) => {
    const token = await account('platform_admin')
    const response = await client
      .post('/api/companies')
      .header('Authorization', `Bearer ${token}`)
      .json({ businessName: 'Sin RUC' })
    response.assertStatus(422)
  })
})

test.group('Protected controller routes', () => {
  const routes = [
    '/api/roles',
    '/api/users',
    '/api/clients',
    '/api/companies',
    '/api/drivers',
    '/api/trucks',
    '/api/orders',
    '/api/payments',
    '/api/categories',
    '/api/deliveries/review',
    '/api/deliveries/pending',
    '/api/driver/truck',
  ]
  for (const route of routes) {
    test(`rejects anonymous GET ${route}`, async ({ client }) => {
      const response = await client.get(route)
      response.assertStatus(401)
    })
  }

  test('blocks a client from admin, fleet and driver endpoints', async ({ client }) => {
    const token = await account('client')
    for (const route of ['/api/roles', '/api/users', '/api/trucks', '/api/driver/truck']) {
      const response = await client.get(route).header('Authorization', `Bearer ${token}`)
      response.assertStatus(403)
    }
  })
})
