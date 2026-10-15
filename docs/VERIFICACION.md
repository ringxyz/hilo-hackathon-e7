# Hilo v1.0 · Verificación de entrega

**V1 — 19 de octubre de 2026**. Ejecución real el **15/10/2026**, Europe/Madrid.

| Comprobación | Resultado de esta revisión |
|---|---|
| `npm run typecheck` | Correcto, código 0; cierre de la revisión 17:30:33 |
| `npm test` | Correcto, código 0; siete scripts de dominio, perfil, Worker, piloto, V1, identidad offline y completado |
| `npm run build` | Correcto, código 0; cierre de la revisión 17:30:33 |
| Cuenta con Calendar | Acceso real con contraseña Hilo, propietario correcto, estado autenticado y aislamiento de las actividades; conexión Google autorizada por el participante |
| Datos | 15 actividades, sesión pausada, 3 días, 16 fichas, 1 examen. Los tres eventos Google sustituyen equivalentes locales; cuenta histórica conservada |
| Recorrido observado | Ahora, retomar fracciones, captura íntegra «Comprar regalo para Lucía», Solo esto, pausa con nota, persistencia tras recarga y Agenda con salida 19:00 para cita 19:30 |
| Posponer | La prueba real de 10 min reprogramó actividad y aviso; ocurrencia de prueba revertida y serie restaurada. Comportamiento final documentado en CIERRE-V1 |

Salidas completas y fecha en `outputs/hackathon/v1-final/{typecheck,test,build}.log` y `checks.json`, excluidas del código servido. Las transacciones SQL con rollback y las pruebas de interfaz con adaptador sintético están identificadas por separado en `docs/CIERRE-V1.md`; no se presentan como nuevas pruebas físicas.

Audiovisual cerrado el 15/10/2026: MP4 vertical 1080×1920 y horizontal 1920×1080, ambos de 120,000 s y 30 fps, con audio de 120 s y subtítulos españoles quemados. Decodificación completa sin errores; tamaño, duración y SHA-256 registrados. Revisión visual de apertura, flujo y cierre. Son montajes de capturas reales con recortes y acercamientos; no una grabación continua del consentimiento OAuth. Google Flow generó 13 tomas con voz Algieba (Omni 1.1 Flash), incluida la corrección de la toma 07. Higgsedit realizó el montaje/exportación. La música suave es original. Subtítulos alineados al audio: 63 segmentos, 240 palabras, similitud de transcripción 0,9647. No se atribuye la voz a Dylan.

Los dos vídeos, voz aparte, guion, SRT y seis capturas reales V1 están en la carpeta compartida. [Índice y hashes](ENTREGA-V1.md). La base de datos de muestra se volvió a comprobar a las 17:30:08; la idea temporal de Lucía usada en la grabación se retiró y la base quedó en 15 actividades con sesión pausada.

Siguen pendientes micrófono físico, instalación/push con pantalla bloqueada en móviles, renovación OAuth prolongada y restricciones de cuentas supervisadas. Sin certificación WCAG ni afirmaciones clínicas. Google sigue en Testing. No se ha enviado el formulario oficial.

## ARCHIVO — no usar para evaluación: verificaciones anteriores

> Registro histórico de la primera entrega. Para el estado actualizado de las integraciones consulta HISTORIAL.md; para la revisión del 14/10/2026, consulta [PILOTO-03.md](PILOTO-03.md). Los pendientes iniciales de Google, Supabase y el motor push que figuran abajo no describen la versión actual.

# Verificación de Hilo 0.2

14 de octubre de 2026. Build de React/Vite/Worker y TypeScript correctos. Pruebas de dominio y perfil correctas. Prueba de límites del Worker: configuración pública sin secretos, autenticación obligatoria, origen cruzado rechazado y respuestas privadas sin caché.

Supabase real: tres migraciones aplicadas. Tests SQL con datos ficticios y rollback: RLS, acceso cruzado denegado, revisión obsoleta, captura idempotente, sesión al completar, cuota IA 30, restricciones de Vault, avisos debidos, deduplicación, silencio y cancelación. No quedaron cuentas QA de esa transacción.

Anthropic real: relato ficticio de fracciones, un tema identificado, siete fichas y cuatro fuentes de búsqueda. No se enviaron datos reales de un menor. La prueba no acredita todas las materias ni ausencia de errores educativos.

Recordatorios: Edge Function hilo-push v2 activa; cron cada minuto devuelve HTTP 200 con cola vacía. Un dispositivo Chrome registrado en Supabase tras conceder permiso. Dos envíos de prueba aceptados por el servicio, con confirmación visible en Ajustes. La recepción visual no ha sido confirmada por el propietario; no se ha probado aún en móvil con app cerrada.

Google Cloud: Calendar API habilitada. OAuth externo en modo de prueba, cliente web y seis ámbitos declarados guardados. Inicio de sesión real, retorno y onboarding comprobados en producción. Tras caducar un primer consentimiento, se repitió el flujo y Calendar quedó conectado con los tres permisos autorizados. Lista de calendarios y sincronización real comprobadas; dos eventos importados. Actividad sintética «Prueba Hilo · Repasar fracciones», 15/10/2026 17:00 Europe/Madrid, enviada al calendario propio Hilo; ID, ETag y estado synced persistidos. No se crearon invitaciones.

Interfaz 0.2: revisión local aislada con adaptador simulado, fuera del build. Onboarding adolescente 13 años/2.º ESO; IA bloqueada hasta autorización del adulto; confirmar temas, mostrar respuestas y fuentes, marcar conocido y agrupar para examen. Cambio a adulto y ejemplos de trabajo comprobados. Vistas de Repaso/fichas revisadas a 390×844 y 360×800, sin desbordamiento horizontal. El simulador no comprueba autenticación ni persistencia real.

Proveedor Google habilitado: comprobado mediante /auth/v1/settings, HTTP 200 y external.google=true. Cinco usuarios de prueba añadidos por el propietario, con captura de la lista guardada.

Versión 0.2 publicada en https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site. Recorrido autenticado real: perfil adulto, relato ficticio de fracciones, confirmación de temas, siete fichas con fuentes, una marcada como conocida y agrupación para examen. Todo permaneció tras recargar; conteos SQL confirmados. Se revisó visualmente la primera respuesta, no la exactitud de todas las fichas. El organizador Anthropic también propuso correctamente mañana, 17:00, 10 minutos y el primer paso, revisados antes de guardar la actividad.

Correcciones finales: aviso explícito mientras el navegador solicita permiso, errores de OAuth caducado/cancelado con retorno a Ajustes, conservación del día seleccionado al refrescar sesión y actualización del estado de permisos al volver a la pestaña. TypeScript y build correctos.

Pendientes físicos: dictado con micrófono y avisos con app cerrada/pantalla bloqueada en Android/iPhone. Pendientes de integración prolongada: renovación OAuth tras caducidad, restricciones Family Link/Workspace y conflictos externos de Calendar. Mantener estas diferencias en la presentación del hackatón.

Evidencias locales en outputs/: hilo-v02-google-onboarding.png, hilo-v02-repaso-guardado.png, hilo-v02-ficha-real.png, hilo-v02-calendar-conectado.png, hilo-v02-actividad-google.png, hilo-v02-aviso-aceptado.png y hilo-v02-publicacion.json. No contienen claves.

## Evidencia histórica de Hilo 0.1

Lo siguiente corresponde a D1 y al acceso anterior; no sustituye las pruebas Supabase de 0.2.

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
