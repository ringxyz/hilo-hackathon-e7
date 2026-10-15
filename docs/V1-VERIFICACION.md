# Hilo V1 · Registro de verificación

15 de octubre de 2026. React + Vite + TypeScript + Tailwind, Worker y Supabase. Las referencias aportadas se aplicaron a la jerarquía y distribución; se conservaron el logotipo, la paleta y las mascotas de Hilo.

## Cambios entregados

- Entrada principal «Entrar a Hilo», acceso existente plegado y primera pantalla en Inicio.
- Inicio con perfil resumido, punto de regreso protagonista, Google Calendar, Hoy limitado a tres actividades, Después limitado a dos ideas y repaso. Captura flotante en las vistas ordinarias.
- Componente único de Calendar en Inicio y Ajustes, selección del calendario, estado/correo, última sincronización, prueba, reconexión y opción de posponer la conexión. Se conserva la lectura del calendario seleccionado y la escritura en el secundario de Hilo.
- «Solo esto» retira la navegación. Presenta actividad, siguiente paso editable, tiempo restante, ocultar reloj, pausa con nota, guardar idea y salida a Ahora.
- Pausa breve y persistente: nota de retorno separada del texto original de captura. Retomar conserva tiempo acumulado, actividad y paso.
- Guardado directo sin IA, con texto íntegro hasta 6.000 caracteres. La revisión con Anthropic sigue siendo opcional y exige revisión antes de guardar.
- Cola IndexedDB por cuenta, identificadores de solicitud estables y eliminación local solo después de confirmación del servidor. Se comprueba la identidad inmediatamente antes del envío; cambiar de cuenta no transmite ideas del propietario anterior.
- Captura en la página sin conexión. El service worker conserva solo recursos públicos y no cachea respuestas de API, actividades, fichas ni sesiones.
- Citas con desplazamiento predeterminado de 30 minutos y opciones 0/15/30/45/60/personalizado. Aviso de salida separado del aviso de cita.
- Posponer 10 minutos, una hora o mañana sin cambiar la hora de la cita. «Estoy en ello» inicia foco y detiene los avisos de esa ocurrencia. Los avisos caducados o silenciados siguen disponibles dentro de Hilo.
- Editor ordenado, 20 minutos y fecha de hoy por defecto, notas plegadas, eliminación con confirmación y activación de avisos dentro del formulario.
- Reducción de movimiento propia y del sistema, contraste alto y tres tamaños de letra. Repaso por lotes de 5, 10 o todas, una ficha por pantalla.
- Instante UTC y zona IANA para actividades con hora; fecha local para día completo. Se conserva la hora local de las recurrencias.
- Español/inglés, privacidad, aviso legal, ausencia de seguimiento, invitaciones por WhatsApp, PWA y metadatos de prueba sin indexación conservados.

## Pruebas ejecutadas

| Capa | Resultado observado |
|---|---|
| TypeScript | `npm run typecheck` sin errores. |
| Pruebas automáticas | `npm test` correcto: dominio, perfil, límites del Worker, piloto, V1 e identidad de la cola. |
| Compilación | `npm run build` correcto. Estudio y cliente Supabase separados; archivos estáticos anteriores limpiados al compilar. |
| Supabase, transacción revertida | `scripts/test-v1-database.sql`: una captura tras dos solicitudes iguales; texto, siguiente paso, nota y tiempo conservados; 10 min/1 h/mañana correctos; cita original sin desplazarse; foco iniciado y avisos detenidos; funciones de otra cuenta rechazadas. |
| Cola real de recordatorios | `scripts/test-v1-queue.sql`: dos tipos distintos, diferencia exacta de 30 min; viaje cambiado a 45 min regenera trabajos con revisión actual; dos ejecuciones no duplican trabajos; aviso caducado conservado; silencio a las 22:00 y 07:59, permitido a las 08:00. No se invocó el envío push en estas pruebas. |
| Horario Madrid | 24/10/2026 09:00 → 07:00 UTC; 25/10/2026 09:00 → 08:00 UTC. En la hora repetida 02:30 se usa la ocurrencia posterior, coherente con PostgreSQL. Una hora inexistente de marzo se rechaza. También se comprueba salida antes de medianoche. |
| Navegador, muestra local aislada | Captura → pausa con nota → recarga → retomar conserva contexto. Solo esto sin navegación y ocultación del reloj. Captura sin IA; fallo de transporte simulado, recarga y reintento producen una única idea. El formulario público sin conexión también conserva y sincroniza una idea. |
| Repaso | Lote inicial «1 / 5», una pregunta a la vez y respuesta oculta hasta solicitarla. |
| Responsive | Inicio, Ajustes y editor revisados a 320 px con letra grande/contraste alto; sin desbordamiento horizontal. Inicio y Solo esto revisados a 390 × 844; también escritorio. |
| Accesibilidad | Controles principales de Inicio medidos con mínimo 44 px; etiquetas y diálogos nativos, Escape y foco visible. Tamaños de letra aplicados a la raíz y tipografía en rem. Color secundario medido en el DOM y calculado: 6,88:1 sobre blanco, 4,71:1 sobre lavanda, ≥5,16:1 en los otros pasteles. No equivale a una certificación WCAG completa. |

La muestra local usa un adaptador de API exclusivamente en `outputs/`, excluido del build. Las pruebas de navegador acreditan interacción y presentación; las transacciones reales de Supabase acreditan persistencia/RLS. No se presentan como una única prueba integral de OAuth, Worker y dispositivo físico.

## Conservación de Alex · Demo

Antes y después de las migraciones: **15 actividades, sesión pausada, 3 días, 16 fichas y 1 examen**. No se recreó la cuenta ni se editaron sus contenidos para las pruebas.

Las actividades existentes solo recibieron metadatos compatibles de zona, instante y desplazamiento. Huellas comparables excluyendo esos tres campos nuevos:

- Actividades: `20a5bf7a3cfd99870cfbbd0300e39df7`.
- Sesión: `9ccf9877a63cfa658a45950a301b11d3`.
- Estudio: `9e085b8e8f66f2a66ad945b67184cf89`.

## Base de datos y seguridad

Migraciones aditivas `20261015092612_hilo_v1_focus_reminders.sql` y `20261015095541_hilo_v1_schedule_consistency.sql` aplicadas. Las funciones privilegiadas se alojan en esquema privado con envoltorios de acceso y comprobación de propietario. Se mantienen RLS, cuotas de IA, validación, deduplicación, tokens cifrados y secretos de servidor.

La función `hilo-push` versión 5 está activa. Conserva su autenticación propia: secreto de cron en Vault o JWT de usuario validado, aunque la comprobación JWT de la puerta de enlace esté desactivada para el cron.

El asesor de Supabase conserva dos avisos previos: extensión `pg_net` en esquema público y protección de contraseñas filtradas desactivada. Las cinco tablas de servicio con RLS sin políticas son intencionales: el cliente autenticado no puede consultarlas directamente. Referencias: [extensión en esquema público](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Pendiente de validación física o prolongada

- Instalación PWA y avisos con la aplicación cerrada/pantalla bloqueada en Android y iPhone. No se afirma entrega física por haber aceptado un envío el servidor.
- Dictado con micrófono en ambos móviles y recuperación tras pérdida real de cobertura. En esta revisión se verificó fallo de transporte simulado y captura offline del navegador, no modo avión en teléfono.
- Renovación de OAuth tras caducidad y escenarios prolongados de conflictos de Calendar. La conexión existente se conserva; no se vuelve a conceder permisos como parte de las pruebas sintéticas.
- Revisión humana de exactitud educativa de fichas, restricciones de Family Link/Workspace y recorrido del jurado desde un dispositivo ajeno.
- Entrega formal de documentos, historial de prompts y vídeo del hackatón. Publicar esta V1 no equivale a enviar la candidatura.

Las evidencias visuales y resultados de despliegue se guardan en `outputs/` local, fuera del repositorio y del paquete servido.

## Ajuste de avisos: «Listo» · 15 de octubre

El diálogo de avisos permite marcar la actividad como terminada sin iniciar foco. La operación es transaccional e idempotente: completa solo la ocurrencia elegida cuando hay repetición, resuelve el aviso de la cita y el de salida, y conserva intactas las siguientes fechas. En citas importadas, el estado terminado es local de Hilo y se conserva al sincronizar; no se modifica el evento de Google.

`scripts/test-reminder-done.sql` ejecutado en Supabase con rollback: cita de ayer completada, ambos avisos resueltos, reintentos sin reapertura, repetición futura pendiente, foco de hoy conservado y acceso cruzado denegado. `scripts/test-reminder-done.mjs` comprueba la sincronización de Google con respuestas sintéticas y ninguna escritura al calendario externo. Los avisos previos del asesor de seguridad no cambian.
