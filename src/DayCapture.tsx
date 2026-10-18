import { useRef, useState } from 'react';
import { Check, Inbox, Sparkles, X } from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { CaptureHints } from './CaptureHints';
import { MicroSteps } from './MicroSteps';
import { Modal } from './components';
import { api } from './api';
import { addDays, departureTime, isDone, localDate, occursOn } from './domain';
import { recommendFirstTaskForToday, adaptDayToEnergy } from './day-capture';
import { pick } from './i18n';
import {readDraft,useDraftPersistence,DraftExit,DraftRestore} from './drafts';
import {captureExample} from './profile-context';
import {deduplicateCaptureDrafts} from './capture-deduplication';
import type { Activity, AppState, Energy } from './types';

type Draft=Partial<Activity>&{id:string;ambiguous?:string;decision?:'add'|'discard'};
type SavedDraft={text:string;drafts:Draft[];review:boolean;editing:string|null;study:string|null;energy:Energy;requestId:string;rawRequestId:string;capturedAt:number;deduplicated?:number;alreadyPlanned?:number};

export function DayCapture({state,busy,error,onClose,onSave,onRawSave,mode='day'}:{state:AppState;busy:boolean;error:string;onClose:()=>void;onRawSave:(text:string,id:string)=>Promise<boolean>;mode?:'day'|'idea';onSave:(activities:Partial<Activity>[],requestId:string,energy:Energy)=>Promise<boolean>}){
  const initial=useRef(readDraft<SavedDraft>(state.ownerId,mode)),saved=initial.current;
  const [text,setText]=useState(saved?.text||''),[drafts,setDrafts]=useState<Draft[]>(saved?.drafts||[]),[review,setReview]=useState(saved?.review||false),[editing,setEditing]=useState<string|null>(saved?.editing||null),[working,setWorking]=useState(false),[recording,setRecording]=useState(false),[message,setMessage]=useState(''),[study,setStudy]=useState<string|null>(saved?.study||null),[exit,setExit]=useState(false),[restoring,setRestoring]=useState(!!saved),[deduplicated,setDeduplicated]=useState(saved?.deduplicated||0),[alreadyPlanned,setAlreadyPlanned]=useState(saved?.alreadyPlanned||0);
  const requestId=useRef(saved?.requestId||crypto.randomUUID()),capturedAt=useRef(saved?.capturedAt||Date.now()),today=localDate(new Date(capturedAt.current),state.settings.timezone),ai=state.aiConfigured&&state.settings.profile.aiConsent;
  const [energy,setEnergy]=useState<Energy>(saved?.energy||(state.settings.dayEnergy?.date===today?state.settings.dayEnergy.value:'medium'));
  const existing=state.activities.filter(a=>a.kind==='task'&&occursOn(a,today)&&!isDone(a,today)).length;
  const rawRequestId=useRef(saved?.rawRequestId||crypto.randomUUID()),isDay=mode==='day';
  const persistence=useDraftPersistence(state.ownerId,mode,{text,drafts,review,editing,study,energy,requestId:requestId.current,rawRequestId:rawRequestId.current,capturedAt:capturedAt.current,deduplicated,alreadyPlanned},!!text.trim()||drafts.length>0);
  const draftValue={text,drafts,review,editing,study,energy,requestId:requestId.current,rawRequestId:rawRequestId.current,capturedAt:capturedAt.current,deduplicated,alreadyPlanned};
  function requestClose(){if(working||busy)return;if(restoring){onClose();return;}if(text.trim()||drafts.length)setExit(true);else onClose();}
  const empty=!text.trim(),waiting=working||busy;
  const rawReason=empty?pick('Escribe o dicta algo para continuar.','Write or dictate something to continue.'):recording?pick('Detén el dictado y revisa tu texto para continuar.','Stop dictation and review your text to continue.'):waiting?pick('Espera a que termine la acción en curso.','Wait for the current action to finish.'):'';
  const aiReason=rawReason||(!navigator.onLine?pick('Sin conexión. Puedes guardar tal cual; para revisar con IA necesitas internet.','Offline. You can save as-is; AI review needs internet.'):!ai?pick('La IA no está activada. Puedes guardar tal cual o activar la IA en Ajustes.','AI is not enabled. Save as-is or enable AI in Settings.'):'');
  async function saveRaw(){if(rawReason)return;setWorking(true);setMessage('');try{if(await onRawSave(text,rawRequestId.current)){persistence.clear();onClose();}}catch(e){setMessage((e as Error).message);}finally{setWorking(false);}}

  async function propose(){
    setWorking(true);setMessage('');
    try{
      if(aiReason)return;
      const result=await api<{drafts:Partial<Activity>[];studySuggestion:string|null;deduplicated?:number}>('/api/capture/parse',{text,capturedAt:capturedAt.current,tomorrow:false,useAI:true,dayPlan:true,energy});
      const pending=state.activities.filter(a=>a.status==='pending'&&!isDone(a,today));
      const combined=deduplicateCaptureDrafts(result.drafts,pending);
      const identified=combined.drafts.map(d=>({...d,id:crypto.randomUUID()}));
      const proposed=isDay?adaptDayToEnergy(recommendFirstTaskForToday(identified,today),today,energy,existing):identified;
      setDrafts(proposed);setStudy(result.studySuggestion);setDeduplicated(result.deduplicated||0);setAlreadyPlanned(combined.removed);setReview(true);
    }catch(e){setMessage((e as Error).message);}
    finally{setWorking(false);}
  }

  function change(id:string,values:Partial<Draft>){
    setDrafts(ds=>ds.map(d=>{
      if(d.id!==id)return d;
      const next={...d,...values};
      if(!next.date){next.time=null;next.reminder=false;}
      if(!next.time)next.reminder=false;
      return next;
    }));
  }

  const chosen=drafts.filter(d=>d.decision==='add'),undecided=drafts.some(d=>!d.decision);
  const overCapacity=isDay&&energy==='low'&&chosen.filter(d=>d.kind==='task'&&d.date===today).length>Math.max(0,3-existing);
  const unresolved=overCapacity||chosen.some(d=>!d.title?.trim()||d.ambiguous||!d.duration||d.duration<1||d.duration>240||(!!d.time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(d.time)));
  const dated=chosen.filter(d=>d.date),later=chosen.filter(d=>!d.date);
  const priority=drafts.find(d=>d.kind==='task'&&d.date===today&&!d.time&&d.decision!=='discard');

  async function save(){
    if(waiting||undecided||unresolved||!chosen.length)return;
    const items=chosen.map(({ambiguous,decision,...d})=>!d.date
      ?{...d,date:null,time:null,reminder:false,recurrence:'none' as const}
      :{...d,time:d.time||null,reminder:!!d.time&&!!d.reminder});
    if(await onSave(items,requestId.current,energy)){persistence.clear();onClose();}
  }

  return <Modal title={restoring?pick('Tienes un borrador guardado.','You have a saved draft.'):review?pick('Revisa tus tareas','Review your tasks'):isDay?pick('Cuéntame tu día','Tell me about your day'):pick('Guardar idea','Save an idea')} onClose={requestClose} wide={review}>
    {restoring?<DraftRestore onContinue={()=>setRestoring(false)} onDiscard={()=>{persistence.clear();setText('');setDrafts([]);setReview(false);setEditing(null);setStudy(null);setDeduplicated(0);setAlreadyPlanned(0);setEnergy(state.settings.dayEnergy?.date===today?state.settings.dayEnergy.value:'medium');requestId.current=crypto.randomUUID();rawRequestId.current=crypto.randomUUID();capturedAt.current=Date.now();setRestoring(false);}}/>:<>
    <div className="day-capture">
      {!review?<>
        {isDay&&<fieldset className="energy-picker"><legend>{pick('¿Cómo está tu energía hoy?','How is your energy today?')}</legend><div className="choice-row">{(['low','medium','high'] as const).map(e=><button type="button" key={e} aria-pressed={e===energy} onClick={()=>setEnergy(e)}>{e==='low'?pick('Baja','Low'):e==='medium'?pick('Media','Medium'):pick('Alta','High')}</button>)}</div></fieldset>}
        <p className="capture-guide">{pick('1. Dicta o escribe · 2. Revisa tu texto · 3. Pulsa Revisar · 4. Acepta o descarta cada tarea','1. Dictate or write · 2. Review your text · 3. Select Review · 4. Accept or discard each task')}</p>
        <label className="field">{pick('Te leo','I’m listening')}
          <textarea autoFocus rows={6} maxLength={6000} value={text} onChange={e=>setText(e.target.value)} placeholder={captureExample(state.settings.profile)}/>
        </label>
        <CaptureHints text={text} today={today} onChange={setText}/>
        <VoiceInput reviewHint value={text} onChange={setText} disabled={working||busy} onRecording={setRecording}/>
        <div className="capture-actions"><button className="button white full" disabled={!!rawReason} aria-describedby={rawReason?'capture-blocked':undefined} onClick={saveRaw}><Inbox size={19}/>{pick('Guardar tal cual en Después','Save as-is to Later')}</button>
        <button className="button primary full" disabled={!!aiReason} aria-describedby={aiReason?'capture-blocked':undefined} onClick={propose}><Sparkles size={19}/>{pick('Revisar con IA y separar tareas','Review with AI and separate tasks')}</button></div>
        <p className="field-help capture-meaning">{pick('Guardar tal cual no usa IA. Revisar con IA solo propone, tú decides qué se guarda.','Saving as-is does not use AI. AI review only proposes tasks; you decide what gets saved.')}</p>
        {aiReason&&<p id="capture-blocked" className="field-help" role="status">{aiReason}</p>}
      </>:<>
        <p className="capture-review-notice">{pick('Nada se guardó todavía. Revisa cada propuesta y elige.','Nothing has been saved yet. Review each suggestion and choose.')}</p>
        {deduplicated>0&&<p className="field-help" role="status">{pick(`He reunido ${deduplicated} ${deduplicated===1?'mención repetida':'menciones repetidas'} dentro de tu relato.`,`I combined ${deduplicated} repeated ${deduplicated===1?'mention':'mentions'} from your story.`)}</p>}
        {alreadyPlanned>0&&<p className="field-help" role="status">{pick(`No añadí ${alreadyPlanned===1?'una tarea':'tareas'} porque ${alreadyPlanned===1?'ya aparece':'ya aparecen'} en tu lista pendiente.`,`I skipped ${alreadyPlanned===1?'one task':'tasks'} because ${alreadyPlanned===1?'it is':'they are'} already on your pending list.`)}</p>}
        {priority&&<p className="plan-priority"><strong>{pick('Para empezar hoy:','Suggested first step today:')}</strong> {priority.title}</p>}
        {isDay&&energy==='low'&&<p className="field-help">{pick(`Energía baja: como máximo ${Math.max(0,3-existing)} tareas nuevas para hoy, además de tus citas. Pausas de 10 min entre bloques al reorganizar. Lo demás te espera en Después.`, `Low energy: up to ${Math.max(0,3-existing)} new tasks today, plus your appointments. Replanning leaves 10-minute breaks between blocks. The rest waits in Later.`)}</p>}
        <div className="day-plan-list">
          {drafts.map(d=>{
            let departure=null;
            try{departure=departureTime(d as Activity,d.date,state.settings.timezone);}catch{}
            const when=d.date
              ?d.date===today?(d.time?pick(`Hoy · ${d.time}`,`Today · ${d.time}`):pick('Prioridad para hoy','Today’s priority'))
                :d.date===addDays(today,1)?(d.time?pick(`Mañana · ${d.time}`,`Tomorrow · ${d.time}`):pick('Mañana','Tomorrow'))
                  :d.time?`${d.date} · ${d.time}`:d.date
              :pick('Después','Later');
            return <article className={`day-plan-item ${d.decision==='discard'?'proposal-discarded':''}`} key={d.id}>
              {editing===d.id?<>
                <label className="field">{pick('Actividad','Activity')}<input maxLength={160} required value={d.title||''} onChange={e=>change(d.id,{title:e.target.value})}/></label>
                <div className="form-grid">
                  <label className="field">{pick('Día','Day')}<input type="date" value={d.date||''} onChange={e=>change(d.id,{date:e.target.value||null,time:e.target.value?d.time:null,reminder:e.target.value?d.reminder:false})}/></label>
                  <label className="field">{pick('Hora (opcional)','Time (optional)')}<input type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" value={d.time||''} onChange={e=>{const raw=e.target.value;const time=(/^\d{4}$/.test(raw)?raw.slice(0,2)+':'+raw.slice(2):raw)||null;change(d.id,{time,date:time?d.date||today:d.date||null,ambiguous:'',reminder:!!time});}}/></label>
                  <label className="field">{pick('Duración en minutos','Duration in minutes')}<input type="number" min={1} max={240} value={d.duration||20} onChange={e=>change(d.id,{duration:Number(e.target.value)})}/></label>
                  {d.kind==='event'&&<label className="field">{pick('Tiempo para llegar','Travel time')}<select value={d.travelMinutes??state.settings.defaultTravelMinutes??30} onChange={e=>change(d.id,{travelMinutes:Number(e.target.value)})}>{Array.from(new Set([0,15,30,45,60,d.travelMinutes??30])).map(n=><option key={n} value={n}>{n} min</option>)}</select></label>}
                </div>
                <label className="field">{pick('Siguiente paso','Next step')}<input maxLength={500} value={d.nextStep||''} onChange={e=>change(d.id,{nextStep:e.target.value})}/></label>
                <label className="checkbox-label"><input type="checkbox" checked={!!d.reminder} disabled={!d.time||!d.date} onChange={e=>change(d.id,{reminder:e.target.checked})}/>{pick('Recordármelo','Remind me')}</label>
              </>:<>
                <div className="plan-item-header"><strong>{d.title}</strong><span>{when}</span></div>
                <p>{d.duration} min{departure&&!!(d.travelMinutes??30)&&<> · {pick('Sal a las ','Leave at ')}{departure.time}{departure.date!==d.date?pick(' el día anterior',' the previous day'):''}</>}</p>
                {d.nextStep&&<p className="plan-next-step">{d.nextStep}</p>}
                {d.date&&d.time&&<small>{pick('Podrás posponer 10 min, 1 h o Mañana desde Ver mi día.','Snooze 10 min, 1 h or Tomorrow from View my day.')}</small>}
              </>}
              {d.kind==='task'&&d.decision!=='discard'&&<MicroSteps activity={d} enabled={!!ai} energy={energy} busy={busy} onChange={steps=>change(d.id,{steps,stepsDate:today,nextStep:steps.find(s=>!s.done)?.title||''})}/>}
              {d.ambiguous&&d.decision!=='discard'&&<p className="inline-error">{d.ambiguous} <button className="text-button" onClick={()=>change(d.id,{ambiguous:'',date:null,time:null,reminder:false})}>{pick('Dejar en Después','Leave in Later')}</button></p>}
              <div className="proposal-decisions"><button className="button white" disabled={busy} aria-pressed={d.decision==='add'} onClick={()=>change(d.id,{decision:'add'})}><Check size={17}/>{pick('Añadir','Add')}</button><button className="button white" disabled={busy} aria-pressed={d.decision==='discard'} onClick={()=>change(d.id,{decision:'discard'})}><X size={17}/>{pick('Descartar','Discard')}</button><button className="text-button" disabled={busy} onClick={()=>setEditing(editing===d.id?null:d.id)}>{editing===d.id?pick('Ver propuesta','Preview plan'):pick('Editar','Edit')}</button></div>
            </article>;
          })}
        </div>
        {study&&<p className="plan-study"><strong>{pick('Hoy solo 5','Just 5 today')}</strong> · {study}<br/><span>{pick('En Repaso puedes revisar tus fichas o crear nuevas con fuentes.','Review your cards or create new ones with sources in Review.')}</span></p>}
        <p className="field-help">{pick(`${dated.length} con día asignado y ${later.length} en Después. Las citas con hora conservarán sus avisos.`,`${dated.length} assigned a day and ${later.length} in Later. Appointments with a time keep their reminders.`)}</p>
        <div className="review-final-actions"><button className="button primary full" disabled={busy||undecided||!chosen.length||unresolved} onClick={save}><Check size={19}/>{pick('Guardar las elegidas','Save chosen tasks')}</button><button className="button white full" disabled={busy} onClick={requestClose}>{pick('Cancelar','Cancel')}</button></div>
        {(busy||undecided||!chosen.length)&&<p className="field-help" role="status">{busy?pick('Guardando las tareas elegidas. Espera un momento.','Saving your chosen tasks. Please wait.'):undecided?pick('Elige Añadir o Descartar en cada propuesta para continuar.','Choose Add or Discard for each suggestion to continue.'):pick('No has elegido ninguna tarea. Puedes añadir alguna o cancelar.','No tasks are selected. Add one or cancel.')}</p>}
        {unresolved&&<p className="field-help">{overCapacity?pick('Para energía baja deja como máximo 3 tareas en Hoy, contando las que ya tienes. Puedes cambiar el día del resto.','For low energy, keep up to 3 tasks in Today including your existing tasks. You can change the day for the rest.'):pick('Revisa o corrige las propuestas que aún tienen una duda.','Review or edit suggestions that still have an unresolved question.')}</p>}
      </>}
      {(message||error)&&<p className="inline-error" role="alert">{message||error}</p>}
    {exit&&<DraftExit storageError={persistence.storageError} onContinue={()=>setExit(false)} onSave={()=>{if(persistence.save(draftValue))onClose();}} onDiscard={()=>{persistence.clear();onClose();}}/>}
    </div>
    </>}
  </Modal>;
}
