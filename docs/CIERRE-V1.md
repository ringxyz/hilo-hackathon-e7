# Cierre V1 · 15 de octubre de 2026

Cambios limitados a la lista de revisión recibida el 15 de octubre. Se mantienen la identidad visual, la captura sin IA, la cola offline, los ajustes de accesibilidad, el repaso limitado y los datos de Alex · Demo.

## Comportamiento entregado

- Inicio en orden de lectura y visual: Conóceme → Google Calendar → Punto de regreso → Hoy (hasta tres) → Después → Repaso. Captura flotante disponible.
- Conóceme dentro de Inicio: abierto para perfil incompleto, resumido para perfil completo y editable en el mismo sitio. Comparte los datos persistidos con Ajustes. Mantiene validación de edad y autorización del tutor para menores.
- Portada con un único botón principal. «Entrar a Hilo» abre el acceso cuando no existe sesión; con sesión se carga Inicio. Google y correo quedan plegados en el acceso secundario.
- «Posponer 10 min», «Posponer 1 h» y «Mañana» visibles en Agenda, detalle y avisos de Hilo. Cambian actividad y recordatorio; este comportamiento sustituye la posposición solo del aviso descrita en documentos anteriores.
- Mañana utiliza la hora de la actividad. Si coincide con silencio, se ajusta a una hora permitida y se muestra el resultado. En citas con desplazamiento también se mantiene el aviso de salida fuera del silencio cuando es futuro. Una salida que ya ha pasado se da por atendida, conservando el nuevo aviso de cita.
- Una repetición pospuesta se separa como actividad puntual y la fecha original se excluye de la serie, sin marcarla como hecha ni mover las siguientes repeticiones. Los reintentos usan una respuesta guardada y no generan nuevas copias.
- Las citas de Google se reprograman localmente en Hilo. La sincronización conserva su hora local reprogramada y su estado de finalización; no se escribe en el calendario externo.
- «Pausar y dejar nota» en la tarjeta protagonista y en Solo esto, también cuando ya existe una pausa. Formulario de una línea opcional con Guardar y pausar / Cancelar. Retomar conserva actividad, paso, nota y tiempo.
- «Activar avisos aquí» en edición y detalle, con el mensaje solicitado para permiso denegado. El estado por dispositivo se actualiza entre instancias de Ajustes y detalle mediante suscripción compartida y evento de actualización.
- Hora opcional como campo de texto 24 h, con «Sin hora» cuando está vacío. Escribir `1700` lo convierte en `17:00`; guardar vacío conserva `null`.
- Calendar con «Por ahora no», estado colapsado, cuenta conectada, prueba, última sincronización calculada desde el dato real, desconexión y recuperación ante cancelación/caducidad.
- Áreas táctiles mínimas de 44 px en botones, lápices, flechas, opciones y controles de calendario. Encabezados de sección sin punto final y horas con contexto.

## Evidencia de verificación

- `npm run typecheck`, `npm test`, `npm run build` correctos al preparar la publicación.
- `scripts/test-reschedule.sql` en Supabase real con rollback: actividad/aviso movidos 10 minutos y una hora, mañana a la misma hora, ajuste fuera de silencio, salida antes del nuevo inicio, idempotencia, ninguna copia adicional al reintentar, serie futura intacta, foco de hoy preservado y acceso cruzado denegado. Los trabajos futuros sobreviven a una ejecución del cron durante silencio.
- `scripts/test-v1-database.sql` conserva pruebas de captura, pausa, retorno, texto original, RLS, inicio y cambio horario. La posposición se verifica ahora en el archivo anterior, según el nuevo requisito.
- Prueba de sincronización de Google con respuestas sintéticas: conserva finalización y reprogramación local, incluso cuando el evento original ya no aparece en la ventana consultada. Solo se hacen consultas externas.
- Navegador con adaptador local aislado: portada sin sesión y paso a acceso; Inicio con sesión; perfil editado en Inicio reflejado en Ajustes; Calendar plegado; pausa, recarga y retorno; tres acciones de Agenda sin diálogo intermedio; guardado vacío de hora y formato 24 h; permiso denegado y continuación a Ahora; Calendar conectado/prueba/desconexión y caducidad simulados.
- Agenda a 320 px y raíz de letra de 18 px: ancho del documento 305 px dentro de viewport de 320 px, sin controles medidos por debajo de 44 px. Diálogo de avisos: ancho interno y contenido de 248 px, sin desbordamiento y sin botones por debajo de 44 px.
- Alex · Demo, consulta real después de migrar: 15 actividades, sesión pausada, tres días de estudio, 16 fichas, un examen y marca de demo activa. No se editaron sus contenidos.
- Asesor de Supabase: conserva únicamente los avisos previos documentados en V1-VERIFICACION.md; no aparecen nuevas funciones privilegiadas expuestas.

Las pruebas locales del navegador usan respuestas simuladas y no modifican la demo ni cuentas reales. Las transacciones SQL prueban persistencia y aislamiento reales, y se revierten. No equivalen a una única prueba integral en un teléfono físico.

Tras publicar, se comprobó además el acceso real por correo de Alex · Demo y la lectura de su Dashboard desde el Worker y Supabase. La primera carga de la cuenta abre Inicio desde arriba. No se completaron, pospusieron ni editaron actividades de la demo durante esta comprobación.

## Límites de comprobación

Se han configurado las tres acciones para los push. El sistema operativo/navegador puede mostrar menos acciones nativas que las enviadas; al abrir el aviso, Hilo presenta las tres. La API permite consultar el límite mediante [Notification.maxActions](https://developer.mozilla.org/en-US/docs/Web/API/Notification/maxActions_static). No se garantiza que todos los sistemas muestren simultáneamente tres botones en la notificación del sistema.

Siguen pendientes instalación y recepción con la pantalla bloqueada en móviles físicos, dictado con micrófono y escenarios prolongados de renovación OAuth. Los estados cancelado/caducado y denegado se comprobaron en la interfaz con simulación controlada; no se revocaron permisos reales para provocar esos errores.
