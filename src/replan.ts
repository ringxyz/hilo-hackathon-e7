import { isDone, localDate, occursOn, timeToInstant } from './domain';
import type { Activity, AppState } from './types';
export type PlanChange={id:string;revision:number;date:string|null;time:string|null};
export type DayReplan={day:string;changes:PlanChange[];snapshot:{id:string;revision:number}[];createdAt:number;sessionSignature:string};
export function dayHasDelay(state:AppState,now:number){const day=localDate(new Date(now),state.settings.timezone);return state.activities.some(a=>occursOn(a,day)&&!isDone(a,day)&&a.time&&+timeToInstant(day,a.time,a.timezone||state.settings.timezone)+a.duration*60000<now);}
export function inQuietHours(time:string,start:string,end:string){return start===end?false:start<end?time>=start&&time<end:time>=start||time<end;}
function intervals(state:AppState,day:string,now:number){const fixed=state.activities.filter(a=>occursOn(a,day)&&a.time&&!isDone(a,day)&&(a.kind==='event'||a.source==='google'||a.recurrence!=='none'||(state.session?.status==='running'&&a.id===state.session.activityId))).map(a=>{const start=+timeToInstant(day,a.time!,a.timezone||state.settings.timezone);return {start:start-(a.kind==='event'?(a.travelMinutes??30)*60000:0),end:start+a.duration*60000};});if(state.session?.status==='running'){const s=state.session,elapsed=s.elapsed+(s.startedAt?Math.max(0,(now-s.startedAt)/1000):0);fixed.push({start:now,end:now+Math.max(0,s.duration-elapsed)*1000});}return fixed;}
export function buildDayReplan(state:AppState,now:number):DayReplan{
 const zone=state.settings.timezone,day=localDate(new Date(now),zone),fixed=intervals(state,day,now),energy=state.settings.dayEnergy?.date===day?state.settings.dayEnergy.value:'medium',gap=energy==='low'?10:5;
 const candidates=state.activities.filter(a=>occursOn(a,day)&&!isDone(a,day)&&a.kind==='task'&&a.source==='hilo'&&a.recurrence==='none'&&!(state.session?.status==='running'&&a.id===state.session.activityId)).sort((a,b)=>(a.priority||4)-(b.priority||4)||(a.time||'99').localeCompare(b.time||'99'));
 const format=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),changes:PlanChange[]=[];
 let cursor=Math.ceil(now/60000)*60000;
 // The current untimed focus also occupies the remaining focus time.
 if(state.session?.status==='running'){const s=state.session,elapsed=s.elapsed+(s.startedAt?Math.max(0,(now-s.startedAt)/1000):0);cursor+=Math.max(0,s.duration-elapsed)*1000;}
 for(const a of candidates){let selected:number|null=null;
  for(let t=Math.ceil(cursor/60000)*60000;localDate(new Date(t),zone)===day;t+=60000){const end=t+a.duration*60000;if(localDate(new Date(end-1),zone)!==day)break;
   if(fixed.some(i=>t<i.end&&end>i.start))continue;
   let quiet=false;for(let m=t;m<end;m+=60000)if(inQuietHours(format.format(m),state.settings.quietStart,state.settings.quietEnd)){quiet=true;break;}
   if(quiet)continue;selected=t;break;
  }
  const date=selected===null?null:day,time=selected===null?null:format.format(selected);
  if(a.date!==date||a.time!==time)changes.push({id:a.id,revision:a.revision!,date,time});
  if(selected!==null){fixed.push({start:selected,end:selected+a.duration*60000});cursor=selected+(a.duration+gap)*60000;}
 }
 return {day,changes,snapshot:state.activities.map(a=>({id:a.id,revision:a.revision!})).sort((a,b)=>a.id.localeCompare(b.id)),createdAt:now,sessionSignature:JSON.stringify(state.session)};
}
export function validateDayReplan(state:AppState,plan:DayReplan,now:number){
 const zone=state.settings.timezone,day=localDate(new Date(now),zone),current=state.activities.map(a=>({id:a.id,revision:a.revision!})).sort((a,b)=>a.id.localeCompare(b.id));
 if(plan.day!==day||now-plan.createdAt>15*60000||plan.createdAt>now+60000)throw Error('La propuesta necesita actualizarse. Vuelve a reorganizar tu día.');
 if(plan.sessionSignature!==JSON.stringify(state.session))throw Error('Tu foco cambió. Actualiza la propuesta.');
 if(JSON.stringify(current)!==JSON.stringify([...plan.snapshot].sort((a,b)=>a.id.localeCompare(b.id))))throw Error('Tu agenda cambió. Prepara una propuesta nueva antes de guardar.');
 const fixed=intervals(state,day,now),seen=new Set<string>();
 for(const change of plan.changes){const a=state.activities.find(a=>a.id===change.id);
  if(!a||seen.has(a.id)||a.revision!==change.revision||a.source!=='hilo'||a.kind!=='task'||a.recurrence!=='none'||!occursOn(a,day)||isDone(a,day)||(state.session?.status==='running'&&a.id===state.session.activityId))throw Error('Esta propuesta ya no está disponible. Actualiza tu día.');seen.add(a.id);
  if(change.date===null){if(change.time!==null)throw Error('Revisa el horario de la propuesta.');continue;}
  if(change.date!==day||!change.time)throw Error('Revisa el día y la hora.');
  const start=+timeToInstant(day,change.time,zone),end=start+a.duration*60000;
  if(start<now-60000||localDate(new Date(end-1),zone)!==day||fixed.some(i=>start<i.end&&end>i.start))throw Error('Ese bloque coincide con otra actividad o necesita una hora nueva.');
  for(let m=start;m<end;m+=60000)if(inQuietHours(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(m),state.settings.quietStart,state.settings.quietEnd))throw Error('El bloque coincide con tu horario de silencio.');
  fixed.push({start,end});
 }
 // Unchanged flexible blocks must also remain clear of moved blocks.
 for(const a of state.activities.filter(a=>!seen.has(a.id)&&a.kind==='task'&&a.source==='hilo'&&a.recurrence==='none'&&!(state.session?.status==='running'&&a.id===state.session.activityId)&&occursOn(a,day)&&!isDone(a,day)&&a.time)){
  const start=+timeToInstant(day,a.time!,a.timezone||zone),end=start+a.duration*60000;if(fixed.some(i=>start<i.end&&end>i.start))throw Error('El bloque coincide con una tarea que conservaste.');
 }
}
