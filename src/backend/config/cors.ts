import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

const localOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
]
const frontendUrl = env.get('FRONTEND_URL')
const allowedOrigins = frontendUrl ? [...localOrigins, frontendUrl] : localOrigins

const corsConfig = defineConfig({
  enabled: true,
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
