# Configuración pendiente de Hilo

14 de octubre de 2026. Primera versión privada con datos ficticios.

## Google Calendar

El usuario confirmó que todavía no dispone de proyecto OAuth. El código de autorización, cifrado de tokens, selección de calendario, lectura paginada y envío explícito de eventos está preparado, pero no se ha probado contra una cuenta real.

1. Crear un proyecto de Google Cloud y activar Google Calendar API.
2. Configurar la pantalla de consentimiento y una cuenta de prueba con datos sintéticos. No usar calendarios familiares ni escolares reales para esta demostración.
3. Crear un cliente OAuth de aplicación web. URI de redirección exacta: `https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site/api/google/callback`.
4. Configurar como secretos de servidor `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `TOKEN_ENCRYPTION_KEY`. Esta última es una clave aleatoria de 32 bytes, codificada en base64. No enviarla por chat ni guardarla en el repositorio.
5. Configurar `SITE_URL` con el origen de publicación. Desplegar la nueva revisión de entorno.
6. En Hilo → Ajustes → Conectar Google, conceder permisos y elegir un calendario de lectura.
7. Probar con una cita sintética: lectura, creación en el calendario Hilo, cambio con ETag, autorización revocada y reconexión. El envío a Google es explícito desde la actividad. La sincronización es manual en esta versión.

Permisos preparados: `calendar.calendarlist.readonly`, `calendar.events.readonly`, `calendar.app.created`. El último permite crear y gestionar calendarios secundarios creados por la app. Fuente: [permisos oficiales de Calendar](https://developers.google.com/workspace/calendar/api/auth).

Pendiente antes de declarar RF-009 completo: pruebas OAuth reales, renovación durante la evaluación, reconciliación ante concurrencia, sincronización automática, edición/cancelación completa de series y excepciones, borrado remoto y cuentas restringidas. Una configuración en modo Testing puede tener limitaciones temporales; verificar la configuración efectiva antes de la evaluación.

## Voz

La captura permite texto sin ninguna clave. Cuando el navegador lo ofrece, hay dictado con SpeechRecognition, con aviso visible de que puede utilizar el servicio del navegador. Su disponibilidad depende del navegador: [documentación de SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

La ruta `/api/voice` acepta grabaciones breves y dispone de un adaptador para la API de transcripción. Para activarlo, configurar `VOICE_API_KEY` como secreto de servidor y redeplegar. No hay una clave incluida ni llamadas al proveedor ejecutadas en las pruebas. El audio no se guarda en la base de datos de Hilo.

Antes de usar voz con datos personales, comprobar las condiciones y retención del proveedor, y probar permiso denegado, cancelación, silencio y formatos en Android e iPhone reales. El cliente corta la grabación a 90 segundos; el servidor limita el tamaño a 12 MB. Falta validar la duración del audio en servidor y limitar abuso por cuenta.

## Avisos con la app cerrada

**El envío de avisos aún no está implementado.** La aplicación no presenta permisos ni confirmaciones de notificaciones activas. Solo están el manifiesto PWA y los manejadores de recepción/apertura del service worker.

Se necesita completar una cola duradera, registros de suscripción por usuario/dispositivo, claves VAPID, un proceso programado de envío, invalidación por revisión, posposición y prueba observada con pantalla bloqueada. No sustituir este proceso por un temporizador en la página.

En iPhone, Web Push requiere una web app añadida a la pantalla de inicio en versiones compatibles. Fuente: [WebKit: Web Push para iOS y iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Instalar Hilo no significa que los avisos estén activos.

## Acceso y menores

El despliegue inicial es privado para su propietario y usa la identidad de Sites. La cuenta local de evaluación es sintética. No se han habilitado registros públicos ni flujos para datos reales de menores. PEN-008 sigue pendiente. No hay recopilación de diagnóstico, centro educativo o fecha de nacimiento.

Referencia del adaptador de voz: [Create transcription](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create). El adaptador prepara multipart/form-data con audio y modelo gpt-4o-mini-transcribe; no está activado.

