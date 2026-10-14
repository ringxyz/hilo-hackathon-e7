# Hilo · A tu ritmo

Primera versión privada de una app para capturar pendientes, hacer una cosa cada vez y recuperar el punto de retorno después de una interrupción.

## Stack

React 19 + Vite 8 + TypeScript + Tailwind 4. API en un Cloudflare Worker, base de datos D1/SQLite y Drizzle. La autenticación del despliegue privado la proporciona Sites. El frontend es una SPA de React, sin Next.js ni Vinext.

## Qué puedes probar

- Cuéntamelo: texto, interpretación determinista, edición y confirmación de varios pendientes.
- Ahora: tarea activa, siguiente paso, pausa con nota, retorno, temporizador opcional y completar/deshacer.
- Después: capturar una idea sin cambiar la tarea actual y pasarla a Hoy.
- Agenda: fechas, citas fijas, tareas flexibles y repeticiones diarias, semanales o anuales sencillas.
- Ajustes: nombre opcional, zona horaria, ocultar reloj, preferencias de silencio, exportar y borrar datos propios.
- Logo SVG original, iconos instalables, diseño responsive y ejemplos ficticios voluntarios.

Las actividades se guardan en servidor. La app requiere conexión para confirmar cambios. No hay guardado offline simulado.

## Ejecutar en Windows

Requiere Node.js 22.13 o posterior.

```powershell
npm ci
npm run build
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.json --persist-to .wrangler/state
```

En dos terminales:

```powershell
npm run dev:api
npm run dev
```

Abrir http://127.0.0.1:5173. Si aparece la entrada, pulsar «Abrir mi espacio» para entrar en la cuenta sintética local. El simulador local de identidad solo se usa en loopback y no entra en el build de producción.

Después de cambiar código de `worker/`, ejecutar `npm run build`; Wrangler recarga el artefacto. Los cambios de React usan HMR.

Si el shim npm del equipo falla, invocar la instalación existente explícitamente: `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" ci`.

## Verificar

```powershell
npm run typecheck
npm test
node scripts/test-api.mjs
npm run build
```

La prueba de API requiere el servidor local en el puerto 8787, genera cuentas QA sintéticas y limpia sus actividades al terminar. Nunca usar ese script contra producción.

## Carpetas

- `src/`: React, tipos, reglas de fechas/captura y estilos Tailwind/CSS.
- `worker/`: API autenticada, validación y adaptadores de Google/voz.
- `db/schema.ts`, `drizzle/`: esquema y migración.
- `public/`: logo, fuente con licencia OFL, iconos, manifiesto y service worker.
- `docs/CONFIGURACION.md`: secretos necesarios y pasos pendientes.
- `docs/VERIFICACION.md`: evidencia y límites de esta versión.
- `docs/HISTORIAL.md`: registro real de decisiones e implementación.

## Estado de integraciones

Google OAuth y el adaptador de transcripción están preparados, sin claves y sin pruebas reales. Los avisos con la app cerrada todavía necesitan motor de envío y cola duradera. La PWA no implica que estos avisos funcionen. Ver la matriz de verificación antes de considerar completo el MVP del PRD.

La versión privada usa datos ficticios. No se han habilitado altas públicas para menores. GitHub público, Google Docs, vídeo y entrega al concurso quedan fuera de esta primera construcción.
