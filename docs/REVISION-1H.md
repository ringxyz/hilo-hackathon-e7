# Hilo · revisión 1h · 18 de octubre de 2026

Alcance único: solicitud 1h, incluyendo los puntos vigentes de 1g. Los seis perfiles descritos por el usuario son simulados, no usuarios reales ni evidencia clínica. Las notas siguientes son una autoevaluación técnica orientativa, no una predicción del resultado del concurso.

## Cambios, evidencia y nota por punto

| Punto | Resultado y verificación | Nota / 10 |
|---|---|---:|
| Borradores por usuario y modo | Texto, energía, propuestas editadas, decisiones, etapa e identificadores de guardado en almacenamiento local separado. Pruebas de aislamiento de cuentas y modos. | 9 |
| X, Escape y clic exterior | Los tres abren Seguir editando / Guardar borrador / Descartar. Comprobado en navegador con una propuesta editada y añadida y energía baja. Reabrir restaura todo sin guardar tareas. | 9 |
| Descartar y limpiar al guardar | Descartar idea conserva el borrador del día. Guardar las elegidas limpia el borrador. Guardar tal cual limpia solo al recibir confirmación de guardado, también para la cola offline existente. | 9 |
| Relato y temas de estudio | Recuperación del relato, fecha, confirmación y temas editados. Volver pide decisión; Escape usa el mismo control. Recuperación de tema editado comprobada en interfaz. | 9 |
| Retrasar citas futuras | Cálculo en Supabase desde la hora programada, no desde ahora. 18:30 + 10 min = 18:40; salida 18:25. Previsualización sin escritura y confirmación explícita. | 9 |
| Vencidas y sin hora fija | Conservan referencia al instante actual. Prueba de vencida: 16:22 + 10 min = 16:32. Se muestra el resultado antes de confirmar. | 9 |
| Recurrencia, huso, silencio y salida | Pruebas SQL reales con rollback: conserva la serie, separa una ocurrencia, recalcula salida, respeta silencio, cambio horario y día programado + 1. Confirma horario e idempotencia. | 9 |
| Repaso: pendientes antes del límite | 7 fichas, 5 conocidas y 2 nuevas: filtro devuelve las 2. Selección y límite probados por función y navegador. | 9 |
| Repaso: final de lote | Navegador: 5/5 permite Terminar repaso, muestra «Has terminado estas 5 fichas», «Quedan 2» y Siguiente lote opcional. Continuar abre solo las 2 restantes. | 9 |
| Repaso: materia | Seleccionar Ciencias cambia el CTA a Repasar Ciencias y abre Ciencias. Sin filtro, CTA indica todas las materias. | 9 |
| Curso según nivel ES/EN | Primaria, ESO y Bachillerato tienen ejemplos distintos en ambos idiomas. Bachillerato incorporado al esquema validado. Pruebas de idioma y niveles; interfaz Primaria y Bachillerato. | 9 |
| Avisos sin presión | Se elimina la advertencia sobre perder citas. Activación opcional, decisión posterior y nombre «Activar avisos aquí» consistente. | 9 |
| Contexto mixto | Trabajo, Hogar, Vida personal, Estudio y Otro son independientes de estudiar. Ejemplos de captura consideran audiencia y contexto, incluyendo estudiar y trabajar. | 9 |
| Adulto que no estudia | «Día de aprendizaje», «Lo que aprendí» y privacidad neutral en creación de fichas. Comprobado en navegador. | 9 |
| Ajustes | Guardar preferencias al principio y sticky; cambiar Ocultar temporizador y guardar sin ir al final comprobado a 390 px con letra grande. | 9 |
| Duración | 5 / 10 / 20 min, No lo sé, edición manual y explicación de estimación. No modifica el comportamiento de agotamiento del reloj ni completa tareas automáticamente. | 8 |
| Pista completa | Sin elipsis ni recorte de líneas. Inspección visual a 390 y 1280 px con letra Grande y contraste alto. | 9 |
| Editar y empezar | El editor valida el formulario y entrega su versión editada. App guarda y espera confirmación antes de iniciar; si falla, no inicia. La sincronización nextStep de Solo esto / Ahora no se modifica. | 8 |
| Avisos pendientes de activar | El editor comprueba configuración y suscripción del dispositivo antes de hablar de avisos activos. Si falta, informa «pendiente de activar/configurar». No promete entrega física. | 8 |
| Avisos duplicados | Restricción única existente confirmada en Supabase; cero duplicados de jobs y de actividades en el mismo horario durante la auditoría. Filtro defensivo por identidad y eliminación de avisos de ocurrencias obsoletas de la respuesta. No se afirma haber reproducido el origen de las tres copias históricas. | 7 |
| Vigencia de avisos tras editar | Se detectó un fallo real adicional: cambiar nota/paso incrementaba la revisión e invalidaba avisos correctos. Trigger conserva su revisión cuando no cambia el horario; cambios de horario retiran y reemplazan el mismo job. Prueba SQL de nota editada y aviso aún visible. | 9 |
| Calendar | Espacio explícito en cuenta, calendario principal seleccionado, sincronización automática solo al abrir con antigüedad de 60 min o más, y resultado local de Probar conexión. UI ficticia: guardados 0 al abrir con sync reciente y 1 tras probar. No se desconectó ninguna cuenta. OAuth y sincronización externa real no probados en esta revisión. | 8 |
| Onboarding | App real con API aislada: cuenta nueva abre Paso 1 de 5; perfil completado abre Inicio. Rehacer conserva datos. Se corrigió que una preferencia anterior sobrescribiera el idioma elegido al reabrir. No se reinició el onboarding de Demo. | 9 |
| Carga inicial | Después de 5 s muestra mensaje y Reintentar arriba del esqueleto; reintento automático acotado y salida manual. Ambos caminos comprobados con respuestas demoradas ficticias. | 9 |
| Accesibilidad | Zonas de botones/iconos/summary de al menos 44 px; etiquetas táctiles de controles; placeholder legible. Inspección visual móvil y escritorio en alto contraste y Grande. Se mantienen las reglas globales de movimiento reducido. No equivale a una auditoría WCAG exhaustiva ni lector de pantalla físico. | 8 |
| Propuestas y reorganización | Nada se guardó todavía sigue visible. Reorganizar sin cambios muestra No hay cambios que guardar y Volver; no presenta Guardar mi día deshabilitado. | 9 |
| Inicio y contexto de regreso | Una acción protagonista y accesos secundarios, sin tarjetas, menús ni rutas nuevos, rachas ni castigos. No se editaron FocusMode, Relief, CleanHome ni el RPC de foco. Pruebas de pausa/recarga/contexto existentes continúan pasando. | 9 |
| Compilación y regresión | typecheck, test y build. Nueva suite test-recovery-1h.mjs y prueba SQL test-1h-database.sql. La prueba SQL usa identidades ficticias y ROLLBACK. | 9 |
| Alex · Demo | Antes/después: ambos perfiles conservan 15 actividades y los mismos hashes de preferencias, actividades/revisiones, fichas y sesión. No se usaron para pruebas de escritura. | 10 |

## Límites y pendientes explícitos

- Borradores en este navegador y cuenta: no se promete sincronización entre dispositivos. Si el almacenamiento está bloqueado o lleno se avisa y no se ofrece cerrar como si se hubiera guardado. Se documenta en Cookies y almacenamiento y se incluyen en exportación y borrado de datos.
- No se evaluó ni modificó el parser real de Anthropic, las respuestas fijas del simulador, su fecha de examen ni el contenido de sus fichas. El contenido sintético utilizado en las pruebas de interfaz no es una evaluación de la IA.
- OAuth real, recepción física de push, voz física, PWA instalada y offline real siguen pendientes de prueba en los dispositivos de la familia. Las pruebas simuladas no los validan.
- La repetición histórica de «Paseo de la tarde» no apareció en los datos actuales. No se borraron actividades para ocultarla ni se fusionaron actividades distintas por tener el mismo título. Si vuelve, conservar la captura y los identificadores para identificar la operación causante.
- Asesor de seguridad de Supabase: avisos informativos de RLS sin políticas en tablas internas de uso exclusivo por RPC; advertencias previas sobre pg_net en public y protección de contraseñas filtradas desactivada. No se cambiaron permisos ni configuración de acceso para ocultar avisos. Referencias: [extensión en public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) y [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Evidencia local

Capturas en outputs/recovery-1h/: borrador-protegido.png, horario-previo.png, repaso-terminado.png, ajustes-guardar-390.png, inicio-grande-390.png, inicio-grande-1280.png y carga-reintentar.png. Son pruebas aisladas identificadas como QA, no cuentas reales ni acreditación de servicios externos.
