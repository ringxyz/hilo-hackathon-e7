# Hilo · verificación de las mejoras de enfoque

Fecha: 18 de octubre de 2026 (Europe/Madrid).

## Cambios

- Inicio: saludo conservado, logo original pequeño a la derecha, fecha y hora según la zona del perfil. Se mantiene una acción principal y accesos discretos.
- Captura: energía baja/media/alta por día; chips editables de fecha, hora, recurrencia, etiqueta y prioridad. La energía baja limita las tareas nuevas de Hoy según las ya pendientes (hasta tres); no elimina citas ni contenido anterior.
- Micro-pasos: Anthropic genera entre dos y doce acciones; el primero dura como máximo dos minutos. Solo se presenta el actual, con el resto plegado. Edición, eliminación y avance. Persistencia en el payload de la actividad; las tareas recurrentes reinician sus marcas al cambiar de día.
- Solo esto: círculo de tiempo, texto de minutos restantes, progreso de pasos y salida visible. Movimiento reducido mantiene el círculo estático. Sonido generado localmente, apagado por defecto; opciones lluvia y ruido marrón. Se suspende con la pausa y se libera al salir. Brote individual opcional; al pausar espera, sin castigos.
- Respira, vuelve: tres ejercicios breves, uno a la vez, sin rachas ni contadores de rendimiento.
- Agenda: Reorganizar mi día aparece cuando existe una actividad pasada de su hora. Propone cambios solo en tareas flexibles de hoy. Protege citas, tiempo para llegar, repeticiones, foco activo y actividades completadas. Reserva pausas y evita el silencio; lo que no cabe pasa a Después. Revisión y confirmación explícitas antes del guardado atómico.

## Evidencia

- `npm run typecheck`, `npm test` y `npm run build`: correctos.
- Pruebas del Worker: consentimiento para IA, metadatos naturales, validación de propuestas y autorización por actividad.
- Pruebas de planificación: tiempos de traslado, silencio, tareas completadas, recurrencias, foco activo, rechazos de propuestas caducadas y cambios desde otra pestaña.
- Prueba real de Anthropic con contenido ficticio: cuatro pendientes independientes, actividad ya terminada omitida, recurrencia/hora/etiqueta/prioridad reconocidas, nueve micro-pasos y primer paso de dos minutos. No se guardó contenido de esta consulta en cuentas reales.
- Supabase: `scripts/test-focus-support.sql` pasó dentro de una transacción con identidades desechables y ROLLBACK. Comprobó 24 elementos, límite de energía, persistencia de pasos/energía, guardado del nuevo orden, reintentos sin duplicados y rechazo de revisiones antiguas.
- Los dos perfiles Alex · Demo conservan sus 15 actividades y las mismas huellas de contenido antes/después. El contenido de Raúl también conserva su huella. No se reinicializaron cuentas ni sesiones.
- Navegador local con datos ficticios: Inicio y Solo esto a 320 px sin desbordamiento horizontal; controles de botón comprobados con tamaño mínimo 44 × 44 px. También se revisaron captura y chips a 390 px, y escritorio a 1280 px. Se probó corregir 10:00 a 11:30, avanzar/editar un paso, activar opciones y pausar, y abrir/cerrar la ayuda breve.
- Capturas locales: `outputs/focus-support-qa/`. El entorno de revisión en `work/` está excluido de Git y del despliegue.

## Límites de la comprobación

La revisión visual usó componentes reales con un estado ficticio local. Los guardados se verificaron por separado con pruebas del Worker y transacciones reales en Supabase; no se completó el flujo nuevo entero con una cuenta real en un móvil físico. Quedan por probar percepción del sonido, dictado del teléfono, comportamiento con la pantalla bloqueada y notificaciones físicas. Hilo no promete bloquear otras apps.

La revisión de seguridad de Supabase mantiene avisos previos: tablas internas con RLS sin políticas (acceso de usuario cerrado), pg_net en public y protección de contraseñas filtradas desactivada. No se añadieron tablas expuestas ni privilegios anónimos. Referencias: [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [extensión en public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
