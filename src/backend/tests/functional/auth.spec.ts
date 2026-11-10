import { test } from '@japa/runner'
import Rol from '#models/rol'
import User from '#models/user'

test.group('Authentication endpoints', () => {
  test('exposes the OpenAPI specification', async ({ client, assert }) => {
    const response = await client.get('/swagger')

    response.assertStatus(200)
    assert.equal(response.header('content-type')?.includes('application/json'), true)
    assert.exists(response.body().paths)
  })

  test('rejects an invalid signup payload', async ({ client, assert }) => {
    const response = await client.post('/api/auth/signup').json({
      name: 'Test user',
      email: 'not-an-email',
      password: 'short',
    })

    response.assertStatus(422)
    assert.exists(response.body().errors)
  })

  test('rejects access to the current-user endpoint without credentials', async ({ client }) => {
    const response = await client.get('/api/auth/me')

    response.assertStatus(401)
  })

  test('registers a client, authenticates it and invalidates the token on logout', async ({
    client,
    assert,
  }) => {
    await Rol.firstOrCreate({ name: 'client' })
    const email = `client-${Date.now()}@example.test`
    const signup = await client
      .post('/api/auth/signup')
      .json({ name: 'Cliente Prueba', email, password: 'password123' })
    signup.assertStatus(201)
    assert.equal(signup.body().user.email, email)
    assert.exists(signup.body().token)

    const me = await client
      .get('/api/auth/me')
      .header('Authorization', `Bearer ${signup.body().token}`)
    me.assertStatus(200)
    assert.equal(me.body().email, email)

    const logout = await client
      .post('/api/auth/logout')
      .header('Authorization', `Bearer ${signup.body().token}`)
    logout.assertStatus(200)
    const afterLogout = await client
      .get('/api/auth/me')
      .header('Authorization', `Bearer ${signup.body().token}`)
    afterLogout.assertStatus(401)
  })

  test('rejects duplicate signup and invalid credentials', async ({ client }) => {
    const role = await Rol.firstOrCreate({ name: 'client' })
    await User.create({
      name: 'Cuenta Existente',
      email: 'existing@example.test',
      password: 'password123',
      roleId: role.id,
    })
    const duplicate = await client
      .post('/api/auth/signup')
      .json({ name: 'Otra Cuenta', email: 'existing@example.test', password: 'password123' })
    duplicate.assertStatus(422)
    const login = await client
      .post('/api/auth/login')
      .json({ email: 'existing@example.test', password: 'wrong-password' })
    login.assertStatus(401)
  })

  test('does not reveal whether a password reset email exists', async ({ client }) => {
    const response = await client
      .post('/api/auth/forgot-password')
      .json({ email: 'nobody@example.test' })
    response.assertStatus(200)
  })

  test('resets a password once and accepts the new credentials', async ({ client, assert }) => {
    const role = await Rol.firstOrCreate({ name: 'client' })
    const email = `reset-${Date.now()}@example.test`
    await User.create({
      name: `Reset ${Date.now()}`,
      email,
      password: 'old-password',
      roleId: role.id,
    })

    const forgot = await client.post('/api/auth/forgot-password').json({ email })
    forgot.assertStatus(200)
    const resetToken = forgot.body().resetToken
    assert.exists(resetToken)

    const reset = await client
      .post('/api/auth/reset-password')
      .json({ token: resetToken, newPassword: 'new-password' })
    reset.assertStatus(200)
    const replay = await client
      .post('/api/auth/reset-password')
      .json({ token: resetToken, newPassword: 'another-password' })
    replay.assertStatus(400)

    const oldLogin = await client.post('/api/auth/login').json({ email, password: 'old-password' })
    oldLogin.assertStatus(401)
    const newLogin = await client.post('/api/auth/login').json({ email, password: 'new-password' })
    newLogin.assertStatus(200)
  })
})
