# Paneles de empresa y conductor

Las rutas de Next están en `app/company` y `app/driver`. Cada layout comprueba la sesión y el rol mediante `OperationalShell`.

## Organización

- `components/Overview`: resumen y actividad reciente, calculados sobre todas las páginas de pedidos del perfil.
- `components/Orders`: pedidos de empresa y viajes del conductor, filtros, detalles y acciones según el rol.
- `components/Fleet`: administración de camiones y conductores; creación y vinculación de acceso del conductor.
- `components/Payments`: consulta de pagos de empresa mediante `components/ui/PaymentsPanel`, compartido con cliente.
- `components/Profile`: perfil de empresa o conductor mediante `components/ui/ProfileLayout`, compartido con cliente.
- `components/AssignedTruck`: vehículo asignado y reporte de mantenimiento.
- `services/operationsApi`: peticiones con cookies, validación de respuestas y lectura paginada.
- `hooks/useResource`: carga cancelable, errores y actualización de recursos.

## Componentes compartidos

`components/ui/OperationalShell` comparte navegación responsive y sesión entre ambos roles. `components/ui/ResourceTable` permite definir columnas y acciones, con scroll interno y paginación. Se reutilizan también Workspace, Select, DetailCard, DashboardStatCard, AnimatedIcon, TimedNotice y PhotoUpload.

## Contratos del backend existente

- Los pedidos se consultan con el identificador de empresa o conductor de la sesión.
- `assign-price` exige un precio para **cada carga** y espera la respuesta del cliente antes de permitir otra cotización. Si la rechaza, la empresa puede volver a cotizar o anular el pedido.
- `assign-driver` asigna al conductor a la primera carga únicamente cuando el pedido está aceptado y pagado.
- El alta de conductor crea primero su perfil. La acción Crear acceso registra la cuenta de rol conductor y la vincula; si falla la vinculación se puede reintentar dentro del mismo diálogo sin registrar otra cuenta.
- El conductor puede iniciar un pedido aceptado cuando está disponible, tiene camión activo y no tiene otro viaje en curso.
- Compartir ubicación actual envía una posición al pulsar el botón, con permiso del navegador. No mantiene seguimiento GPS en segundo plano.
- Las comprobaciones de rol y filtros del frontend complementan, pero no sustituyen, la autorización del backend.

## Verificación

`pnpm run typecheck`, `pnpm run lint` y `pnpm run test`.
Las pruebas de API utilizan respuestas simuladas y no escriben en la base de datos.
