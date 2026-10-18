# Hilo · flujo de captura y revisión explícita

Verificación: 18 de octubre de 2026, Europe/Madrid.

- Ambos accesos reutilizan DayCapture: mismo campo Te leo, misma guía, mismos botones y mismo significado. Guardar idea conserva su contexto y Cuéntame tu día mantiene energía y organización del día.
- Guardar tal cual usa únicamente el guardado normal de una idea, sin parser ni Anthropic. En línea espera confirmación del servidor; sin red conserva la cola por propietario y explica que queda pendiente de sincronizar. La confirmación incluye Ver mi día.
- Revisar con IA solo llama al parser y presenta propuestas. Añadir y Descartar son decisiones locales. Solo Guardar las elegidas envía las aceptadas; decisión y ambigüedad no se incluyen en el payload guardado. Cancelar no guarda.
- Vacío, dictado en marcha, procesamiento, falta de conexión, IA sin activar, ninguna elección y validación pendiente tienen mensajes visibles. Reorganizar mi día explica también su guardado deshabilitado, incluidas propuestas sin cambios.
- Edición por propuesta. Micro-pasos, energía, sonidos, planta, pausas y foco conservados. Inicio sin cambios.

## Comprobaciones

- TypeScript, suite completa de pruebas y compilación correctos.
- Prueba de render de ambos modos: nombres, orden de los botones, guía y explicación del estado vacío. Comprobada la conexión de ambos accesos al guardado tal cual.
- Navegador con componentes reales, API ficticia e identidades aisladas: revisar tres propuestas produjo una consulta IA y cero guardados. Elegir una y descartar dos mantuvo cero guardados hasta confirmar; la confirmación guardó únicamente la elegida. La propuesta ambigua descartada no bloqueó la elección válida.
- Cancelar después de elegir una propuesta: cero tareas guardadas.
- Guardar tal cual en ambos modos: texto íntegro, cero consultas de IA.
- Vista de 390 px: sin desbordamiento horizontal; botones de al menos 44 × 44 px. El texto se ajusta en varias líneas cuando hace falta para mantener la lectura móvil.
- No se editaron ni borraron registros de Alex · Demo. Las pruebas de selección/guardado se ejecutaron con callbacks y API ficticios, fuera de las cuentas reales. No hay cambios de esquema ni migraciones en esta entrega.

Pendiente: dictado con micrófono físico y la prueba completa del flujo desde el teléfono. La lógica de reconocimiento permanece igual; solo se acortó su ayuda visual en estos dos diálogos.
