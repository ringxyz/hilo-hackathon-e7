import { randomUUID } from 'node:crypto';
export function demoFixtures(today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())) {
  const day = n => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const activity = (title, extra = {}) => ({ id: randomUUID(), title, kind: 'task', date: today, time: null, duration: 15, nextStep: 'Abrir los apuntes y elegir el primer ejercicio.', note: '', returnNote: '', status: 'pending', color: 'pink', recurrence: 'none', source: 'hilo', reminder: false, timezone: 'Europe/Madrid', travelMinutes: extra.kind === 'event' ? 30 : 0, ...extra });
  const activities = [
    activity('Repasar fracciones', { duration: 20, nextStep: 'Resolver el ejercicio 2: sumar 1/4 y 2/4.', note: 'Muestra ficticia. Ya he leído la explicación y resuelto el primer ejercicio.', recurrence: 'daily' }),
    activity('Preparar la mochila', { duration: 10, nextStep: 'Poner el cuaderno y el estuche junto a los libros.', color: 'mint', recurrence: 'daily' }),
    activity('Leer veinte minutos', { duration: 20, nextStep: 'Abrir el libro en la página señalada.', color: 'peach', recurrence: 'daily' }),
    activity('Repaso de historia', { date: day(1), duration: 25, nextStep: 'Abrir las fichas de Egipto y responder tres preguntas.', color: 'blue' }),
    activity('Terminar un dibujo', { date: day(2), nextStep: 'Elegir dos colores para el fondo.', color: 'peach' }),
    activity('Organizar el escritorio', { status: 'done', duration: 10, nextStep: 'Guardar los lápices en su caja.', color: 'mint' }),
    activity('Entrenamiento de muestra', { kind: 'event', time: '18:00', duration: 60, nextStep: '', color: 'blue', recurrence: 'weekly' }),
    activity('Paseo de la tarde', { kind: 'event', time: '19:30', duration: 25, nextStep: '', color: 'mint', recurrence: 'daily', reminder: true }),
    activity('Sesión de repaso', { kind: 'event', date: day(1), time: '17:00', duration: 30, nextStep: '', color: 'pink' }),
    activity('Visita a la biblioteca de muestra', { kind: 'event', date: day(3), time: '11:00', duration: 45, nextStep: '', color: 'peach' }),
    activity('Examen de práctica', { kind: 'event', date: day(15), time: '10:00', duration: 50, nextStep: '', color: 'blue' }),
    activity('Buscar una receta para el fin de semana', { date: null, nextStep: 'Elegir una receta sencilla con tres ingredientes.', color: 'mint', note: 'Idea guardada sin interrumpir el repaso.' }),
    activity('Comprar un cuaderno de muestra', { date: null, nextStep: 'Anotar el tamaño y el color que quiero.', color: 'pink' }),
    activity('Investigar cómo se construían las pirámides', { date: null, nextStep: 'Buscar una fuente y guardar una pregunta.', color: 'blue' }),
    activity('Planear una excursión ficticia', { date: null, nextStep: 'Hacer una lista de dos lugares posibles.', color: 'peach' }),
  ];
  const math = [{ title: 'Khan Academy · Fracciones', url: 'https://es.khanacademy.org/math/arithmetic/fraction-arithmetic' }];
  const history = [{ title: 'The Metropolitan Museum of Art · Ancient Egypt', url: 'https://www.metmuseum.org/toah/hd/egyp/hd_egyp.htm' }];
  const science = [{ title: 'NASA Science · The Sun', url: 'https://science.nasa.gov/sun/' }];
  const card = (question, answer, example, sources, status = 'new') => ({ id: randomUUID(), question, answer, example, sources, status });
  const studyDays = [
    { id: randomUUID(), date: day(-2), subject: 'Matemáticas', title: 'Fracciones: partes de un todo', topics: ['Numerador y denominador', 'Fracciones equivalentes', 'Suma con igual denominador'], reviewed: true, createdAt: Date.now(), cards: [
      card('¿Qué indica el denominador?', 'Indica en cuántas partes iguales se divide el entero.', 'En 3/4, el entero se divide en cuatro partes iguales.', math, 'known'),
      card('¿Qué indica el numerador?', 'Indica cuántas partes iguales se toman.', 'En 3/4 tomamos tres de las cuatro partes.', math),
      card('¿Por qué 1/2 y 2/4 son equivalentes?', 'Representan la misma cantidad. Multiplicar numerador y denominador por el mismo número distinto de cero mantiene el valor.', 'Media pizza es lo mismo que dos cuartos de pizza.', math, 'again'),
      card('¿Cómo sumamos fracciones con igual denominador?', 'Sumamos los numeradores y conservamos el denominador.', '1/4 + 2/4 = 3/4.', math),
      card('¿Cómo simplificamos una fracción?', 'Dividimos el numerador y el denominador por un divisor común distinto de cero.', '6/8 se simplifica a 3/4 al dividir ambos por 2.', math),
      card('¿Qué es una fracción impropia?', 'Es una fracción cuyo numerador es mayor o igual que el denominador.', '5/4 representa un entero y un cuarto.', math),
    ] },
    { id: randomUUID(), date: day(-1), subject: 'Historia', title: 'Egipto: el Nilo y las pirámides', topics: ['El río Nilo', 'Faraones', 'Pirámides', 'Escritura'], reviewed: true, createdAt: Date.now(), cards: [
      card('¿Por qué era importante el Nilo?', 'Proporcionaba agua, tierras fértiles y una vía de transporte.', 'Los cultivos se desarrollaban en las tierras próximas al río.', history, 'known'),
      card('¿Quién era el faraón?', 'Era el gobernante del antiguo Egipto, con autoridad política y religiosa.', 'Dirigía el reino y se vinculaba con la religión egipcia.', history),
      card('¿Para qué se construyeron muchas pirámides?', 'Como parte de complejos funerarios reales.', 'Las pirámides de Guiza pertenecen a complejos funerarios de faraones.', history),
      card('¿Qué son los jeroglíficos?', 'Un sistema de escritura que usa signos con distintas funciones, incluidas las de representar sonidos.', 'Algunos signos podían representar sonidos, no solo objetos.', history, 'again'),
      card('¿Qué era el papiro?', 'Un material de escritura elaborado a partir de la planta de papiro.', 'Se usaba para escribir documentos y textos.', history),
    ] },
    { id: randomUUID(), date: today, subject: 'Ciencias', title: 'El Sol: una estrella cercana', topics: ['Estrellas', 'Energía solar', 'Sistema solar'], reviewed: true, createdAt: Date.now(), cards: [
      card('¿Qué es el Sol?', 'Es la estrella situada en el centro de nuestro sistema solar.', 'La Tierra gira alrededor del Sol.', science),
      card('¿De dónde procede la energía del Sol?', 'Principalmente de la fusión nuclear de hidrógeno en su núcleo.', 'La fusión libera energía que finalmente llega al espacio.', science, 'known'),
      card('¿Por qué es importante la luz solar para las plantas?', 'Aporta la energía que muchas plantas usan en la fotosíntesis.', 'Las plantas convierten energía luminosa en energía química.', science),
      card('¿Debemos mirar directamente al Sol?', 'No. Mirarlo directamente puede causar daños oculares; se requieren métodos y protección especializados para observarlo.', 'Las gafas de sol comunes no sirven para observar directamente el Sol.', science),
      card('¿Qué mantiene a los planetas en órbita alrededor del Sol?', 'La gravedad del Sol, junto con el movimiento de los planetas.', 'La Tierra mantiene su órbita por la interacción entre gravedad y movimiento.', science, 'again'),
    ] },
  ];
  activities[0].returnNote = 'Me quedé en el ejercicio 2';
  return { settings: { name: 'Alex · Demo', timezone: 'Europe/Madrid', hideTimer: false, quietStart: '22:00', quietEnd: '08:00', demo: true, reducedMotion: false, highContrast: false, fontSize: 'medium', language: 'es', calendarDismissed: false, profile: { audience: 'adult', age: 18, country: 'España', course: 'Estudiante de muestra', guardianConsent: false, aiConsent: true, completed: true } }, activities,
    session: { activityId: activities[0].id, status: 'paused', startedAt: null, elapsed: 480, note: 'Me quedé en el ejercicio 2', duration: 1200 }, studyDays,
    exams: [{ id: randomUUID(), title: 'Repaso de práctica: fracciones y Egipto', date: day(15), dayIds: studyDays.slice(0, 2).map(d => d.id), createdAt: Date.now() }] };
}
