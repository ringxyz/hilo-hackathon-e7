import type {Profile} from './types';
import {pick} from './i18n';
export function cleanSampleCourse(course:string){return /^(estudiante de muestra|sample student)$/i.test(course.trim())?'':course;}
export function courseExample(p:Profile){
  if(p.studyLevel==='primary'||(!p.studyLevel&&p.audience==='child'))return pick('4.º de Primaria','Year 4 (primary school)');
  if(p.studyLevel==='university')return pick('2.º de Grado','Second year of university');
  if(p.studyLevel==='baccalaureate')return pick('1.º de Bachillerato','First year of upper secondary school');
  if(p.studyLevel==='secondary'||(!p.studyLevel&&p.audience==='teen'))return pick('2.º de ESO','Year 9 (secondary school)');
  if(p.studyLevel==='other')return pick('Curso de idiomas','Language course');
  return '';
}
export function captureExample(p:Profile){
  if(p.audience==='child')return pick('Hoy quiero preparar mi mochila y después jugar…','Today I want to pack my school bag and then play…');
  if(p.studying&&p.useCases?.includes('work'))return pick('Tengo una reunión a las 10:00 y quiero repasar inglés al volver a casa…','I have a meeting at 10:00 and want to review English when I get home…');
  if(p.studying)return pick('Hoy tengo clase a las 9:00, un paseo y quiero repasar un tema…','Today I have class at 9:00, a walk and want to review a topic…');
  if(p.useCases?.includes('home'))return pick('Quiero hacer la compra y preparar la cena…','I want to buy groceries and prepare dinner…');
  if(p.useCases?.includes('work'))return pick('Tengo una reunión a las 10:00 y quiero enviar un presupuesto…','I have a meeting at 10:00 and want to send a quote…');
  return pick('Quiero dar un paseo y comprar un regalo…','I want to go for a walk and buy a present…');
}
