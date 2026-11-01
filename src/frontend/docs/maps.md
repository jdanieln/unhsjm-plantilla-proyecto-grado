# Mapas y seguimiento de pedidos

## Implementación actual

- El cliente usa `TrackingMap` con OpenStreetMap incrustado. El conductor usa `NavigationMap` con Leaflet y teselas de OpenStreetMap para dibujar una ruta sobre el mapa. Ninguna vista requiere clave de mapas.
- El conductor abre **Mis viajes → Ver detalles → Abrir mapa GPS** y pulsa **Iniciar GPS**. El navegador solicita permiso de ubicación. Se envía un punto al backend como máximo cada 15 segundos; **Detener GPS** o cerrar la vista detiene la captura.
- La vista de navegación del conductor usa Leaflet sobre teselas de OpenStreetMap. Muestra posición, orientación, destino, velocidad y precisión del GPS cuando el dispositivo proporciona esos datos. El conductor marca el punto de entrega sobre el mapa; solo entonces se solicita una ruta por carretera y se dibuja en morado. La ubicación de entrega marcada dura solo mientras la vista está abierta y no modifica la dirección original del pedido.
- Si el conductor se desplaza al menos 150 m, la ruta se recalcula como máximo una vez por minuto. También puede pulsar «Recalcular ruta». Sin destino marcado, GPS o respuesta válida del servicio, no se dibuja una ruta ficticia. Las distancias y tiempos son estimaciones del servicio de rutas; no son instrucciones giro a giro.
- El cliente abre **Mis pedidos → Ver detalles → Ver mapa del pedido**. La vista consulta `GET /api/orders/:id/tracking` cada 15 segundos mientras está visible. Una respuesta 404 indica que el conductor aún no ha compartido un punto.
- `POST /api/orders/:id/tracking` solo acepta ubicaciones para viajes en tránsito y verifica que la cuenta pertenezca al pedido. El backend almacena la última posición, no el historial. El GPS requiere `localhost` o HTTPS y autorización del navegador.
- El campo de entrega existente es texto libre. Por eso el conductor debe marcar el punto en el mapa para obtener una ruta real. El mapa del cliente continúa mostrando la posición reportada; todavía no muestra el recorrido previsto.

## Servicio de rutas actual

En desarrollo se consulta el servidor público de demostración de OSRM al marcar el destino. Es para pruebas puntuales y uso no comercial, sin garantía de disponibilidad; no se debe usar como infraestructura de producción. En producción se requiere `NEXT_PUBLIC_ROUTING_API_URL` apuntando a un servicio OSRM propio o contratado. La aplicación no consulta rutas al cliente ni sin una selección explícita del destino. Las coordenadas del conductor y del destino se comparten con el servicio de rutas configurado cuando se solicita el trazado.

## Integración futura con Mapbox

1. Definir cómo se obtendrán y validarán las coordenadas de recogida y entrega. Guardarlas junto a cada carga; no depender de geocodificar texto libre cada vez que se abra el mapa.
2. Crear un token público de Mapbox restringido al dominio del frontend y configurar `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` en el entorno. No colocar tokens secretos en código cliente.
3. Añadir el SDK elegido y adaptar las vistas `TrackingMap` y `NavigationMap`. Mantener los flujos de GPS y la autorización del endpoint independientes del proveedor visual.
4. Conectar el futuro módulo de optimización de rutas a geometrías y puntos de parada reales. El conductor verá la ruta planificada y el cliente la posición del vehículo sobre esa ruta. Evaluar límites y costos de las APIs de mapas y navegación antes de activarlas.
5. Si se necesita historial del trayecto o actualización instantánea, añadir almacenamiento de puntos y un canal de eventos (SSE o WebSocket) en lugar de aumentar indefinidamente la frecuencia de consultas.
