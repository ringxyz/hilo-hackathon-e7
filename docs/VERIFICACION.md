# Verificación de Hilo 0.1

Fecha: 14 de octubre de 2026. Entorno: Windows, Node 22.16, D1 local y navegador integrado de Codex. Datos inventados.

## Comprobaciones ejecutadas

- TypeScript: sin errores.
- Build: Vite SPA + Worker generado correctamente.
- Dominio: captura de varios pendientes, horas ambiguas, mañana relativo a zona horaria, año nuevo, repeticiones semanales, estado por fecha, pausa y transición Europe/Madrid del 25 de octubre de 2026.
- API: 37 aserciones correctas. Persistencia, ausencia de identidad (401), acceso cruzado (404), edición obsoleta (409), validación (400), reintento idempotente, sesión, idea sin perder actividad, pausa/retorno incluso al cambiar de tarea, completar/deshacer, Google no configurado, borrado y origen cruzado (403).
- Navegador: ejemplos cargados; tarea iniciada; idea guardada y retorno al mismo paso; pausa con nota; recarga con recuperación; captura de tres pendientes; hora ambigua bloquea guardar; hora explícita permite guardar; resultado visible en Mañana.
- Diseño: inspección visible en móvil a 390×844 y 360×800, y escritorio a 1280×800; sin desbordamiento horizontal en las vistas comprobadas. Capturas locales en `outputs/hilo-ahora-desktop.jpg` y `outputs/hilo-agenda-mobile.jpg`. La revisión responsive no equivale a una prueba de dispositivos físicos.
- Persistencia adicional: se reiniciaron los procesos locales durante la sesión; la actividad y el estado guardado se recuperaron de D1.

## Matriz frente al PRD

| Requisito | Estado de esta versión | Límite |
|---|---|---|
| RF-001 Acceso | Parcial | Acceso privado con Sites e identidad aislada; no alta pública ni cuenta externa de jurado |
| RF-002 Captura | Texto verificado; voz preparada | Dictado depende del navegador; adaptador servidor sin clave ni prueba de audio real |
| RF-003 Revisión | Base verificada | Parser determinista acotado; no extracción semántica general con IA |
| RF-004 Plan | Base implementada | Ahora, Hoy, Mañana y tareas; no planificador automático de huecos |
| RF-005 Sesión y retorno | Recorrido principal verificado | Una sesión por persona, nota persistida, reloj opcional; no prueba móvil física |
| RF-006 Guardar idea | Verificado en API y navegador | Conserva tarea, siguiente paso y sesión |
| RF-007 Avisos | Pendiente | Sin cola, suscripciones ni motor de envío; ningún aviso real declarado |
| RF-008 Repeticiones | Parcial | Diaria/semanal/anual simple y completado por fecha; sin editar solo una ocurrencia ni regla especial del 29 de febrero |
| RF-009 Google | Adaptador preparado | Sin credenciales, autorización ni verificación real; sincronización manual y alcance parcial de series/conflictos |
| RF-010 Cambios | Base verificada | Editar, completar, deshacer, borrar y revisar versiones; no invalidación de avisos porque no existe motor |
| RF-011 Mañana | Captura reutilizada | Prepara pendientes para mañana; sin recordatorio nocturno ni arrastre selectivo de pendientes existentes |
| RNF-001/002 | Parcial verificado | Autorización por dueño, validación, claves en servidor, no cachear API privada; falta auditoría de producción |
| RNF-003 | Revisión visual parcial | Foco, controles etiquetados y responsive; no certificación WCAG ni prueba exhaustiva al 200 % |
| RNF-004 | Pendiente | No ensayo físico con 100 tareas y red móvil |
| RNF-005 | Pendiente | Motor de trabajos todavía no implementado |
| RNF-006 | Base verificada | Borrado de datos propios; eventos remotos de Google permanecen según aviso |
| RNF-007 | Preparado | Micrófono se cierra en el cliente; audio no se persiste en Hilo; proveedor sin activar |
| RNF-008 | Parcial | Errores seguros; sin trazas de recepción de avisos ni ensayos Google |
| RNF-009 | Demo acotada | Datos sintéticos, acceso privado; PEN-008 sigue pendiente |

Esta entrega es una primera versión funcional. No acredita el MVP completo del hackatón, la eficacia clínica ni el lanzamiento con datos reales de menores.
