# Código Fuente de TravelDLS

Esta carpeta contiene el código fuente del sistema TravelDLS. Actualmente, la aplicación está organizada de la siguiente manera:

```text
src/
├── backend/                 # API y lógica del servidor
│   ├── app/
│   │   ├── controllers/     # Controladores HTTP
│   │   ├── enums/           # Enumeraciones del dominio
│   │   ├── middleware/      # Middleware de autenticación y seguridad
│   │   ├── models/          # Modelos y relaciones de base de datos
│   │   ├── services/        # Lógica de negocio
│   │   └── validators/      # Validación de datos de entrada
│   ├── config/              # Configuración de AdonisJS
│   ├── database/
│   │   ├── migrations/      # Estructura y cambios de la base de datos
│   │   └── seeders/         # Datos iniciales
│   ├── start/               # Rutas y configuración de inicio
│   ├── tests/               # Pruebas automatizadas
│   ├── package.json         # Dependencias y scripts del backend
│   ├── adonisrc.ts          # Configuración principal de AdonisJS
│   └── .env.example         # Variables de entorno de referencia
├── frontend/                # Aplicación web con Next.js, App Router y TypeScript
│   ├── src/app/             # Rutas, layout y estilos iniciales
│   ├── package.json         # Dependencias y scripts del frontend
│   └── README.md            # Comandos y convenciones de organización
└── README.md                # Esta guía
```

## Backend

El backend está desarrollado con **AdonisJS**, **TypeScript**, **Lucid ORM** y **PostgreSQL**. La carpeta `src/backend` es la raíz de la aplicación AdonisJS.

Para instalar las dependencias y ejecutar el backend:

```bash
cd src/backend
pnpm install
pnpm dev
```

Comandos útiles:

```bash
pnpm typecheck    # Comprueba los tipos de TypeScript
pnpm test         # Ejecuta las pruebas
pnpm build        # Genera la compilación de producción
```

Las variables de entorno deben configurarse copiando `src/backend/.env.example` como `.env`. El archivo `.env` puede contener credenciales y no debe subirse al repositorio.

## Frontend

La base del frontend está en `src/frontend/`, con dependencias y configuración independientes del backend.

```bash
cd src/frontend
pnpm install --frozen-lockfile
pnpm dev
```

La página inicial está disponible en http://localhost:3000. Consulta [la guía del frontend](frontend/README.md) para localizar componentes, organizar futuros módulos y ejecutar las validaciones.

Las dependencias instaladas, archivos compilados y temporales deben mantenerse fuera del control de versiones mediante los archivos `.gitignore` correspondientes.
