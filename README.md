# Hilo · A tu ritmo

App para guardar pendientes, recuperar el siguiente paso y repasar lo aprendido. V1 para el piloto familiar y el hackatón. Registro de cambios y límites de verificación: [V1-VERIFICACION.md](docs/V1-VERIFICACION.md).

## Stack

React 19 + Vite 8 + TypeScript + Tailwind 4. API en Cloudflare Worker y PostgreSQL/Auth en Supabase. Anthropic organiza texto e investiga fichas; Supabase Edge Functions, Cron y Vault gestionan recordatorios.

## Recorridos

- Entrada con Google mediante Supabase. Onboarding de dos pasos: adulto, adolescente o niño acompañado; ejemplos adaptados e IA opcional.
- Entrada por correo y contraseña para cuentas de evaluación previamente creadas. La muestra del jurado se describe en docs/DEMO-JURADO.md.
- Inicio: punto de regreso, Google Calendar, hasta tres actividades de Hoy, dos ideas de Después y acceso al repaso.
- Cuéntamelo: escritura o dictado, guardado directo en Después y revisión opcional con IA. La cola local reintenta con la misma clave y la misma cuenta.
- Ahora y Solo esto: tarea activa, siguiente paso, temporizador opcional, pausa con nota y retorno. Después permite pasar una idea a Hoy en un toque.
- Agenda: citas, desplazamiento, aviso independiente de salida, posponer 10 minutos/1 hora/mañana, repeticiones y horario de silencio.
- Repaso: relato de clase, confirmación de temas, búsqueda de fuentes, fichas por día y agrupación para examen. Respuestas editables y estado de práctica.
- Ajustes: perfil, consentimiento, zona horaria, reloj, reducción de movimiento, contraste, tamaño de letra, Google Calendar, avisos por dispositivo, invitaciones, exportación y borrado de datos propios.

La captura de texto funciona sin conexión después de haber abierto Hilo con una cuenta: se guarda en IndexedDB y se sincroniza al volver a abrir Hilo con conexión y la misma cuenta. El resto de las operaciones necesita red. Hilo no almacena audio. SpeechRecognition o el teclado convierten la voz en texto; Anthropic recibe texto. La entrega de notificaciones requiere prueba en cada dispositivo.

## Desarrollo y pruebas

Requiere Node.js 22.13+. Configurar .dev.vars con los nombres de .env.example. Aplicar las migraciones de supabase/migrations/ y preparar OAuth según docs/CONFIGURACION.md.

Comandos: npm ci; npm run build. En dos terminales, npm run dev:api y npm run dev. Abrir http://127.0.0.1:5173.

La aplicación requiere una sesión Supabase real. Para OAuth local debe autorizarse expresamente ese retorno en Supabase; no se añadieron comodines ni localhost en producción. Después de editar worker/, repetir el build. React tiene HMR.

Validación: npm run typecheck, npm test, npm run build. supabase/tests.sql comprueba RLS, idempotencia, revisiones, cuota de IA y avisos en una transacción revertida. scripts/test-v1-database.sql y scripts/test-v1-queue.sql amplían la prueba real de Supabase para pausa, posponer, separación de avisos y cambios de hora. scripts/test-api.mjs es la prueba histórica de D1 0.1; no valida la versión actual.

## Datos y límites

RLS aísla los datos por propietario. Anthropic y Google usan secretos de servidor; los tokens de Calendar se cifran. La clave publicable de Supabase no es un secreto.

D1 y sus esquemas anteriores se conservan; no se ha migrado automáticamente su contenido a Supabase. No eliminar ese vínculo antes de decidir cómo recuperar posibles datos de 0.1.

El sitio conserva su audiencia pública; el contenido personal requiere autenticación. Google permanece en Testing. Consultar docs/CONFIGURACION.md y docs/V1-VERIFICACION.md para los pendientes y las pruebas reales. El código se mantiene en el repositorio del proyecto; la publicación de la app no acredita el envío formal al concurso ni la entrega del vídeo.
