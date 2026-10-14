import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { users,activities,sessions,captures,integrations,oauthStates } from "../db/schema";
import { Repo,owner,sameOrigin,errorResponse,activitySchema,ApiError,demoActivities,defaults,type Env } from "./repo";
import { parseCapture,localDate,occursOn,isDone,pauseSession } from "../src/domain";
import type { Activity,FocusSession } from "../src/types";
import * as google from "./google";

async function handle(r:Request,env:Env):Promise<Response>{
  const url=new URL(r.url),path=url.pathname;
  if(!path.startsWith("/api/"))return env.ASSETS.fetch(r);
  if(path==="/api/health")return Response.json({status:"ok",version:"0.1.0"});
  const repo=new Repo(env,owner(r));if(r.method!=="GET")sameOrigin(r);await repo.init();
  const result=()=>repo.state().then(s=>Response.json(s));
  if(path==="/api/state"&&r.method==="GET")return result();
  if(path==="/api/google/start"&&r.method==="GET")return google.startOAuth(repo,url);
  if(path==="/api/google/callback"&&r.method==="GET")return google.oauthCallback(repo,url);
  if(path==="/api/google/calendars"&&r.method==="GET")return Response.json(await google.calendars(repo));
  if(r.method!=="POST")throw new ApiError("Acción no disponible.",405);
  if(path==="/api/voice"){
    if(!env.VOICE_API_KEY)throw new ApiError("La transcripción está pendiente de configuración. Puedes escribir.",503);
    if(Number(r.headers.get("content-length")||0)>12_000_000)throw new ApiError("La grabación es demasiado grande.",413);
    const form=await r.formData();const file=form.get("file");if(!(file instanceof File)||file.size>12_000_000)throw new ApiError("Selecciona una grabación breve.");const types=["audio/webm","audio/mp4","audio/ogg","audio/wav"];if(!types.some(t=>file.type.startsWith(t)))throw new ApiError("Formato de audio no compatible.");
    const data=new FormData();data.set("file",file);data.set("model","gpt-4o-mini-transcribe");data.set("language","es");const response=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:"Bearer "+env.VOICE_API_KEY},body:data});if(!response.ok)throw new ApiError("No se pudo transcribir. Puedes escribir o volver a grabar.",502);const transcript=await response.json() as any;return Response.json({text:transcript.text});
  }
  if(Number(r.headers.get("content-length")||0)>64000)throw new ApiError("La entrada es demasiado larga.",413);
  const b=await r.json() as any;
  if(path==="/api/demo"){
    const state=await repo.state();if(state.activities.length)throw new ApiError("Tu espacio ya tiene actividades. Borra los datos antes de cargar los ejemplos.",409);
    const examples=demoActivities(localDate(new Date(),state.settings.timezone));await repo.db.batch([...examples.map(a=>repo.db.insert(activities).values({id:a.id,owner:repo.userId,payload:JSON.stringify(a),updatedAt:Date.now()})),repo.db.update(users).set({settings:JSON.stringify({...state.settings,demo:true})}).where(eq(users.id,repo.userId))] as any);return result();
  }
  if(path==="/api/capture/parse"){
    const input=z.object({text:z.string().trim().min(1).max(6000),capturedAt:z.number().min(0).max(Date.now()+60000),tomorrow:z.boolean().default(false)}).parse(b);const settings=await repo.settings();return Response.json({drafts:parseCapture(input.text,localDate(new Date(input.capturedAt),settings.timezone),input.tomorrow)});
  }
  if(path==="/api/capture/save"){
    const input=z.object({requestId:z.string().uuid(),activities:z.array(activitySchema).min(1).max(12)}).parse(b);const id=repo.userId+":"+input.requestId;const [prior]=await repo.db.select().from(captures).where(and(eq(captures.id,id),eq(captures.owner,repo.userId)));if(prior)return result();
    const items=input.activities.map(a=>({...a,id:a.id||crypto.randomUUID()}));await repo.db.batch([repo.db.insert(captures).values({id,owner:repo.userId,result:JSON.stringify(items.map(x=>x.id)),createdAt:Date.now()}),...items.map(a=>repo.db.insert(activities).values({id:a.id,owner:repo.userId,payload:JSON.stringify(a),updatedAt:Date.now()}))]);return result();
  }
  if(path==="/api/activity/update"){
    const id=z.string().uuid().parse(b.id);const existing=await repo.activity(id);if(existing.source==="google")throw new ApiError("Esta cita es de solo lectura; edítala en Google.",403);const revision=z.number().int().parse(b.revision);const data=activitySchema.parse({...existing,...b.activity,id});const updated={...existing,...data,sync:existing.googleId?"pending":undefined};const rows=await repo.db.update(activities).set({payload:JSON.stringify(updated),revision:revision+1,updatedAt:Date.now()}).where(and(eq(activities.id,id),eq(activities.owner,repo.userId),eq(activities.revision,revision))).returning();if(!rows.length)throw new ApiError("La actividad cambió en otra pestaña. Actualiza antes de guardar.",409);return result();
  }
  if(path==="/api/activity/toggle"){
    const a=await repo.activity(z.string().uuid().parse(b.id));if(a.source==="google")throw new ApiError("Esta cita pertenece a Google.",403);const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(b.date);const done=isDone(a,date);if(a.recurrence!=="none"){if(!occursOn(a,date))throw new ApiError("Esta actividad no se repite ese día.");a.completedDates=done?(a.completedDates||[]).filter(d=>d!==date):[...(a.completedDates||[]),date];}else a.status=done?"pending":"done";
    const [s]=await repo.db.select().from(sessions).where(eq(sessions.owner,repo.userId));const queries:any[]=[repo.db.update(activities).set({payload:JSON.stringify(a),revision:a.revision!+1,updatedAt:Date.now()}).where(and(eq(activities.id,a.id),eq(activities.owner,repo.userId),eq(activities.revision,a.revision!)))];if(!done&&s&&JSON.parse(s.payload).activityId===a.id)queries.push(repo.db.delete(sessions).where(eq(sessions.owner,repo.userId)));await repo.db.batch(queries as any);return result();
  }
  if(path==="/api/activity/delete"){
    const a=await repo.activity(z.string().uuid().parse(b.id));if(a.source==="google")throw new ApiError("Esta cita se elimina desde Google.",403);if(a.googleId)throw new ApiError("Esta actividad tiene un evento en Google. Desconecta Google antes de borrarla; el evento remoto permanecerá.",409);const [s]=await repo.db.select().from(sessions).where(eq(sessions.owner,repo.userId));const queries:any[]=[repo.db.delete(activities).where(and(eq(activities.id,a.id),eq(activities.owner,repo.userId)))];if(s&&JSON.parse(s.payload).activityId===a.id)queries.push(repo.db.delete(sessions).where(eq(sessions.owner,repo.userId)));await repo.db.batch(queries as any);return result();
  }
  if(path==="/api/session"){
    const action=z.enum(["start","pause","clear"]).parse(b.action);const [row]=await repo.db.select().from(sessions).where(eq(sessions.owner,repo.userId));const current:FocusSession|null=row?JSON.parse(row.payload):null;
    if(action==="clear"){await repo.db.delete(sessions).where(eq(sessions.owner,repo.userId));return result();}
    let s:FocusSession;
    if(action==="pause"){if(!current)throw new ApiError("No hay una actividad en curso.");s=pauseSession(current,z.string().max(2000).parse(b.note||""));const paused=await repo.activity(current.activityId);paused.note=s.note;await repo.db.update(activities).set({payload:JSON.stringify(paused),revision:paused.revision!+1,updatedAt:Date.now()}).where(and(eq(activities.id,paused.id),eq(activities.owner,repo.userId)));}
    else{const a=await repo.activity(z.string().uuid().parse(b.activityId));if(a.source==="google"||a.kind!=="task"||isDone(a,localDate(new Date(),(await repo.settings()).timezone)))throw new ApiError("Elige una tarea pendiente de Hilo.");if(current?.status==="running"&&current.activityId!==a.id)throw new ApiError("Pausa la actividad actual antes de cambiar.",409);s=current?.activityId===a.id?{...current,status:"running",startedAt:current.status==="running"?current.startedAt:Date.now()}:{activityId:a.id,status:"running",startedAt:Date.now(),elapsed:0,note:a.note,duration:a.duration*60};}
    await repo.db.insert(sessions).values({owner:repo.userId,payload:JSON.stringify(s)}).onConflictDoUpdate({target:sessions.owner,set:{payload:JSON.stringify(s)}});return result();
  }
  if(path==="/api/settings"){
    const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);const changes=z.object({name:z.string().trim().max(40),timezone:z.string().refine(v=>{try{new Intl.DateTimeFormat("es",{timeZone:v});return true;}catch{return false;}},"Zona horaria no válida."),hideTimer:z.boolean(),quietStart:clock,quietEnd:clock}).parse(b);await repo.db.update(users).set({settings:JSON.stringify({...await repo.settings(),...changes})}).where(eq(users.id,repo.userId));return result();
  }
  if(path==="/api/data/delete"){
    if(b.confirm!=="BORRAR")throw new ApiError("Escribe BORRAR para confirmar.");await repo.db.batch([repo.db.delete(sessions).where(eq(sessions.owner,repo.userId)),repo.db.delete(captures).where(eq(captures.owner,repo.userId)),repo.db.delete(activities).where(eq(activities.owner,repo.userId)),repo.db.delete(integrations).where(eq(integrations.owner,repo.userId)),repo.db.delete(oauthStates).where(eq(oauthStates.owner,repo.userId)),repo.db.update(users).set({settings:JSON.stringify(defaults)}).where(eq(users.id,repo.userId))] as any);return result();
  }
  if(path==="/api/google/calendar"){await google.chooseCalendar(repo,z.string().max(500).parse(b.id));await google.sync(repo);return result();}
  if(path==="/api/google/sync"){await google.sync(repo,b.date?z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(b.date):undefined);return result();}
  if(path==="/api/google/publish"){await google.publishActivity(repo,z.string().uuid().parse(b.id));return result();}
  if(path==="/api/google/disconnect"){await google.disconnect(repo);return result();}
  throw new ApiError("Acción no disponible.",404);
}
export default {async fetch(r:Request,env:Env){let response;try{response=await handle(r,env);}catch(e){response=errorResponse(e);}const headers=new Headers(response.headers);if(new URL(r.url).pathname.startsWith("/api/"))headers.set("Cache-Control","private, no-store");headers.set("X-Content-Type-Options","nosniff");headers.set("Referrer-Policy","strict-origin-when-cross-origin");headers.set("Permissions-Policy","camera=(), geolocation=()");headers.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws://127.0.0.1:*; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; base-uri 'self'; form-action 'self' https://accounts.google.com");return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}};


