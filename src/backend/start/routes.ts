import router from '@adonisjs/core/services/router'
import logger from '@adonisjs/core/services/logger'
import AutoSwagger from 'adonis-autoswagger'
import swaggerConfig from '#config/swagger'
import { middleware } from './kernel.js'

const UserController = () => import('#controllers/user_controller')
const RolesController = () => import('#controllers/role_controller')
const ClientsController = () => import('#controllers/client_controller')
const CompaniesController = () => import('#controllers/company_controller')
const DriversController = () => import('#controllers/driver_controller')
const CategoriesController = () => import('#controllers/category_controller')
const TrucksController = () => import('#controllers/truck_controller')
const OrdersController = () => import('#controllers/order_controller')
const DetailsOrderController = () => import('#controllers/detail_order_controller')
const AuthController = () => import('#controllers/auth_controller')
const DriverAuthController = () => import('#controllers/driver_auth_controller')
const OrderTrackingsController = () => import('#controllers/order_trackings_controller')
const PaymentsController = () => import('#controllers/payment_controller')

//Role routes
router
  .get('/api/roles', [RolesController, 'index'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin'])])
router
  .get('/api/users', [UserController, 'index'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin'])])
router
  .get('/api/users/unassigned-driver-accounts', [UserController, 'getUnassignedDriverAccounts'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin'])])

router
  .group(() => {
    router.post('/signup', [AuthController, 'signup'])
    router.post('/login', [AuthController, 'login'])
    router.post('/forgot-password', [AuthController, 'forgotPassword'])
    router.post('/reset-password', [AuthController, 'resetPassword'])
    // Logout requiere auth — el CookieAuthMiddleware ya inyecta el token automáticamente
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
    router.get('/me', [AuthController, 'me']).use(middleware.auth())
  })
  .prefix('/api/auth')

// Auth routes — Drivers
router
  .post('/api/auth/register-driver', [DriverAuthController, 'registerDriver'])
  .use([middleware.auth(), middleware.roleGuard(['company'])])

router
  .get('/api/driver/truck', [TrucksController, 'myTruck'])
  .use([middleware.auth(), middleware.roleGuard(['driver'])])
router
  .patch('/api/driver/truck/status', [TrucksController, 'reportMyTruckMaintenance'])
  .use([middleware.auth(), middleware.roleGuard(['driver'])])
//Trucks routes
router
  .group(() => {
    router.get('/', [TrucksController, 'index'])
    router.get('/:id', [TrucksController, 'show'])
    router.post('/', [TrucksController, 'store'])
    router.put('/:id', [TrucksController, 'update'])
    router.delete('/:id', [TrucksController, 'destroy'])
  })
  .prefix('/api/trucks')
  .use([middleware.auth(), middleware.roleGuard(['company'])])

// Driver routes
router
  .group(() => {
    router.get('/', [DriversController, 'index'])
    router.delete('/:id', [DriversController, 'destroy'])
  })
  .prefix('/api/drivers')
  .use([middleware.auth(), middleware.roleGuard(['company', 'platform_admin'])])

router
  .get('/api/drivers/:id', [DriversController, 'show'])
  .use([middleware.auth(), middleware.roleGuard(['driver', 'company', 'platform_admin'])])

router
  .put('/api/drivers/:id', [DriversController, 'update'])
  .use([middleware.auth(), middleware.roleGuard(['driver', 'company', 'platform_admin'])])
router
  .post('/api/drivers', [DriversController, 'store'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'driver', 'platform_admin'])])

//Register routes
router
  .post('/api/register', [UserController, 'register'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'company'])])

// User routes
router
  .get('/api/users/unassigned-company', [UserController, 'getUnassignedCompanyUsers'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'company'])])

router
  .get('/api/users/unassigned-client', [UserController, 'getUnassignedClientUsers'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin'])])

router
  .get('/api/users/unassigned-driver', [UserController, 'getUnassignedDriverUsers'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'company'])])

router
  .get('/api/users/drivers-without-user', [UserController, 'getDriversWithoutUserByCompany'])
  .use([middleware.auth(), middleware.roleGuard(['company'])])

//Client routes
router
  .group(() => {
    router.get('/', [ClientsController, 'index'])
    router.delete('/:id', [ClientsController, 'destroy'])
  })
  .prefix('/api/clients')
  .use([middleware.auth(), middleware.roleGuard(['platform_admin'])])

router
  .get('/api/clients/:id', [ClientsController, 'show'])
  .use([middleware.auth(), middleware.roleGuard(['client', 'platform_admin'])])

router
  .put('/api/clients/:id', [ClientsController, 'update'])
  .use([middleware.auth(), middleware.roleGuard(['client', 'platform_admin'])])
router
  .post('/api/clients', [ClientsController, 'store'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'client'])])

//Company routes
router
  .group(() => {
    router.delete('/:id', [CompaniesController, 'destroy'])
  })
  .prefix('/api/companies')
  .use([middleware.auth(), middleware.roleGuard(['platform_admin'])])

router
  .get('/api/companies/', [CompaniesController, 'index'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'client'])])
router
  .get('/api/companies/:id', [CompaniesController, 'show'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'client', 'company'])])

router
  .put('/api/companies/:id', [CompaniesController, 'update'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'company'])])

router
  .post('/api/companies', [CompaniesController, 'store'])
  .use([middleware.auth(), middleware.roleGuard(['platform_admin', 'company'])])

// Category routes
router
  .group(() => {
    router.get('/', [CategoriesController, 'index'])
    router.get('/:id', [CategoriesController, 'show'])
    router.post('/', [CategoriesController, 'store'])
    router.put('/:id', [CategoriesController, 'update'])
    router.delete('/:id', [CategoriesController, 'destroy'])
  })
  .prefix('/api/categories')
  .use([middleware.auth(), middleware.roleGuard(['company', 'platform_admin'])])

// Order routes
router
  .group(() => {
    router.post('/', [OrdersController, 'store'])
    router.delete('/:id', [OrdersController, 'destroy'])
  })
  .prefix('/api/orders')
  .use([middleware.auth(), middleware.roleGuard(['company', 'client'])])

router
  .get('/api/orders', [OrdersController, 'index'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'client', 'driver'])])
router
  .get('/api/orders/:id', [OrdersController, 'show'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'client', 'driver'])])
router
  .put('/api/orders/:id', [OrdersController, 'update'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'client', 'driver'])])
router
  .patch('/api/orders/:id/assign-driver', [OrdersController, 'assignDriver'])
  .use([middleware.auth(), middleware.roleGuard(['company'])])
router
  .patch('/api/orders/:id/assign-price', [OrdersController, 'assignPrice'])
  .use([middleware.auth(), middleware.roleGuard(['company'])])
router
  .patch('/api/orders/:id/respond-price', [OrdersController, 'respondPrice'])
  .use([middleware.auth(), middleware.roleGuard(['client'])])
router
  .post('/api/orders/:id/payments/simulate', [PaymentsController, 'simulate'])
  .use([middleware.auth(), middleware.roleGuard(['client'])])
router
  .get('/api/orders/:id/payment', [PaymentsController, 'showByOrder'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'client'])])
router
  .get('/api/payments', [PaymentsController, 'index'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'client'])])
router
  .patch('/api/payments/:id/cancel', [PaymentsController, 'cancel'])
  .use([middleware.auth(), middleware.roleGuard(['client'])])

// Tracking routes
router
  .post('/api/orders/:id/tracking', [OrderTrackingsController, 'store'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'driver'])])
router
  .get('/api/orders/:id/tracking', [OrderTrackingsController, 'show'])
  .use([middleware.auth(), middleware.roleGuard(['company', 'client', 'driver'])])

// Details order routes
router
  .group(() => {
    router.get('/:id', [DetailsOrderController, 'show'])
    router.put('/:id', [DetailsOrderController, 'update'])
  })
  .prefix('/api/order-details')
  .use([middleware.auth(), middleware.roleGuard(['company', 'client'])])

router
  .post('/api/order-details', [DetailsOrderController, 'store'])
  .use([middleware.auth(), middleware.roleGuard(['client'])])
router
  .delete('/api/order-details/:id', [DetailsOrderController, 'destroy'])
  .use([middleware.auth(), middleware.roleGuard(['client'])])

router.get('/', async ({ response }) => {
  return response.redirect('/docs')
})

router.get('/swagger', async ({ response }) => {
  try {
    const spec = await AutoSwagger.default.json(router.toJSON(), swaggerConfig)

    return response.json(spec)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Swagger generation error'

    logger.error({ err: error }, 'Failed to generate Swagger spec')

    return response.status(500).json({
      status: 'error',
      code: 'E_SWAGGER_SPEC_GENERATION_FAILED',
      message: 'Failed to generate Swagger OpenAPI specification',
      detail: message,
    })
  }
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swaggerConfig)
})

const DeliveriesController = () => import('#controllers/deliveries_controller')
router.get('/api/orders/:id/deliveries', [DeliveriesController, 'index']).use([middleware.auth(), middleware.roleGuard(['client', 'company', 'driver', 'platform_admin'])])
router.post('/api/orders/:id/deliveries/:detailId/report', [DeliveriesController, 'report']).use([middleware.auth(), middleware.roleGuard(['driver'])])
router.post('/api/orders/:id/deliveries/:reportId/respond', [DeliveriesController, 'respond']).use([middleware.auth(), middleware.roleGuard(['client'])])
router.post('/api/orders/:id/deliveries/:reportId/resolve', [DeliveriesController, 'resolve']).use([middleware.auth(), middleware.roleGuard(['platform_admin'])])
router.get('/api/deliveries/review', [DeliveriesController, 'review']).use([middleware.auth(), middleware.roleGuard(['platform_admin'])])

router.get('/api/deliveries/pending', [DeliveriesController, 'pending']).use([middleware.auth(), middleware.roleGuard(['client'])])
