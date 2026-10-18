import { z } from 'zod';
import { authenticatedRepo, dbResult, sameOrigin, activitySchema, stepsSchema, ApiError, demoActivities, type Env } from './repo';
import { buildDayReplan, validateDayReplan } from '../src/replan';
import { parseCapture, localDate, occursOn, isDone, scheduledActivity } from '../src/domain';
import type { Activity, FocusSession, StudyDay } from '../src/types';
import * as google from './google';
import * as ai from './ai';
import {prepareDayDrafts} from './day-plan';
import {deduplicateCaptureDrafts} from '../src/capture-deduplication';
import { profileSchema as profile } from './profile';
import { publicResponse } from './public-pages';
const timezone=z.string().refine(v=>{try{new Intl.DateTimeFormat('es',{timeZone:v});return true;}catch{return false;}},'Zona horaria no válida.');
const reminderPreferences=z.object({departure:z.boolean(),resume:z.boolean(),study:z.boolean()});
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return !isNaN(+d)&&d.toISOString().slice(0,10)===v;},'Elige una fecha válida.');
export async function handle(request:Request,env:Env):Promise<Response>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/'))return publicResponse(request,env);
 if(path==='/api/health')return Response.json({status:'ok',version:'1.0.0',database:'supabase'});
 if(path==='/api/config')return Response.json({supabaseUrl:env.SUPABASE_URL||null,supabaseKey:env.SUPABASE_PUBLISHABLE_KEY||null});
 if(request.method!=='GET')sameOrigin(request);
 const repo=await authenticatedRepo(request,env),result=()=>repo.state().then(s=>Response.json(s));
 if(path!=='/api/state'&&path!=='/api/onboarding'&&path!=='/api/settings'&&!path.startsWith('/api/google/')&&!path.startsWith('/api/push/')&&!(await repo.settings()).profile.completed)throw new ApiError('Completa tu configuración antes de organizar el día.',403);
 if(path==='/api/state'&&request.method==='GET')return result();
 if(path==='/api/google/calendars'&&request.method==='GET')return Response.json(await google.calendars(repo));
 if(request.method!=='POST')throw new ApiError('Acción no disponible.',405);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new ApiError('Envía los datos como JSON.',415);
 if(!dbResult(await repo.db.rpc('hilo_allow_request',{bucket:['/api/study/topics','/api/study/generate','/api/capture/parse','/api/activity/breakdown'].includes(path)?'ai':'write'})))throw new ApiError('Demasiadas acciones seguidas. Espera un minuto e inténtalo de nuevo.',429);
 const reader=request.body?.getReader();let raw='';if(reader){const decoder=new TextDecoder();let bytes=0;try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>64000){await reader.cancel();throw new ApiError('La entrada es demasiado larga.',413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}}
 let b:any;try{b=JSON.parse(raw);}catch{throw new ApiError('Revisa los datos enviados.');}
 if(path==='/api/activity/breakdown'){
  const input=z.object({title:z.string().trim().min(1).max(160),nextStep:z.string().max(500).default(''),level:z.number().int().min(1).max(3),energy:z.enum(['low','medium','high']).default('medium')}).parse(b);
  return Response.json({steps:await ai.breakIntoSteps(repo,input)});
 }
 if(path==='/api/activity/steps'){
  const input=z.object({id:z.string().uuid(),revision:z.number().int(),steps:stepsSchema,date}).parse(b),a=await repo.activity(input.id);
  if(a.source==='google')throw new ApiError('La cita de Google es de solo lectura.',403);
  if(input.date!==localDate(new Date(),(await repo.settings()).timezone))throw new ApiError('Actualiza tu día antes de guardar el paso.',409);
  await repo.saveActivity({...a,steps:input.steps,stepsDate:input.date,nextStep:input.steps.find(s=>!s.done)?.title||a.nextStep},input.revision);return result();
 }
 if(path==='/api/day/replan'){
  const state=await repo.state();
  if(b.preview===true)return Response.json(buildDayReplan(state,Date.now()));
  const input=z.object({requestId:z.string().uuid(),plan:z.object({day:date,createdAt:z.number(),sessionSignature:z.string().max(4000),changes:z.array(z.object({id:z.string().uuid(),revision:z.number().int(),date:date.nullable(),time:clock.nullable()})).min(1).max(100),snapshot:z.array(z.object({id:z.string().uuid(),revision:z.number().int()})).max(5000)})}).parse(b);
  if(dbResult(await repo.db.from('hilo_captures').select('id').eq('owner',repo.userId).eq('id',input.requestId).maybeSingle()))return result();
  try{validateDayReplan(state,input.plan,Date.now());}catch(e){throw new ApiError((e as Error).message,409);}
  const items=input.plan.changes.map(c=>{const a=state.activities.find(a=>a.id===c.id)!;return {id:a.id,revision:a.revision,payload:scheduledActivity({...a,date:c.date,time:c.time,reminder:!!c.time&&a.reminder},state.settings.timezone)};});
  const saved=await repo.db.rpc('hilo_replan_day',{request_id:input.requestId,items,snapshot:input.plan.snapshot,session_signature:state.session});
  if(saved.error)throw new ApiError('Tu agenda cambió o no se pudo guardar. Actualiza la propuesta antes de intentarlo de nuevo.',409);return result();
 }
 if(path==='/api/onboarding'){const input=z.object({name:z.string().trim().max(40),profile,timezone:timezone.optional(),quietStart:clock.optional(),quietEnd:clock.optional(),language:z.enum(['es','en']).optional(),defaultTravelMinutes:z.number().int().min(0).max(240).optional(),reminderPreferences:reminderPreferences.optional(),calendarDismissed:z.boolean().optional(),onboardingVersion:z.literal(2).optional()}).parse(b);const previous=await repo.settings();if(!previous.profile.completed&&input.onboardingVersion!==2)throw new ApiError('Completa los cinco pasos de tu configuración.');if(input.onboardingVersion===2&&(!input.name.trim()||input.profile.studying===undefined||!input.timezone||!input.quietStart||!input.quietEnd||input.defaultTravelMinutes===undefined))throw new ApiError('Completa los pasos Conocerme y Tu día a día.');await repo.saveSettings({...await repo.settings(),...input});return result();}
 if(path==='/api/demo'){const s=await repo.state();if(s.activities.length)throw new ApiError('Tu espacio ya tiene actividades.',409);dbResult(await repo.db.rpc('hilo_capture',{request_id:crypto.randomUUID(),items:demoActivities(localDate(new Date(),s.settings.timezone),s.settings.profile.audience,repo.language)}));await repo.saveSettings({...s.settings,demo:true});return result();}
 if(path==='/api/capture/parse'){
  const input=z.object({text:z.string().trim().min(1).max(6000),capturedAt:z.number().min(0).max(Date.now()+60000),tomorrow:z.boolean().default(false),useAI:z.boolean().default(false),dayPlan:z.boolean().default(false),energy:z.enum(['low','medium','high']).default('medium')}).parse(b),s=await repo.settings(),today=localDate(new Date(input.capturedAt),s.timezone);
  const response=input.useAI?await ai.organize(repo,input.text,today,input.tomorrow,input.energy):parseCapture(input.text,today,input.tomorrow,repo.language),first=deduplicateCaptureDrafts(response);
  const prepared=input.dayPlan?prepareDayDrafts(first.drafts as Record<string,unknown>[],s):first.drafts.map(d=>input.useAI?{...activitySchema.parse(d),ambiguous:typeof d.ambiguous==='string'?d.ambiguous:''}:d);
  const final=deduplicateCaptureDrafts(prepared);
  return Response.json({drafts:final.drafts,deduplicated:first.removed+final.removed,studySuggestion:input.useAI&&input.dayPlan&&s.profile.studying!==false&&(s.profile.studying||s.profile.course)?final.drafts.filter(d=>d.purpose==='study').map(d=>d.title).join(', ')||s.profile.subjects||s.profile.course:null});
 }
 if(path==='/api/capture/save'){const input=z.object({requestId:z.string().uuid(),activities:z.array(activitySchema).min(1).max(24),dayPlan:z.boolean().default(false),energy:z.enum(['low','medium','high']).optional()}).parse(b);const settings=await repo.settings();let items;try{items=input.activities.map(a=>scheduledActivity({...a,id:a.id||crypto.randomUUID(),travelMinutes:a.travelMinutes??settings.defaultTravelMinutes??30},settings.timezone));}catch(e){throw new ApiError((e as Error).message);}dbResult(await repo.db.rpc(input.dayPlan&&input.energy?'hilo_capture_day_energy':input.dayPlan?'hilo_capture_day':'hilo_capture',{request_id:input.requestId,items,...(input.dayPlan&&input.energy?{energy:input.energy}:{})}));return result();}
 if(path==='/api/activity/update'){const a=await repo.activity(z.string().uuid().parse(b.id));if(a.source==='google')throw new ApiError('Esta cita se edita en Google.',403);let data;try{data=scheduledActivity(activitySchema.parse({...a,...b.activity,id:a.id}),(await repo.settings()).timezone);}catch(e){if(e instanceof z.ZodError)throw e;throw new ApiError((e as Error).message);}await repo.saveActivity({...a,...data,sync:a.googleId?'pending':undefined} as Activity,z.number().int().parse(b.revision));return result();}
 if(path==='/api/activity/toggle'){const a=await repo.activity(z.string().uuid().parse(b.id));if(a.source==='google')throw new ApiError('Esta cita pertenece a Google.',403);const day=date.parse(b.date),done=isDone(a,day);if(a.recurrence!=='none'){if(!occursOn(a,day))throw new ApiError('Esta actividad no se repite ese día.');a.completedDates=done?(a.completedDates||[]).filter(d=>d!==day):[...(a.completedDates||[]),day];}else a.status=done?'pending':'done';await repo.saveActivity(a,a.revision!,!done);return result();}
 if(path==='/api/activity/delete'){const a=await repo.activity(z.string().uuid().parse(b.id));if(a.source==='google')throw new ApiError('Esta cita se elimina desde Google.',403);if(a.googleId)throw new ApiError('El evento de Google permanece allí. Desconecta Google antes de eliminar esta actividad.',409);dbResult(await repo.db.from('hilo_activities').delete().eq('id',a.id).eq('owner',repo.userId));if((await repo.session())?.activityId===a.id)await repo.saveSession(null);return result();}
 if(path==='/api/session'){
  const input=z.object({action:z.enum(['start','pause','clear']),activityId:z.string().uuid().optional(),note:z.string().max(2000).default('')}).parse(b);
  if(input.action==='start'){const a=await repo.activity(input.activityId||'');const current=await repo.session();if(current?.status==='running'&&current.activityId!==a.id)throw new ApiError('Pausa la actividad actual antes de cambiar.',409);if(isDone(a,localDate(new Date(),a.timezone||(await repo.settings()).timezone)))throw new ApiError('Elige una actividad pendiente.');}
  dbResult(await repo.db.rpc('hilo_focus',{action:input.action,activity_id:input.activityId||null,note:input.note}));return result();
 }
 if(path==='/api/reminder/preview'){
  const input=z.object({activityId:z.string().uuid(),occurrence:date,action:z.enum(['10m','1h','tomorrow'])}).parse(b);
  return Response.json(dbResult(await repo.db.rpc('hilo_reschedule_preview',{activity_id:input.activityId,occurrence:input.occurrence,action:input.action})));
 }
 if(path==='/api/reminder/action'){
  const input=z.object({requestId:z.string().uuid(),activityId:z.string().uuid(),occurrence:date,kind:z.enum(['appointment','departure']),action:z.enum(['10m','1h','tomorrow','start','done']),expectedDue:z.string().datetime({offset:true}).optional()}).parse(b);
  const a=await repo.activity(input.activityId),target=a.rescheduledTo?.[input.occurrence],resolved=target?await repo.activity(target):a;
  const current=await repo.session();if(input.action==='start'&&current?.status==='running'&&current.activityId!==resolved.id)throw new ApiError('Pausa la actividad actual antes de cambiar.',409);
  const params={request_id:input.requestId,activity_id:input.activityId,occurrence:input.occurrence,kind:input.kind,action:input.action};
  if(['10m','1h','tomorrow'].includes(input.action)){if(!input.expectedDue)throw new ApiError('Revisa y confirma el nuevo horario antes de guardar.');const rescheduled=dbResult(await repo.db.rpc('hilo_reschedule_confirm',{...params,expected_due:input.expectedDue}));return Response.json({...await repo.state(),rescheduled});}
  dbResult(await repo.db.rpc('hilo_reminder_action',{...params,activity_id:resolved.id,occurrence:target?resolved.date:input.occurrence}));return result();
 }
 if(path==='/api/activity/reminder'){
  const input=z.object({id:z.string().uuid(),revision:z.number().int(),reminder:z.boolean(),travelMinutes:z.number().int().min(0).max(240)}).parse(b),a=await repo.activity(input.id);
  if(input.reminder&&(!a.date||!a.time))throw new ApiError('Elige día y hora para el aviso.');
  await repo.saveActivity({...a,reminder:input.reminder,travelMinutes:input.travelMinutes},input.revision);return result();
 }
 if(path==='/api/activity/context'){
  const input=z.object({id:z.string().uuid(),revision:z.number().int(),nextStep:z.string().max(500)}).parse(b),a=await repo.activity(input.id);
  await repo.saveActivity({...a,nextStep:input.nextStep},input.revision);return result();
 }
 if(path==='/api/settings'){const changes=z.object({name:z.string().trim().max(40),timezone:z.string().refine(v=>{try{new Intl.DateTimeFormat('es',{timeZone:v});return true;}catch{return false;}},'Zona horaria no válida.'),hideTimer:z.boolean(),quietStart:clock,quietEnd:clock,profile:profile.optional(),reducedMotion:z.boolean().optional(),highContrast:z.boolean().optional(),calendarDismissed:z.boolean().optional(),defaultTravelMinutes:z.number().int().min(0).max(240).optional(),reminderPreferences:reminderPreferences.optional(),fontSize:z.enum(['small','medium','large']).optional(),language:z.enum(['es','en']).optional()}).parse(b);const previous=await repo.settings();if(!previous.profile.completed&&changes.profile?.completed)throw new ApiError('Completa los cinco pasos de tu configuración.');await repo.saveSettings({...previous,...changes});return result();}
 if(path==='/api/data/delete'){if(b.confirm!=='BORRAR')throw new ApiError('Escribe BORRAR para confirmar.');dbResult(await repo.db.rpc('hilo_delete_own_data'));await repo.init();return result();}
 if(path==='/api/google/connect'){const input=z.object({accessToken:z.string().min(1).max(5000),refreshToken:z.string().max(5000)}).parse(b);await google.connect(repo,input.accessToken,input.refreshToken);return result();}
 if(path==='/api/google/calendar'){await google.chooseCalendar(repo,z.string().max(500).parse(b.id));await google.sync(repo);return result();}
 if(path==='/api/google/sync'){await google.sync(repo,b.date?date.parse(b.date):undefined);return result();}
 if(path==='/api/google/publish'){await google.publishActivity(repo,z.string().uuid().parse(b.id));return result();}
 if(path==='/api/google/disconnect'){await google.disconnect(repo);return result();}
 if(path==='/api/study/topics')return Response.json(await ai.topics(repo,z.string().trim().min(10).max(6000).parse(b.text)));
 if(path==='/api/study/generate'){
  const input=z.object({id:z.string().uuid(),date,subject:z.string().trim().min(1).max(80),title:z.string().trim().min(1).max(120),topics:z.array(z.string().trim().min(1).max(180)).min(1).max(5)}).parse(b);
  if(dbResult(await repo.db.from('hilo_study_days').select('id').eq('id',input.id).eq('owner',repo.userId).maybeSingle()))return result();
  const cards=await ai.makeCards(repo,input),payload:StudyDay={...input,cards,createdAt:Date.now(),reviewed:false};dbResult(await repo.db.from('hilo_study_days').insert({id:input.id,owner:repo.userId,payload}));return result();
 }
 if(path==='/api/study/update'){
  const input=z.object({id:z.string().uuid(),reviewed:z.boolean().optional(),card:z.object({id:z.string().uuid(),question:z.string().trim().min(1).max(400),answer:z.string().trim().min(1).max(1800),example:z.string().max(900),status:z.enum(['new','again','known'])}).optional()}).parse(b);
  const row=dbResult(await repo.db.from('hilo_study_days').select('payload').eq('id',input.id).eq('owner',repo.userId).maybeSingle());if(!row)throw new ApiError('Estas fichas no están disponibles.',404);const day=row.payload as StudyDay;
  if(input.reviewed!==undefined)day.reviewed=input.reviewed;if(input.card){if(!day.cards.some(c=>c.id===input.card!.id))throw new ApiError('Ficha no disponible.',404);day.cards=day.cards.map(c=>c.id===input.card!.id?{...c,...input.card}:c);}dbResult(await repo.db.from('hilo_study_days').update({payload:day}).eq('id',input.id).eq('owner',repo.userId));return result();
 }
 if(path==='/api/study/delete'){dbResult(await repo.db.from('hilo_study_days').delete().eq('id',z.string().uuid().parse(b.id)).eq('owner',repo.userId));return result();}
 if(path==='/api/exams/save'){
  const input=z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(120),date,dayIds:z.array(z.string().uuid()).min(1).max(100)}).parse(b),days=await repo.rows('hilo_study_days');if(input.dayIds.some(id=>!days.some(d=>d.id===id)))throw new ApiError('Elige fichas de tu espacio.',403);dbResult(await repo.db.from('hilo_exams').upsert({id:input.id,owner:repo.userId,payload:{...input,createdAt:Date.now()}}));return result();
 }
 if(path==='/api/exams/delete'){dbResult(await repo.db.from('hilo_exams').delete().eq('id',z.string().uuid().parse(b.id)).eq('owner',repo.userId));return result();}
 if(path==='/api/push/subscribe'){
  const subscription=z.object({endpoint:z.string().url().max(2000),language:z.enum(['es','en']).default('es'),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string().min(20).max(200),auth:z.string().min(10).max(100)})}).parse(b),url=new URL(subscription.endpoint);
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','wns.windows.com'].some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw new ApiError('Proveedor de notificaciones no admitido.');
  dbResult(await repo.db.from('hilo_push_subscriptions').upsert({owner:repo.userId,endpoint:subscription.endpoint,subscription},{onConflict:'endpoint'}));return result();
 }
 if(path==='/api/push/unsubscribe'){dbResult(await repo.db.from('hilo_push_subscriptions').delete().eq('owner',repo.userId).eq('endpoint',z.string().url().parse(b.endpoint)));return result();}
 if(path==='/api/push/test'){const res=await fetch(env.SUPABASE_URL+'/functions/v1/hilo-push',{method:'POST',headers:{Authorization:'Bearer '+repo.token,'Content-Type':'application/json'},body:JSON.stringify({test:true})});if(!res.ok)throw new ApiError('No se pudo enviar el aviso. Revisa que este dispositivo esté activado.',502);return Response.json(await res.json());}
 throw new ApiError('Acción no disponible.',404);
}
