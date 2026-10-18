# Hilo v1.0 · Cuenta de evaluación

**V1 — 19 de octubre de 2026**. Verificación real: 18–19/10/2026, Europe/Madrid. La etiqueta de entrega no representa una ejecución futura.

Aplicación: https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site/

Pulsa **Entrar a Hilo**. Sin sesión, abre **¿Ya tienes cuenta? Entra aquí** y **Acceso con correo y contraseña**. Correo de evaluación: `waikarrss@gmail.com`. La contraseña exclusiva de Hilo figura únicamente en el [Google Doc técnico existente](https://docs.google.com/document/d/1YKbDPxQpC3I6OQw4LRvVIahstGaeHNXuuor28Eo0cW4/edit); no es una contraseña de Google y el jurado no necesita entrar en Google.

**Alex · Demo** es un adulto ficticio de 18 años. Base: 15 actividades, sesión pausada con nota, 3 días de estudio, 16 fichas y 1 examen que agrupa dos días. Las fichas son ejemplos editoriales, no resultados de una nueva ejecución de IA.

El participante completó personalmente OAuth. Google Calendar está conectado al calendario separado **Hilo · Calendario de prueba**: tres eventos ficticios reales sustituyeron sus tres equivalentes locales para mantener 15 actividades. Hilo consulta el calendario seleccionado y solo escribe en el secundario creado por Hilo. El ICS usa instantes UTC y Hilo usa Europe/Madrid. No se crearon permisos ni suscripciones push ficticios. La cuenta anterior `prueba@hilo.example` permanece como muestra histórica sin Calendar, con sus contenidos conservados.

## Recorrido V1

1. Inicio limpio: Cuéntame tu día, punto de regreso, Ver mi día y Ajustes. Calendar se consulta en Ajustes; no está en Inicio. El onboarding solo aparece en perfiles nuevos o al solicitar repetirlo.
2. Retomar **Repasar fracciones**: siguiente paso, resolver el ejercicio 2, sumar 1/4 y 2/4.
3. Guardar idea → escribir un pendiente ficticio → **Guardar tal cual en Después**. Guarda texto íntegro sin IA y conserva la tarea activa.
4. **Pausar y dejar nota** → «Me quedé en el ejercicio 2» → guardar → recargar → retomar. Nota, paso y tiempo se conservan.
5. **Solo esto**: tarea, paso y reloj opcional sin navegación. Pausa y captura siguen disponibles.
6. Agenda → Paseo de la tarde: **Cita 19:30 · Sal a las 19:00**. Reprogramar 10 min / 1 h / Mañana muestra destino y exige confirmar; mueve actividad y aviso. Si la cita futura es a las 18:30, +10 min propone 18:40. Si ya pasó, parte del momento actual. Una repetición se separa como ocurrencia puntual, sin mover las futuras. En citas de Google, el cambio es local de Hilo.
7. Después → revisar pendientes sin fecha. Repaso → **Hoy solo 5**, una ficha por pantalla, respuesta y fuentes; examen de práctica.
8. Ajustes → idioma, reloj, movimiento reducido, contraste, tamaño de letra, zona y exportación. Los avisos se activan voluntariamente por dispositivo.

Las operaciones del jurado modifican esta cuenta compartida de muestra. `scripts/demo-fixtures.mjs` reproduce datos ficticios sin credenciales; el aprovisionamiento temporal quedó cerrado con HTTP 410. Se comprobaron autenticación real, estado del Worker y aislamiento por propietario.

Captura offline en IndexedDB con reintento por cuenta e idempotencia. Las demás operaciones necesitan red. Pendiente: micrófono y push con pantalla bloqueada en móviles físicos, renovación OAuth prolongada. Hilo es un espacio personal para organizarte y repasar, sin eficacia clínica demostrada.

## Vídeo y evidencia final

[Demo vertical, 1080×1920](https://drive.google.com/file/d/1qjF2b3XoMFwJZYLKwZ1XgkWfCGuOU8ze/view) · [Demo horizontal, 1920×1080](https://drive.google.com/file/d/1ezRCb8KnKYWm1uW5x66Rq8H8k0Wnhu7M/view). Ambos MP4 duran 120 s a 30 fps, con la misma voz, guion y subtítulos españoles incrustados. Montaje de capturas reales de la cuenta; el consentimiento OAuth no se grabó.

El jurado puede repetir el recorrido con la cuenta compartida. La idea de Lucía que aparece en el vídeo se retiró después de capturarla; los 15 registros base, la nota y los 12 minutos restantes quedaron restaurados. Verificación de datos y Calendar: 18/10/2026, 23:52 Europe/Madrid; acceso por contraseña y captura sin IA repetidos el 18–19/10. La captura temporal fue retirada después y los 15 registros base se conservaron.

[Índice de los dos Docs, vídeos, capturas actuales y checklist](ENTREGA-V1.md). Credenciales únicamente en la sección 6 del Google Doc técnico existente.
