# Hilo v1.0 · Piloto interno

Revisión 18–19/10/2026, Europe/Madrid. Inicio limpio, onboarding opcional, Calendar en Ajustes, captura de varios pendientes revisados, borradores recuperables, pausa con nota, Solo esto, salida/reprogramación con confirmación y Repaso por lotes. No se modifica el alcance de piloto personal con acompañamiento adulto para menores.

Cuenta de evaluación y calendario ficticio: [DEMO-JURADO.md](DEMO-JURADO.md). Revalidada con 15 actividades, pausa, 3 días, 16 fichas y 1 examen. La contraseña Hilo permanece solo en el Doc técnico existente; el jurado no necesita la contraseña de Google.

[Entrega y checklist](ENTREGA-V1.md) · [Pruebas y límites](VERIFICACION.md) · [Revisión de recuperación](REVISION-1H.md). TypeScript, 17 scripts y build correctos. La captura offline está limitada a texto por cuenta; el resto requiere red. Micrófono y recepción física de avisos siguen sin validación en móviles. El formulario oficial sigue pendiente.

## ARCHIVO — no usar para evaluación: piloto 0.3

# Hilo 0.3 · Piloto interno

Revisión del 14 de octubre de 2026. Sigue siendo una prueba académica para personas invitadas, sin dominio propio ni lanzamiento comercial.

## Funciones añadidas

- Español e inglés en navegación, onboarding, formularios, dictado, mensajes de error, invitaciones y páginas legales. La preferencia queda en el dispositivo. El contenido escrito por el usuario no se traduce automáticamente; las nuevas peticiones de IA incluyen el idioma elegido.
- Ajustes → invitación con mascota: WhatsApp abre un mensaje preparado, compartir nativo cuando el navegador lo admite y copiar invitación como alternativa. Solo se comparte la URL pública de inicio, sin datos, tokens o parámetros de la cuenta. La selección del destinatario y el envío corresponden al usuario. Compartir no modifica la lista de prueba de Google.
- Imagen social ES/EN de 1200 × 630, metadatos Open Graph/Twitter y descripción de imagen. La presentación final depende de WhatsApp y su caché.
- PWA con manifiesto, iconos 192/512 y maskable, ayuda de instalación y pantalla pública sin conexión. No almacena tareas, notas, calendario, fichas ni respuestas de API en la caché del service worker. Es necesaria conexión para los datos.
- Privacidad, cookies/almacenamiento y aviso legal bilingües con el responsable facilitado. Aviso informativo para almacenamiento técnico; no se ha añadido publicidad ni analítica. El botón Entendido no otorga consentimiento para IA.
- HTML del servidor con títulos, descripciones, canonical, idiomas y WebApplication. Todas las respuestas llevan noindex. Robots permite leer esta indicación; sitemap no enumera páginas indexables durante el piloto. No se han creado páginas de captación ni ficha de Google.
- 404 con estado HTTP 404, límite temporal de peticiones, ayuda de conexión y recuperación de errores de pantalla.
- Cabeceras CSP, HSTS, no-sniff, política de referencias/permisos y no-store en API. Autenticación y comprobación de origen antes de las mutaciones; límites atómicos por cuenta (6 acciones costosas/minuto, 60 escrituras/minuto), además de los límites existentes de IA/push. No hay formulario público de contacto que reciba spam.
- Fuente WOFF2 de 102.348 bytes frente a 571.240 bytes y carga separada del SDK y del módulo Repaso.

## Evidencia y límites

Typecheck, pruebas de dominio ES/EN, perfiles, autorización, aislamiento de secretos, HTML bilingüe, metadatos, 404, manifiesto y comportamiento offline del service worker pasan. El límite persistente permite 6/60 acciones y bloquea la siguiente en una transacción revertida; anónimo no puede ejecutarlo y autenticado no puede modificar los contadores. npm audit de dependencias de producción: 0 vulnerabilidades informadas.

Revisión visual con navegador a 390 px: onboarding, ajustes, selector e invitación en ambos idiomas; copia de invitación confirmada. No equivale a una prueba física de instalación, dictado o notificaciones con la aplicación cerrada en Android/iPhone. No se ha enviado ninguna invitación a terceros.

Se retiraron exclusivamente los datos ficticios conocidos de fracciones: actividad, día con fichas y repaso de examen. El evento de prueba del calendario Hilo se eliminó mediante Google Calendar. Se conservan los eventos reales importados.

La auditoría de Supabase conserva advertencias previas: pg_net en public, función de cuota de IA SECURITY DEFINER ejecutable por autenticados (intencional, limitada a auth.uid()), y protección de contraseñas filtradas desactivada (el acceso de la aplicación es Google). Tablas de contadores/cola con RLS y sin políticas son intencionalmente inaccesibles directamente. Revisar [asesor de base de datos](https://supabase.com/docs/guides/database/database-linter) y [seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) antes de ampliar el piloto.

Noindex no es una barrera de acceso: el sitio conserva su audiencia de alojamiento y los datos se protegen con autenticación y RLS. La lista de prueba OAuth no sustituye una política de invitaciones propia de la aplicación. No se ha implementado una lista de acceso adicional en Hilo.

## Antes de una apertura pública

Revisar contratos de encargados, transferencias internacionales, retenciones, identificación legal aplicable y verificación de autorización parental. Las páginas describen el piloto, no certifican cumplimiento legal completo. Definir una política de admisión y de eliminación definitiva de cuentas, probar móviles reales y conectar alertas operativas si se necesita supervisión continua. En esta entrega el aviso de fallos es dentro de la aplicación; no se ha contratado ni configurado monitorización externa.

Fuentes oficiales consultadas: [guía de cookies AEPD](https://www.aepd.es/guias/guia-cookies.pdf), [información de privacidad AEPD](https://www.aepd.es/guias/guia-modelo-clausula-informativa.pdf), [retención de API de Anthropic](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) y [responsabilidad compartida de Supabase](https://supabase.com/docs/guides/deployment/shared-responsibility-model).
