# Frontend de TravelDLS

Frontend con Next.js, App Router, TypeScript estricto y CSS Modules. Incluye una
pantalla de bienvenida responsive con inicio de sesión y registro conectados al
API AdonisJS mediante una cookie httpOnly.

El registro público crea únicamente cuentas de cliente. El inicio de sesión
reconoce los roles `platform_admin`, `client`, `driver` y `company`, confirma la
sesión mediante `GET /api/auth/me` y puede redirigir al panel correspondiente.

## Ejecutar

Requisitos: Node.js 22.13 o superior y pnpm 10.28.2 (versión usada en el proyecto).
Desde la raíz del repositorio:

```bash
cd src/frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abre http://localhost:3000. Detén el servidor con `Ctrl+C`.

El backend debe estar disponible en http://localhost:3333. Copia `.env.example`
como `.env.local` para cambiar el API o configurar el frontend que contiene los
paneles de cada rol:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:4200
```

El superadmin siempre entra al panel de Next en `/admin/dashboard`.
Para los demás roles, si `NEXT_PUBLIC_DASHBOARD_URL` no está definida, el acceso
se completa y se muestra el rol autenticado sin navegar a una ruta inexistente.

```bash
pnpm lint       # ESLint: reglas de Next.js y TypeScript
pnpm test       # Contratos del cliente administrativo, sin tocar la base de datos
pnpm typecheck  # Genera tipos de rutas y comprueba TypeScript
pnpm build     # Compilación de producción
pnpm start     # Sirve la compilación en localhost:3000, después de build
```

## Dónde encontrar el código

`src/frontend` es la raíz del proyecto Next.js; su carpeta `src` contiene el
código. El alias `@/` apunta a `src/frontend/src`.

```text
src/frontend/
├── public/images/      # Logo, camión y emblema originales de TravelDLS
├── src/
│   ├── app/
│   │   ├── layout.tsx  # Layout raíz, idioma y metadatos
│   │   ├── page.tsx    # Compone la pantalla principal
│   │   └── globals.css
│   ├── components/ui/Icon/Icon.tsx
│   └── features/auth/
│       ├── components/    # Pantalla, formularios y soporte
│       ├── services/      # Cliente del API de autenticación
│       ├── types/         # Sesión y cuatro roles permitidos
│       └── utils/         # Destinos y nombres visibles por rol
├── eslint.config.mjs
├── next.config.mjs      # Raíz explícita del frontend para Turbopack
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
└── README.md
```

Guía de organización; crea las carpetas adicionales cuando sean necesarias:

| Ubicación dentro de `src/` | Contenido |
| --- | --- |
| `app/` | Rutas, layouts y archivos especiales de Next.js. |
| `components/ui/` | Elementos genéricos compartidos, por ejemplo `Button/Button.tsx`. |
| `components/layout/` | Navegación compartida, por ejemplo `Header/Header.tsx`. |
| `features/<nombre-modulo>/` | Componentes, hooks, servicios y tipos de una funcionalidad. |
| `hooks/` | Hooks compartidos entre módulos. |
| `lib/` | Configuración, utilidades y cliente HTTP compartido. |
| `types/` | Tipos utilizados por distintos módulos. |
| `constants/` | Constantes compartidas. |

Los recursos estáticos están en `public/images/`, fuera de `src/`. Los estilos
de cada componente están junto a su archivo, en CSS Modules. El logo se adapta
al fondo oscuro mediante CSS; los archivos de imagen originales se conservan.
No se mantienen carpetas vacías.

## Administración

Las rutas `/admin` y `/admin/[section]` usan el módulo `src/features/admin/`:

- `components/`: contenedor con sesión y navegación, resumen, listados, formulario y modal reutilizables.
- `config/modules.ts`: campos, columnas, etiquetas y opciones de cada recurso.
- `services/adminApi.ts`: peticiones con cookies, errores, cancelación y paginación.
- `types/`: contratos de los recursos y sus formularios.
- `styles/Admin.module.css`: estilos compartidos exclusivos del panel.

Paneles disponibles: vista general, empresas, clientes, conductores, tipos de
camión y usuarios. Las empresas, clientes, conductores y tipos de camión tienen
creación, consulta, edición y eliminación lógica. Usuarios permite listar y crear cuentas;
el backend actual no ofrece edición ni eliminación de usuarios. Los roles se
consultan mediante `/api/roles`, sin depender de IDs fijos.

Los tipos de camión son el catálogo que las empresas verán al registrar su flota:
por ejemplo, refrigerado, rastra o plataforma. El superadmin administra ese
catálogo desde Tipos de camión; las placas, chasis, conductores y estados de los
vehículos reales pertenecen al panel de cada empresa.

Para dar acceso a una empresa o conductor, crea primero su cuenta en Usuarios con
el rol correspondiente y después vincúlala desde su formulario de perfil. Los
camiones reales se gestionan desde la cuenta de empresa.
El registro público continúa creando clientes.

El panel requiere el backend disponible en `NEXT_PUBLIC_API_URL` y una sesión de
`platform_admin`. La UI comprueba la sesión y las rutas del backend verifican los
permisos. Una respuesta 401 devuelve al inicio; los errores de red ofrecen reintento.
El resumen usa datos del API; no hay registros de demostración en la aplicación.

El menú se convierte en un panel desplegable en móvil. Las tablas amplias tienen
desplazamiento dentro de su contenedor y los formularios pasan a una columna.
Los modales gestionan foco, Escape, confirmación de eliminación y estado de envío.
La cabecera permanece visible al desplazar el dashboard. En los listados, las
filas tienen scroll interno y la búsqueda y paginación quedan visibles. El selector
permite 10, 25, 50 o 100 registros y vuelve a la primera página al cambiarlo.
Los desplegables comparten `components/ui/Select`, con opciones moradas, manejo de
teclado y validación de campos obligatorios. Las animaciones de iconos y tarjetas
respetan la preferencia de movimiento reducido del sistema.

## Mapas

El seguimiento del cliente y el GPS del conductor usan OpenStreetMap. El flujo
actual y la futura integración de Mapbox están descritos en [docs/maps.md](docs/maps.md).

## Convenciones de código

- Nombres en inglés: componentes y archivos en PascalCase, hooks en camelCase
  con prefijo `use`, rutas y módulos en kebab-case.
- Mantener los nombres especiales `page.tsx` y `layout.tsx`; evitar `index.tsx`
  y reexportaciones innecesarias.
- Componentes de servidor por defecto. Agregar `"use client"` solo cuando haga
  falta interactividad o APIs del navegador. Tipar explícitamente las props.
- CSS Modules junto al componente; estilos compartidos en `globals.css`.
- Ubicar el código exclusivo de una funcionalidad en su módulo. Extraer elementos
  a carpetas compartidas cuando realmente se reutilicen.
- Al conectar datos, revisar los contratos de `../backend`, separar servicios de
  presentación y manejar carga, errores y estados vacíos.
- Mantener secretos en el servidor. Las variables `NEXT_PUBLIC_*` son públicas.

Cada aplicación tiene sus propias dependencias y lockfile. Los archivos generados
(`.next/`, `next-env.d.ts`, `*.tsbuildinfo`) se ignoran en Git.

La instalación con ESLint 10 puede mostrar avisos de peer dependencies de los
plugins incluidos en `eslint-config-next`, cuyos rangos aún declaran ESLint 9.
Next.js documenta esta situación; comprueba su funcionamiento con `pnpm lint`.

Referencia: [documentación de instalación de Next.js](https://nextjs.org/docs/app/getting-started/installation).
