# Hilo v1.0 · A tu ritmo

App para guardar pendientes, recuperar el siguiente paso y repasar lo aprendido. V1 para el piloto familiar y el hackatón. Revisión más reciente: [INICIO-LIMPIO-V1.md](docs/INICIO-LIMPIO-V1.md), con Inicio limpio, onboarding y acceso privado observados en producción el 18–19/10/2026. Mejoras posteriores: [REVISION-1H.md](docs/REVISION-1H.md). Cierre histórico del 15/10: [CIERRE-V1.md](docs/CIERRE-V1.md).

**V1 — 19 de octubre de 2026**. Verificación final del código: 19/10/2026; datos revisados el 18–19/10/2026, Europe/Madrid. [App pública](https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site/) · [Documentación técnica](https://docs.google.com/document/d/1YKbDPxQpC3I6OQw4LRvVIahstGaeHNXuuor28Eo0cW4/edit) · [Historial de prompts](https://docs.google.com/document/d/1ModC2RSVul3quD_H7kcXAqlkYZdT8S32DlngnLhiGsY/edit) · [Carpeta de entrega](https://drive.google.com/drive/folders/1H0QxCTqYYIdSRqHcF6seZy7BOIH5yyEs). Los dos MP4 finales de 120 s, la voz, el guion y capturas actuales de la app publicada están compartidos por enlace. [Índice, verificaciones y checklist de entrega](docs/ENTREGA-V1.md). El formulario oficial sigue pendiente de envío.

## Stack

React 19 + Vite 8 + TypeScript + Tailwind 4. API en Cloudflare Worker y PostgreSQL/Auth en Supabase. Anthropic organiza texto e investiga fichas; Supabase Edge Functions, Cron y Vault gestionan recordatorios.

## Recorridos

- Entrada con Google mediante Supabase y lista privada de correos de prueba. Onboarding nuevo de cinco pasos: perfil e idioma, contexto de estudio/uso, Calendar opcional, avisos opcionales y preferencias finales. Los perfiles ya completados entran directamente.
- Entrada por correo y contraseña para cuentas de evaluación previamente creadas. La muestra del jurado se describe en docs/DEMO-JURADO.md.
- Inicio: saludo pequeño, «Cuéntame tu día», explicación breve, Ver mi día, Ajustes y un punto de regreso compacto. Guardar idea queda disponible sin competir con la acción principal.
- Cuéntamelo: escritura o dictado, propuesta compacta según el perfil, revisión antes de guardar y guardado directo en Después. Las actividades sin hora van a Después. La cola local reintenta con la misma clave y la misma cuenta.
- Ahora y Solo esto: tarea activa, siguiente paso, temporizador opcional, pausa con nota y retorno. Después permite pasar una idea a Hoy en un toque.
- Agenda: citas, desplazamiento, aviso independiente de salida, reprogramar actividad y aviso 10 minutos/1 hora/mañana con revisión y confirmación, repeticiones y horario de silencio.
- Repaso: relato de clase, confirmación de temas, búsqueda de fuentes, fichas por día y agrupación para examen. Respuestas editables y estado de práctica.
- Ajustes: repetir configuración, perfil, consentimiento, zona horaria, desplazamiento por defecto, tipos de avisos y silencio, reloj, reducción de movimiento, contraste, tamaño de letra, Google Calendar, avisos por dispositivo, invitaciones, exportación y borrado de datos propios.

La captura de texto funciona sin conexión después de haber abierto Hilo con una cuenta: se guarda en IndexedDB y se sincroniza al volver a abrir Hilo con conexión y la misma cuenta. El resto de las operaciones necesita red. Hilo no almacena audio. SpeechRecognition o el teclado convierten la voz en texto; Anthropic recibe texto. La entrega de notificaciones requiere prueba en cada dispositivo.

## Desarrollo y pruebas

Requiere Node.js 22.13+. Configurar .dev.vars con los nombres de .env.example. Aplicar las migraciones de supabase/migrations/ y preparar OAuth según docs/CONFIGURACION.md.

En un entorno nuevo, poblar `hilo_private.trial_emails` de forma privada después de `clean_home_trial_access` y antes de `enforce_trial_access`. Activar el hook `Before User Created` con `public.hilo_before_user_created`. La lista y su mantenimiento se explican en [INICIO-LIMPIO-V1.md](docs/INICIO-LIMPIO-V1.md); no se incluyen correos personales en el repositorio.

Comandos: npm ci; npm run build. En dos terminales, npm run dev:api y npm run dev. Abrir http://127.0.0.1:5173.

La aplicación requiere una sesión Supabase real. Para OAuth local debe autorizarse expresamente ese retorno en Supabase; no se añadieron comodines ni localhost en producción. Después de editar worker/, repetir el build. React tiene HMR.

Validación: npm run typecheck, npm test, npm run build. supabase/tests.sql comprueba RLS, idempotencia, revisiones, cuota de IA y avisos en una transacción revertida. scripts/test-reschedule.sql, scripts/test-v1-database.sql y scripts/test-v1-queue.sql amplían la prueba real de Supabase para pausa, posponer, separación de avisos y cambios de hora. scripts/test-api.mjs es la prueba histórica de D1 0.1; no valida la versión actual.

## Datos y límites

RLS aísla los datos por propietario. Anthropic y Google usan secretos de servidor; los tokens de Calendar se cifran. La clave publicable de Supabase no es un secreto.

D1 y sus esquemas anteriores se conservan; no se ha migrado automáticamente su contenido a Supabase. No eliminar ese vínculo antes de decidir cómo recuperar posibles datos de 0.1.

El sitio conserva su audiencia pública; el contenido personal requiere autenticación. Google permanece en Testing. Consultar docs/CONFIGURACION.md y docs/V1-VERIFICACION.md para los pendientes y las pruebas reales. El código se mantiene en el repositorio del proyecto; la publicación de la app no acredita el envío formal al concurso ni la entrega del vídeo.


Última corrección incorporada: «Continuar» conserva el borrador hasta guardar o descartar (19/10). Publicación Sites 27, fuente `2a97bc369473bb9f388e4ba64ba86ddc8516ff29`; su código funcional coincide con `2b6283573303d294e97d2ef730fbdaa253507fb2`. La comparación de árboles solo difiere en archivos de documentación/entrega. TypeScript, 17 scripts y build se repitieron correctamente el 19/10, 00:20:39–00:20:59 Europe/Madrid.
