# Inicio limpio y prueba privada · 16 de octubre de 2026

Revisión del flujo de entrada y planificación solicitada para Hilo V1. El código está preparado y verificado en local. Las migraciones y el servicio de avisos están aplicados en Supabase. La publicación de la nueva interfaz está pendiente: Sites devuelve `project_not_found` para el proyecto existente con la cuenta seleccionada. No se ha creado otro sitio ni cambiado su audiencia.

## Comportamiento

- Inicio muestra un saludo pequeño, «Cuéntame tu día», explicación breve, Ver mi día, Ajustes y Guardar idea discreto. El punto de regreso se resume con Retomar. Las demás secciones mantienen su navegación completa.
- Una cuenta nueva autorizada completa cinco pantallas: nombre/perfil/idioma; estudio o contexto de uso; Calendar; avisos; zona horaria, país, silencio, IA opcional y desplazamiento por defecto. Calendar y avisos se pueden omitir. Se conservan las validaciones de edad y tutor.
- El borrador de configuración se conserva por cuenta en sessionStorage durante el retorno OAuth o una recarga de la pestaña. Los perfiles ya completados, incluida la demo, no vuelven al onboarding. Ajustes permite repetirlo voluntariamente.
- Cuéntamelo mantiene texto y dictado de hasta 90 segundos. La IA utiliza el contexto autorizado y propone una lista compacta; el usuario puede cambiarla, guardar el día o guardar el texto tal cual en Después. El dictado convierte voz a texto en el navegador; no se envían grabaciones a Anthropic.
- Las actividades con fecha y hora pueden llevar avisos y desplazamiento. Lo que no tiene hora queda en Después. Guardar el día es idempotente, vuelve a Inicio y conserva el foco existente; si no hay foco, deja un punto de regreso pausado sin iniciar un reloj.
- «Hoy solo 5» sugiere un repaso breve en perfiles de estudio. Organizar el día no genera fichas automáticamente: el flujo de Repaso sigue confirmando temas, investigando fuentes y permitiendo editar las respuestas.
- Ajustes conserva accesibilidad, idioma, perfil, Calendar, invitación por WhatsApp/copia, datos propios y salida. Añade repetir configuración, desplazamiento y preferencias separadas de salida, retomar y repaso.
- Se mantienen Agenda, Ahora, Después, Repaso, Solo esto, Listo, posponer y pausa con nota.

## Acceso de prueba

La lista vive únicamente en `hilo_private.trial_emails`. No se entrega al cliente ni se incluye su contenido en Git. La comprobación utiliza el usuario verificado de Supabase y el correo confirmado de `auth.users`; no confía en metadatos editables del usuario.

El Worker comprueba la lista antes de crear un perfil. RLS impone la misma restricción a las tablas de la app; las funciones de cuota y recordatorios también la comprueban. El envío de push respeta pertenencia, preferencias y horario de silencio.

El propietario activó `Before User Created` con `public.hilo_before_user_created`. Prueba real del 16/10/2026 a las 13:07, hora de Madrid: un correo sintético no incluido recibió HTTP 403 y el mensaje «Tu correo no está en la lista de prueba de Hilo. Pide acceso para probar.». La consulta posterior confirmó que no se creó esa cuenta. La cuenta existente de evaluación continuó iniciando sesión y leyendo sus datos con HTTP 200.

Para incorporar a otra persona, el propietario debe añadir su correo a la lista privada de Hilo y, mientras Google siga en Testing, también a los usuarios de prueba de Google OAuth. La invitación por enlace no realiza ninguna de esas altas. Para nuevos entornos, poblar la lista entre las migraciones `clean_home_trial_access` y `enforce_trial_access`; esta última aborta si la lista está vacía. Las versiones de estas tres migraciones coinciden con el historial remoto.

## Verificación

- `npm run typecheck`, `npm test` y `npm run build` correctos tras los cambios de implementación.
- Nuevas pruebas de reglas del día: contexto, tutor, IA opcional, desplazamiento, avisos y destino Después para actividades sin hora. Prueba de frontera del Worker: cuenta no listada, fallo cerrado, ausencia de perfil prematuro y obligatoriedad de la configuración.
- SQL real, en transacciones revertidas: separación entre cuentas, lista privada, rechazo de funciones de IA/captura, permisos del hook, guardado idempotente y punto de regreso pausado. Regresiones de captura, foco, Listo, posponer, series, revisiones y horario de verano también correctas.
- Navegador local con adaptador aislado: cinco pasos, móvil de 320 y 390 px, español e inglés, adolescente con tutor, adulto sin estudios, Calendar omitido, aviso no disponible/denegado, borrador tras recarga, repetir/cancelar configuración, propuesta compacta y vuelta a Inicio al guardar. No se midieron controles visibles por debajo de 44 px en Inicio a 320 px.
- Worker local con Supabase y Anthropic reales: el relato ficticio produjo cuatro actividades, dos con horario y dos para Después; hubo sugerencia de estudio. El contenido de actividades, sesión, repaso, exámenes y preferencias de la demo no cambió.
- Comprobación de acceso con el hook activo: login real de la demo y lectura del sitio publicado anterior, conservando 15 actividades, tres días de repaso y un examen. No se editaron, completaron ni pospusieron esos datos.
- Comparación de huellas de contenido antes/después de las migraciones para ambas cuentas demo: actividades, sesión y repaso sin cambios.
- Asesor de Supabase: siguen los avisos anteriores sobre tablas de servicio sin políticas para clientes, extensión pg_net en public y protección de contraseñas filtradas desactivada. No se detectaron avisos nuevos por estas funciones. Referencias: [RLS de tablas de servicio](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [extensión](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) y [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Las capturas y evidencias de QA quedan en outputs/, excluido de Git. Las credenciales se mantienen fuera de los documentos y del repositorio.

## Pendientes y límites

1. Dar a la cuenta utilizada por Sites acceso de propietario/editor al proyecto existente de Waika Studios. Mantener el identificador y audiencia actuales, publicar este código y verificar su interfaz en la URL real. La prueba negativa del hook ya utiliza la autenticación real; la nueva interfaz se ha comprobado en local.
2. Instalar y probar en Android/iPhone físicos: recepción con pantalla bloqueada, dictado real y experiencia de teclado. La simulación de estados de permisos no acredita esos resultados.
3. Probar renovación prolongada de OAuth y conflictos de Calendar. La generación de fichas con fuentes no garantiza exactitud académica exhaustiva.
4. La entrega formal del hackatón sigue siendo una acción aparte. Este documento no acredita envío del formulario ni sustituye la revisión del material final tras publicar.


## Revalidación de entrega · 18–19/10/2026

El bloqueo del conector descrito en el registro del 16/10 es histórico. Sites devuelve ahora el proyecto activo y versión 27. Se observaron en la URL pública Inicio limpio, cuenta por contraseña, Calendar conectado en Ajustes, captura, Ahora, Solo esto, Agenda y Repaso. TypeScript, 17 scripts y build pasaron el 19/10 a las 00:20. Los límites físicos siguen documentados en VERIFICACION.md.


Última corrección incorporada: «Continuar» conserva el borrador hasta guardar o descartar (19/10). Publicación Sites 27, fuente `2a97bc369473bb9f388e4ba64ba86ddc8516ff29`; su código funcional coincide con `2b6283573303d294e97d2ef730fbdaa253507fb2`. La comparación de árboles solo difiere en archivos de documentación/entrega. TypeScript, 17 scripts y build se repitieron correctamente el 19/10, 00:20:39–00:20:59 Europe/Madrid.
