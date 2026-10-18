# Configuración de Hilo v1.0

**V1 — 19 de octubre de 2026**. Estado revisado el 18–19/10/2026, Europe/Madrid. El registro de 0.2 se conserva abajo como antecedente.

La arquitectura vigente usa React/Vite, Worker, Supabase Auth/PostgreSQL, Anthropic y Google Calendar. Aplicar en orden todas las migraciones de `supabase/migrations/`, incluidas las posteriores al 15/10 para Inicio limpio, alta privada, energía/micro-pasos y revisión de propuestas. En entornos nuevos hay que configurar de forma privada la lista de correos y el hook de alta; véase INICIO-LIMPIO-V1.md. El acceso de la cuenta de evaluación ya existente sigue disponible por contraseña Hilo. No ejecutar los scripts SQL de pruebas como migraciones: contienen transacciones que se revierten.

Calendar se conecta en el onboarding opcional o en Ajustes. Inicio mantiene una sola acción principal y un punto de regreso compacto. Lee el calendario elegido y escribe solo en el propio de Hilo; reprogramar una cita importada modifica únicamente la copia de Hilo. La autorización real de `waikarrss@gmail.com` fue completada por el participante; se añadió ese correo como sexto usuario de prueba en Google Auth Platform. OAuth continúa en Testing, con las restricciones de renovación de tokens del proveedor.

La cuenta de evaluación, su acceso y los tres eventos ficticios importados están documentados en `docs/DEMO-JURADO.md`. Credenciales únicamente en el Google Doc técnico existente, sin claves administrativas en Git.

Captura offline: IndexedDB por propietario y clave estable de solicitud, con reintento al abrir la misma cuenta con conexión. El service worker solo conserva recursos públicos. Resto de operaciones con red. Actividades: zona IANA, instante UTC, desplazamiento y nota de retorno. Ajustes: reloj, movimiento reducido, contraste, letra e idioma.

Reprogramar muestra el destino y requiere confirmación. En citas futuras suma a la hora prevista; en las pasadas, al momento actual. Mueve actividad y recordatorio; las ocurrencias recurrentes se separan sin alterar las futuras. El silencio se calcula en la zona de la cuenta. `hilo-push` tiene autenticación propia y secretos en Vault; la aceptación de envío no prueba recepción física. No se han verificado micrófono ni avisos con pantalla bloqueada en Android/iPhone.

Referencias vigentes: `docs/CIERRE-V1.md`, `docs/V1-VERIFICACION.md`, `docs/VERIFICACION.md` y `docs/ENTREGA-V1.md`. Node.js 22.13+, `npm ci`, `npm run typecheck`, `npm test`, `npm run build`; desarrollo en dos terminales con `npm run dev:api` y `npm run dev`.

El montaje de entrega no requiere claves de Flow ni Higgsfield para ejecutar Hilo. La demo final usa capturas reales y voz de Google Flow (Algieba), montadas con Higgsedit. Los MP4, el guion y las capturas están enlazados en `docs/ENTREGA-V1.md`. No se incorporan voces, credenciales ni archivos privados al código servido. Las tres comprobaciones del repositorio terminaron con código 0 el 19/10/2026 a las 00:20:59 Europe/Madrid (17 scripts de pruebas). El dictado vigente admite tres minutos y recupera segmentos; el límite de 90 segundos que figura en el archivo histórico no describe esta versión. Los borradores de captura se conservan por cuenta y modo; cerrar pide una decisión explícita.

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


Última corrección incorporada: «Continuar» conserva el borrador hasta guardar o descartar (19/10). Publicación Sites 27, fuente `2a97bc369473bb9f388e4ba64ba86ddc8516ff29`; su código funcional coincide con `2b6283573303d294e97d2ef730fbdaa253507fb2`. La comparación de árboles solo difiere en archivos de documentación/entrega. TypeScript, 17 scripts y build se repitieron correctamente el 19/10, 00:20:39–00:20:59 Europe/Madrid.
