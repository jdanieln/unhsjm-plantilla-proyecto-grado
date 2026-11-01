# Confirmación de entregas

Aplicar `node ace migration:run` antes de desplegar el frontend. La migración conserva los pedidos históricos entregados como cargas confirmadas y completa las asignaciones antiguas cuando había un único conductor por pedido.

Cada carga mantiene `delivery_status`. Los intentos se guardan en `delivery_reports`; nunca se sobrescribe un intento al reprogramar. El cliente propietario responde una sola vez. Solo el superadmin resuelve disputas o reportes pendientes de más de 48 horas. Los 48 h se calculan al consultar la bandeja de revisión, sin confirmar automáticamente.

## API
- GET /api/orders/:id/deliveries: cargas e historial autorizado por propietario/rol.
- POST /api/orders/:id/deliveries/:detailId/report: conductor asignado; multipart con note opcional (500 caracteres) y photo opcional (máximo 2 MB).
- POST /api/orders/:id/deliveries/:reportId/respond: cliente propietario; { confirmed: boolean, reason?: string }.
- POST /api/orders/:id/deliveries/:reportId/resolve: superadmin; mismo cuerpo, motivo obligatorio (10–500 caracteres). false solicita nueva entrega.
- GET /api/deliveries/review: bandeja del superadmin, incluye disputas y reportes sin respuesta durante 48 h.

El endpoint genérico del pedido solo permite al conductor iniciar su viaje y a la empresa anular pedidos elegibles. La entrega se calcula en transacciones con bloqueo del pedido. Una nueva asignación espera a que terminen las cargas que siguen en tránsito. El conductor queda disponible al reportar todas sus cargas, no depende de la respuesta del cliente.

## Fotografías
Cloudinary guarda los archivos; PostgreSQL guarda referencias. Confirmar o resolver retira inmediatamente la URL y marca el borrado pendiente en la misma transacción. El borrado solicita invalidación de caché y considera exitoso un archivo ya inexistente. Los fallos conservan el identificador y se reintentan en una hora. Un proveedor del proceso web revisa la cola cada minuto; debe reiniciarse el backend después del despliegue. Las fotos de disputas permanecen hasta su resolución. También se encolan los archivos subidos si falla el guardado del reporte. Los errores de borrado se registran en logs; no revierten una confirmación ya guardada.

## Verificación sin borrar datos
`node scripts/check_deliveries.mjs` usa perfiles de prueba ya existentes en la base configurada y una transacción global con rollback. Las operaciones de Cloudinary se simulan: no sube ni elimina archivos. No usar el runner general contra la base de desarrollo: su teardown actual trunca tablas.

No se generan correos ni notificaciones push. Las pantallas consultan cada 60 s estando visibles y conectadas. Los pagos no se modifican por una confirmación o disputa.
