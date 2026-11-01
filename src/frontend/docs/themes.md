# Temas visuales

La aplicación comienza en modo oscuro. El selector del encabezado permite cambiar
entre claro y oscuro en el inicio, superadmin, cliente, empresa y conductor.
La preferencia se guarda localmente en `traveldls-theme` y se comparte entre pestañas.
Si el almacenamiento está bloqueado, el cambio sigue funcionando en la página actual.

## Componentes y colores

- `components/ui/ThemeToggle/ThemeToggle.tsx`: botón accesible reutilizable y adaptable a móvil.
- `components/ui/ThemeToggle/theme.ts`: preferencia, notificaciones y restauración antes del primer render.
- `app/theme.css`: paleta clara compartida; también alcanza modales y elementos renderizados en portales.
- Los estilos existentes usan `var(--theme-surface, COLOR_OSCURO_ORIGINAL)` y tokens equivalentes.
  El valor de respaldo conserva exactamente el color del diseño oscuro.

Para nuevas pantallas, usar los componentes globales y los tokens de superficie,
texto, bordes y estados de `theme.css`. Mantener blanco el texto sobre botones
morados sólidos. No aplicar filtros de inversión a fotografías ni a mapas.
La cartografía externa de OpenStreetMap conserva su estilo propio; los controles
del mapa de TravelDLS siguen el tema elegido.

## Verificación

`node --test tests/theme.test.mjs` comprueba la restauración, el cambio de tema,
la persistencia, el almacenamiento bloqueado y los eventos entre pestañas.
