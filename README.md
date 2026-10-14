# Hilo · A tu ritmo

App para guardar pendientes, recuperar el siguiente paso y repasar lo aprendido. Versión 0.2 en preparación para un piloto familiar y el hackatón.

## Stack

React 19 + Vite 8 + TypeScript + Tailwind 4. API en Cloudflare Worker y PostgreSQL/Auth en Supabase. Anthropic organiza texto e investiga fichas; Supabase Edge Functions, Cron y Vault gestionan recordatorios.

## Recorridos

- Entrada con Google mediante Supabase. Onboarding de dos pasos: adulto, adolescente o niño acompañado; ejemplos adaptados e IA opcional.
- Entrada por correo y contraseña para cuentas de evaluación previamente creadas. La muestra del jurado se describe en docs/DEMO-JURADO.md.
- Cuéntamelo: escritura o dictado del navegador, texto editable, propuestas de actividades y revisión antes de guardar.
- Ahora y Después: tarea activa, siguiente paso, pausa con nota, captura de una idea y retorno.
- Agenda: citas, tareas, repeticiones sencillas y recordatorios con horario de silencio.
- Repaso: relato de clase, confirmación de temas, búsqueda de fuentes, fichas por día y agrupación para examen. Respuestas editables y estado de práctica.
- Ajustes: perfil, consentimiento, zona horaria, reloj, Google Calendar, avisos por dispositivo, exportación y borrado de datos propios.

Se necesita conexión para guardar. Hilo no almacena audio. SpeechRecognition o el teclado convierten la voz en texto; Anthropic recibe texto. La entrega de notificaciones requiere prueba en cada dispositivo.

## Desarrollo y pruebas

Requiere Node.js 22.13+. Configurar .dev.vars con los nombres de .env.example. Aplicar las migraciones de supabase/migrations/ y preparar OAuth según docs/CONFIGURACION.md.

Comandos: npm ci; npm run build. En dos terminales, npm run dev:api y npm run dev. Abrir http://127.0.0.1:5173.

La versión 0.2 requiere una sesión Supabase real. Para OAuth local debe autorizarse expresamente ese retorno en Supabase; no se añadieron comodines ni localhost en producción. Después de editar worker/, repetir el build. React tiene HMR.

Validación: npm run typecheck, npm test, npm run build. supabase/tests.sql comprueba RLS, idempotencia, revisiones, cuota de IA y avisos en una transacción revertida. scripts/test-api.mjs es la prueba histórica de D1 0.1; no valida Supabase 0.2.

## Datos y límites

RLS aísla los datos por propietario. Anthropic y Google usan secretos de servidor; los tokens de Calendar se cifran. La clave publicable de Supabase no es un secreto.

D1 y sus esquemas anteriores se conservan; no se ha migrado automáticamente su contenido a Supabase. No eliminar ese vínculo antes de decidir cómo recuperar posibles datos de 0.1.

El sitio conserva su audiencia pública; el contenido personal requiere autenticación. Google comienza en Testing. Consultar docs/CONFIGURACION.md y docs/VERIFICACION.md para los pendientes y las pruebas reales. No se ha enviado el proyecto al concurso ni publicado un repositorio o vídeo.
