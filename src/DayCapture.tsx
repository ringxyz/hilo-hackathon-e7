import { useRef, useState } from 'react';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { Modal } from './components';
import { api } from './api';
import { addDays, departureTime, localDate } from './domain';
import { recommendFirstTaskForToday } from './day-capture';
import { pick } from './i18n';
import type { Activity, AppState } from './types';

type Draft=Partial<Activity>&{id:string;ambiguous?:string};

export function DayCapture({state,busy,error,onClose,onSave}:{state:AppState;busy:boolean;error:string;onClose:()=>void;onSave:(activities:Partial<Activity>[],requestId:string)=>Promise<boolean>}){
  const [text,setText]=useState(''),[drafts,setDrafts]=useState<Draft[]>([]),[review,setReview]=useState(false),[editing,setEditing]=useState(false),[working,setWorking]=useState(false),[recording,setRecording]=useState(false),[message,setMessage]=useState(''),[study,setStudy]=useState<string|null>(null);
  const requestId=useRef(crypto.randomUUID()),capturedAt=useRef(Date.now()),today=localDate(new Date(capturedAt.current),state.settings.timezone),ai=state.aiConfigured&&state.settings.profile.aiConsent;

  async function propose(){
    setWorking(true);setMessage('');
    try{
      const result=await api<{drafts:Partial<Activity>[];studySuggestion:string|null}>('/api/capture/parse',{text,capturedAt:capturedAt.current,tomorrow:false,useAI:!!ai,dayPlan:true});
      const proposed=recommendFirstTaskForToday(result.drafts.map(d=>({...d,id:crypto.randomUUID()})),today);
      setDrafts(proposed);setStudy(result.studySuggestion);setReview(true);
    }catch(e){setMessage((e as Error).message);}
    finally{setWorking(false);}
  }

  function change(id:string,values:Partial<Draft>){
    setDrafts(ds=>ds.map(d=>{
      if(d.id!==id)return d;
      const next={...d,...values};
      if(!next.date){next.time=null;next.reminder=false;}
      if(!next.time){next.reminder=false;next.recurrence='none';}
      return next;
    }));
  }

  const unresolved=drafts.some(d=>!d.title?.trim()||d.ambiguous||!d.duration||d.duration<1||d.duration>240||(!!d.time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(d.time)));
  const dated=drafts.filter(d=>d.date),later=drafts.filter(d=>!d.date);
  const priority=drafts.find(d=>d.kind==='task'&&d.date===today&&!d.time);
  const onlyTasks=drafts.every(d=>d.kind==='task');

  async function save(){
    const items=drafts.map(({ambiguous,...d})=>!d.date
      ?{...d,date:null,time:null,reminder:false,recurrence:'none' as const}
      :{...d,time:d.time||null,reminder:!!d.time&&!!d.reminder});
    if(await onSave(items,requestId.current))onClose();
  }

  return <Modal title={review?pick('Revisa tus tareas','Review your tasks'):pick('Cuéntamelo','Tell me')} onClose={onClose} wide={review}>
    <div className="day-capture">
      {!review?<>
        <label className="field">{pick('Te leo','I’m listening')}
          <textarea autoFocus rows={6} maxLength={6000} value={text} onChange={e=>setText(e.target.value)} placeholder={state.settings.profile.audience==='child'?pick('¿Qué tienes hoy? Puedes contarlo como quieras.','What is happening today? Tell it your way.'):state.settings.profile.studying?pick('Hoy tengo clase a las 9:00, paseo a las 19:30 y quiero repasar fracciones…','Class at 9:00, a walk at 19:30 and I want to review fractions…'):pick('Hoy tengo una reunión a las 10:00 y quiero comprar un regalo…','A meeting at 10:00 today, and I want to buy a present…')}/>
        </label>
        <VoiceInput value={text} onChange={setText} disabled={working||busy} onRecording={setRecording}/>
        <p className="field-help">{ai?pick('Revisarás todas las propuestas antes de añadirlas. Este texto y tu contexto se envían a Anthropic.','Review every suggestion before adding it. This text and your context are sent to Anthropic.'):pick('La IA está desactivada. Hilo separará las tareas con reglas sencillas; podrás revisar cada propuesta.','AI is off. Hilo will separate tasks with simple rules, and you can review each suggestion.')}</p>
        <button className="button primary full" disabled={working||busy||recording||!text.trim()||!navigator.onLine} onClick={propose}>
          <Sparkles size={19}/>{working?pick('Revisando todo lo que contaste…','Reviewing everything you shared…'):pick('Separar y revisar tareas','Separate and review tasks')}
        </button>
      </>:<>
        <p className="field-help">{pick('Revisa la propuesta. Te sugerimos un primer paso para hoy y guardamos el resto en Después. Puedes cambiarlo antes de añadir.','Review the suggestions. We recommend one first step for today and save the rest in Later. You can change this before adding them.')}</p>
        {priority&&<p className="plan-priority"><strong>{pick('Para empezar hoy:','Suggested first step today:')}</strong> {priority.title}</p>}
        <div className="day-plan-list">
          {drafts.map(d=>{
            let departure=null;
            try{departure=departureTime(d as Activity,d.date,state.settings.timezone);}catch{}
            const when=d.date
              ?d.date===today?(d.time?pick(`Hoy · ${d.time}`,`Today · ${d.time}`):pick('Prioridad para hoy','Today’s priority'))
                :d.date===addDays(today,1)?(d.time?pick(`Mañana · ${d.time}`,`Tomorrow · ${d.time}`):pick('Mañana','Tomorrow'))
                  :d.time?`${d.date} · ${d.time}`:d.date
              :pick('Después','Later');
            return <article className="day-plan-item" key={d.id}>
              {editing?<>
                <label className="field">{pick('Actividad','Activity')}<input maxLength={160} required value={d.title||''} onChange={e=>change(d.id,{title:e.target.value})}/></label>
                <div className="form-grid">
                  <label className="field">{pick('Día','Day')}<input type="date" value={d.date||''} onChange={e=>change(d.id,{date:e.target.value||null,time:e.target.value?d.time:null,reminder:e.target.value?d.reminder:false})}/></label>
                  <label className="field">{pick('Hora (opcional)','Time (optional)')}<input type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" value={d.time||''} onChange={e=>{const raw=e.target.value;const time=(/^\d{4}$/.test(raw)?raw.slice(0,2)+':'+raw.slice(2):raw)||null;change(d.id,{time,date:time?d.date||today:d.date||null,ambiguous:'',reminder:!!time});}}/></label>
                  <label className="field">{pick('Duración en minutos','Duration in minutes')}<input type="number" min={1} max={240} value={d.duration||20} onChange={e=>change(d.id,{duration:Number(e.target.value)})}/></label>
                  {d.kind==='event'&&<label className="field">{pick('Tiempo para llegar','Travel time')}<select value={d.travelMinutes??state.settings.defaultTravelMinutes??30} onChange={e=>change(d.id,{travelMinutes:Number(e.target.value)})}>{Array.from(new Set([0,15,30,45,60,d.travelMinutes??30])).map(n=><option key={n} value={n}>{n} min</option>)}</select></label>}
                </div>
                <label className="field">{pick('Siguiente paso','Next step')}<input maxLength={500} value={d.nextStep||''} onChange={e=>change(d.id,{nextStep:e.target.value})}/></label>
                <label className="checkbox-label"><input type="checkbox" checked={!!d.reminder} disabled={!d.time||!d.date} onChange={e=>change(d.id,{reminder:e.target.checked})}/>{pick('Recordármelo','Remind me')}</label>
                <button className="text-button" onClick={()=>setDrafts(ds=>ds.filter(a=>a.id!==d.id))}>{pick('Quitar de la propuesta','Remove from suggestions')}</button>
              </>:<>
                <div className="plan-item-header"><strong>{d.title}</strong><span>{when}</span></div>
                <p>{d.duration} min{departure&&!!(d.travelMinutes??30)&&<> · {pick('Sal a las ','Leave at ')}{departure.time}{departure.date!==d.date?pick(' el día anterior',' the previous day'):''}</>}</p>
                {d.nextStep&&<p className="plan-next-step">{d.nextStep}</p>}
                {d.date&&d.time&&<small>{pick('Podrás posponer 10 min, 1 h o Mañana desde Ver mi día.','Snooze 10 min, 1 h or Tomorrow from View my day.')}</small>}
              </>}
              {d.ambiguous&&<p className="inline-error">{d.ambiguous} <button className="text-button" onClick={()=>change(d.id,{ambiguous:'',date:null,time:null,reminder:false})}>{pick('Dejar en Después','Leave in Later')}</button></p>}
            </article>;
          })}
        </div>
        {study&&<p className="plan-study"><strong>{pick('Hoy solo 5','Just 5 today')}</strong> · {study}<br/><span>{pick('En Repaso puedes revisar tus fichas o crear nuevas con fuentes.','Review your cards or create new ones with sources in Review.')}</span></p>}
        <p className="field-help">{pick(`${dated.length} con día asignado y ${later.length} en Después. Las citas con hora conservarán sus avisos.`,`${dated.length} assigned a day and ${later.length} in Later. Appointments with a time keep their reminders.`)}</p>
        <button className="button primary full" disabled={busy||!drafts.length||unresolved} onClick={save}><Check size={19}/>{busy?pick('Añadiendo…','Adding…'):pick(`Agregar ${drafts.length} ${onlyTasks?(drafts.length===1?'tarea':'tareas'):'actividades'}`,`Add ${drafts.length} ${onlyTasks?(drafts.length===1?'task':'tasks'):'items'}`)}</button>
        {unresolved&&<p className="field-help">{pick('Revisa o corrige las propuestas que aún tienen una duda.','Review or edit suggestions that still have an unresolved question.')}</p>}
        <div className="day-plan-actions"><button className="button white" disabled={busy} onClick={()=>setEditing(!editing)}>{editing?pick('Ver propuesta','Preview plan'):pick('Cambiar algo','Change something')}</button><button className="text-button" disabled={busy} onClick={()=>{setReview(false);setEditing(false);}}><ArrowLeft size={16}/>{pick('Volver a mi texto','Back to my text')}</button></div>
      </>}
      {(message||error)&&<p className="inline-error" role="alert">{message||error}</p>}
    </div>
  </Modal>;
}
