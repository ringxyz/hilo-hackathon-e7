# Configuración de Hilo v1.0

**V1 — 19 de octubre de 2026**. Estado revisado el 15/10/2026. El registro de 0.2 se conserva abajo como antecedente.

La arquitectura vigente usa React/Vite, Worker, Supabase Auth/PostgreSQL, Anthropic y Google Calendar. Aplicar en orden todas las migraciones de `supabase/migrations/`, incluidas las de foco/avisos, coherencia horaria, completado y `20261015141657_hilo_reschedule_activity.sql`. No ejecutar los scripts SQL de pruebas como migraciones: contienen transacciones que se revierten.

Calendar se conecta en Inicio o Ajustes, con el mismo componente. Lee el calendario elegido y escribe solo en el propio de Hilo; reprogramar una cita importada modifica únicamente la copia de Hilo. La autorización real de `waikarrss@gmail.com` fue completada por el participante; se añadió ese correo como sexto usuario de prueba en Google Auth Platform. OAuth continúa en Testing, con las restricciones de renovación de tokens del proveedor.

La cuenta de evaluación, su acceso y los tres eventos ficticios importados están documentados en `docs/DEMO-JURADO.md`. Credenciales únicamente en el Google Doc técnico existente, sin claves administrativas en Git.

Captura offline: IndexedDB por propietario y clave estable de solicitud, con reintento al abrir la misma cuenta con conexión. El service worker solo conserva recursos públicos. Resto de operaciones con red. Actividades: zona IANA, instante UTC, desplazamiento y nota de retorno. Ajustes: reloj, movimiento reducido, contraste, letra e idioma.

Posponer mueve actividad y recordatorio; las ocurrencias recurrentes se separan sin alterar las futuras. El silencio se calcula en la zona de la cuenta. `hilo-push` tiene autenticación propia y secretos en Vault; la aceptación de envío no prueba recepción física. No se han verificado micrófono ni avisos con pantalla bloqueada en Android/iPhone.

Referencias vigentes: `docs/CIERRE-V1.md`, `docs/V1-VERIFICACION.md` y `docs/VERIFICACION.md`. Node.js 22.13+, `npm ci`, `npm run typecheck`, `npm test`, `npm run build`; desarrollo en dos terminales con `npm run dev:api` y `npm run dev`.

## ARCHIVO — no usar para evaluación: configuración histórica 0.2

# Configuración de Hilo 0.2

Estado comprobado el 14 de octubre de 2026.

## Supabase

Bigring, plan Free. Proyecto Hilo wpvuhkhmmrgfciphrxbp, activo, Frankfurt. URL https://wpvuhkhmmrgfciphrxbp.supabase.co. Tres migraciones aplicadas: hilo_core, hilo_reminders, hilo_hardening. Datos por usuario con RLS; colas y cuotas cerradas al cliente.

Site URL guardada: https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site
Retornos guardados:
- https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site/
- https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site/?view=ajustes&calendar=1

El propietario guardó el ID y secreto del proveedor Google. Verificación directa de /auth/v1/settings: HTTP 200, external.google=true. Mantener apagados Skip nonce checks y Allow users without an email. Sin accesos anónimos ni vinculación manual.

## Google

Proyecto hilo-511611 (894008880971), marca Hilo y contacto waikastudios@gmail.com. OAuth externo en Testing y cliente «Hilo · Web y Supabase» creados.

Callback exacto: https://wpvuhkhmmrgfciphrxbp.supabase.co/auth/v1/callback. El antiguo /api/google/callback de 0.1 ya no se usa. ID y secreto guardados en .dev.vars y como secretos de Sites, activos en la revisión de entorno 2 publicada.

Calendar API habilitada y verificada en Google Cloud. El propietario añadió cinco usuarios de prueba y aportó captura de la lista guardada. Entrada/retorno real, selección de calendario, importación y envío de una actividad sintética comprobados en producción. Calendar se solicita por separado desde Ajustes con calendar.calendarlist.readonly, calendar.events.readonly y calendar.app.created. Estos tres ámbitos y los tres básicos de identidad están declarados en Google Auth Platform. Una autorización caducada se reinicia desde Ajustes.

Sincronización manual; lectura del calendario elegido y envío explícito a un calendario secundario Hilo. Las citas importadas son de solo lectura. El envío usa ID local y ETag. Desconectar conserva los eventos remotos, elimina copias importadas y revoca acceso. Borrado remoto y excepciones complejas de series no implementados.

En Testing, los permisos adicionales pueden producir tokens de renovación de siete días. Probar reconexión y restricciones de Family Link/Workspace con cuentas reales. [OAuth oficial](https://developers.google.com/identity/protocols/oauth2).

## Anthropic y voz

ANTHROPIC_API_KEY configurada; modelo claude-sonnet-5-5 disponible en la cuenta. Prueba real con contenido ficticio: siete fichas de fracciones y cuatro fuentes. Se guardan temas y fichas, no el relato original. Cuota de 30 usos de IA por usuario/día; una generación puede incluir varias llamadas y búsquedas facturadas.

No hay transcripción de audio con Anthropic. SpeechRecognition convierte voz en texto cuando el navegador lo permite y puede utilizar su servicio. Dictado máximo de 90 segundos; texto revisable. Pruebas físicas de Android/iPhone, permiso denegado, silencio y cancelación pendientes.

## Avisos

hilo-push desplegada con autenticación propia: secreto de Cron en Vault o JWT Supabase verificado para probar avisos del usuario. VAPID está en Vault. Cron hilo-reminders activo cada minuto; respuesta HTTP 200 verificada con cola vacía. Un dispositivo Chrome registrado y dos avisos aceptados por el servicio. Recepción visual pendiente de confirmación. Respeta horario, zona horaria, revisiones y completado; deduplica por actividad/fecha. No incluye títulos en la pantalla bloqueada.

Para cada móvil: entrar, activar avisos en Ajustes, enviar prueba y programar una actividad con Recordármelo. Comprobar con app cerrada y pantalla bloqueada. Una aceptación del proveedor no demuestra recepción. iPhone requiere la PWA instalada en la pantalla de inicio. [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Piloto familiar y seguridad

Perfiles 6–12 y 13–17 requieren acompañamiento y autorización declarada del tutor. IA desactivada inicialmente. No se pide diagnóstico, colegio o fecha de nacimiento. La casilla no verifica identidad/tutela ni acredita cumplimiento legal; no se ha validado un lanzamiento general para menores.

Asesor Supabase: corregida la ejecución pública del activador de RLS. Persiste el aviso de pg_net registrado en public; sus objetos de red están en net y no admite traslado directo. No se reinstaló la extensión ni se borraron sus colas. [Aviso](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

hilo_take_ai_credit es SECURITY DEFINER invocable intencionadamente por usuarios autenticados: limita su propia cuota con auth.uid(), sin aceptar otro usuario. Límite 30 comprobado. Tablas de cola/cuotas sin políticas: cierre intencional al cliente. [Detalle del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
