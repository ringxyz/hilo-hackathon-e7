import { useEffect, useState } from 'react';
import { Modal } from './components';
import { pick } from './i18n';
export function Relief({onClose}:{onClose:()=>void}){
 const [exercise,setExercise]=useState<number|null>(null),[elapsed,setElapsed]=useState(0);
 useEffect(()=>{setElapsed(0);if(exercise===null)return;const start=Date.now(),id=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(id);},[exercise]);
 const finished=(exercise===0&&elapsed>=60)||(exercise===2&&elapsed>=30),phase=elapsed%10<4?pick('Inspira suave','Breathe in gently'):pick('Suelta el aire','Breathe out');
 return <Modal title={pick('Respira, vuelve','Breathe and return')} onClose={onClose}><p className="modal-description">{pick('Está bien parar un momento. Vuelve cuando quieras.','It’s okay to stop for a moment. Return when you are ready.')}</p>
 {exercise===null?<div className="relief-options">{[pick('Respira 1 min','Breathe for 1 minute'),pick('Nombra 3 cosas que ves','Name 3 things you can see'),pick('Bebe agua y estira 30 seg','Drink water and stretch for 30 seconds')].map((s,i)=><button className="button white full" key={s} onClick={()=>setExercise(i)}>{s}</button>)}</div>:<div className="relief-exercise">{exercise===0&&<div className={'breath-orb '+(finished?'resting':'breathing')} aria-hidden="true"/>}<p role="status">{finished?pick('Vuelve cuando quieras.','Return when you are ready.'):exercise===0?phase:exercise===1?pick('Mira a tu alrededor y nombra tres cosas, una por una.','Look around and name three things, one at a time.'):pick('Si te viene bien, toma agua y estira suavemente.','If it feels comfortable, drink some water and stretch gently.')}</p><button className="text-button" onClick={()=>setExercise(null)}>{pick('Elegir otro ejercicio','Choose another exercise')}</button></div>}
 <button className="button primary full" onClick={onClose}>{pick('Volver a lo mío','Return to my task')}</button></Modal>;
}
