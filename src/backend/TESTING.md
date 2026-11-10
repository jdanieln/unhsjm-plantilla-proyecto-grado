# Pruebas del backend

## Preparación

1. Copia `.env.test.example` como `.env.test`.
2. Ajusta `DB_USER` y `DB_PASSWORD` a las credenciales de tu instalación local de PostgreSQL.
3. Crea la base de datos `traveldls_test` desde DBeaver.
4. Instala dependencias con `pnpm install` dentro de `src/backend`.

Las pruebas ejecutan las migraciones automáticamente y truncan todas las tablas al finalizar,
incluso cuando un caso falla. El esquema queda disponible, pero sin datos de prueba.
La base de datos de pruebas debe ser independiente de la base de datos de desarrollo.
El arranque rechaza cualquier base cuyo nombre no termine en `_test`.

## Ejecución

```bash
pnpm test
pnpm test -- --suite=unit
pnpm test -- --suite=functional
pnpm typecheck
```

La suite unitaria verifica reglas de entrega, cifrado, validación de imágenes y cálculos de pagos.
La suite funcional levanta AdonisJS y verifica autenticación, categorías, clientes, empresas,
conductores, camiones, pedidos, cargas, seguimiento, validaciones de pagos y entregas, y permisos.

Las integraciones reales con Cloudinary no se ejecutan: se valida el archivo antes de subirlo.
Los pagos incluyen una transferencia simulada y rechazo del pago duplicado. La confirmación
completa de entregas y las variantes de pagos con tarjeta aún requieren casos adicionales.
