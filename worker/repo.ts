import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { z } from "zod";
import type { Activity, AppState, Settings, FocusSession, StudyDay, Exam } from "../src/types";
import { localDate } from "../src/domain";
import { googleStatus } from "./google";
export type Env={DB?:D1Database;ASSETS:Fetcher;SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;GOOGLE_CLIENT_ID?:string;GOOGLE_CLIENT_SECRET?:string;TOKEN_ENCRYPTION_KEY?:string;ANTHROPIC_API_KEY?:string;ANTHROPIC_MODEL?:string;SITE_URL?:string};
export const defaults:Settings={name:"",timezone:"Europe/Madrid",hideTimer:false,quietStart:"22:00",quietEnd:"08:00",demo:false,profile:{audience:"adult",age:null,country:"España",course:"",guardianConsent:false,aiConsent:false,completed:false}};
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T12:00:00Z");return !isNaN(+d)&&d.toISOString().slice(0,10)===v;},"Elige una fecha válida.");
export const activitySchema=z.object({id:z.string().uuid().optional(),title:z.string().trim().min(1,"Escribe un título.").max(160),kind:z.enum(["task","event"]),date:date.nullable(),time:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),duration:z.number().int().min(1).max(240),nextStep:z.string().max(500).default(""),note:z.string().max(2000).default(""),status:z.enum(["pending","done"]).default("pending"),color:z.enum(["pink","mint","peach","blue"]).default("pink"),recurrence:z.enum(["none","daily","weekly","annual"]).default("none"),source:z.literal("hilo").default("hilo"),reminder:z.boolean().default(false),estimated:z.boolean().optional(),completedDates:z.array(date).max(1000).optional()}).superRefine((a,c)=>{if(a.reminder&&(!a.time||!a.date))c.addIssue({code:"custom",message:"Elige día y hora para el aviso.",path:["reminder"]});if(a.time&&!a.date)c.addIssue({code:"custom",message:"Elige un día para la hora.",path:["date"]});if(a.recurrence!=="none"&&!a.date)c.addIssue({code:"custom",message:"Elige el primer día.",path:["date"]});if(a.recurrence==="annual"&&a.date?.slice(5)==="02-29")c.addIssue({code:"custom",message:"En esta versión, guarda el 29 de febrero por separado.",path:["recurrence"]});});
export class ApiError extends Error {constructor(message:string,public status=400){super(message);}}
export function errorResponse(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message||"Revisa los datos."},{status:400});console.error("Hilo operation failed",e instanceof Error?e.name:"Unknown");return Response.json({error:"No se pudo guardar. Tu entrada sigue disponible; vuelve a intentarlo."},{status:500});}
export function sameOrigin(r:Request){const o=r.headers.get("origin");if(o&&o!==new URL(r.url).origin)throw new ApiError("Solicitud no permitida.",403);if(r.headers.get("sec-fetch-site")==="cross-site")throw new ApiError("Solicitud no permitida.",403);}
export function dbResult<T>(r:{data:T;error:unknown}):T { if(r.error) throw new ApiError("No se pudo guardar en Supabase. Tu entrada sigue disponible.",502); return r.data; }
export async function authenticatedRepo(request:Request,env:Env) {
  if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)throw new ApiError("Supabase está pendiente de configuración.",503);
  const authorization=request.headers.get("Authorization")||"";
  if(!authorization.startsWith("Bearer "))throw new ApiError("Inicia sesión para abrir tu espacio.",401);
  const db=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.auth.getUser(authorization.slice(7));
  if(error||!data.user)throw new ApiError("Inicia sesión para abrir tu espacio.",401);
  const repo=new Repo(env,data.user.id,db,data.user,authorization.slice(7));repo.language=request.headers.get('X-Hilo-Language')==='en'?'en':'es';await repo.init();return repo;
}
export class Repo {
  language:"es"|"en"="es";
  constructor(public env:Env,public userId:string,public db:SupabaseClient,public user:User,public token:string){}
  async init(){dbResult(await this.db.from("hilo_profiles").upsert({id:this.userId,settings:defaults},{onConflict:"id",ignoreDuplicates:true}));}
  async settings():Promise<Settings>{const row=dbResult(await this.db.from("hilo_profiles").select("settings").eq("id",this.userId).single());if(!row)throw new ApiError("No se pudo abrir tu perfil.",502);return {...defaults,...row.settings,profile:{...defaults.profile,...row.settings.profile}};}
  async saveSettings(settings:Settings){dbResult(await this.db.from("hilo_profiles").update({settings}).eq("id",this.userId));}
  async rows(table:string){return dbResult(await this.db.from(table).select("*").eq("owner",this.userId))||[];}
  async activity(id:string):Promise<Activity>{const row=dbResult(await this.db.from("hilo_activities").select("*").eq("id",id).eq("owner",this.userId).maybeSingle());if(!row)throw new ApiError("Esta actividad no está disponible.",404);return {...row.payload,id:row.id,revision:row.revision};}
  async saveActivity(a:Activity,revision:number,clear=false){const ok=dbResult(await this.db.rpc("hilo_save_activity",{activity_id:a.id,expected_revision:revision,value:a,clear_session:clear}));if(!ok)throw new ApiError("La actividad cambió en otra pestaña. Actualiza antes de guardar.",409);}
  async session():Promise<FocusSession|null>{const row=dbResult(await this.db.from("hilo_sessions").select("payload").eq("owner",this.userId).maybeSingle());return row?.payload||null;}
  async saveSession(payload:FocusSession|null){dbResult(payload?await this.db.from("hilo_sessions").upsert({owner:this.userId,payload}):await this.db.from("hilo_sessions").delete().eq("owner",this.userId));}
  async takeCredit(){if(!dbResult(await this.db.rpc("hilo_take_ai_credit")))throw new ApiError("Has llegado a las 30 acciones de IA de hoy. Tus fichas y tu agenda siguen disponibles.",429);}
  async state():Promise<AppState>{
    const [rows,session,settings,google,days,exams,config]=await Promise.all([this.rows("hilo_activities"),this.session(),this.settings(),googleStatus(this),this.rows("hilo_study_days"),this.rows("hilo_exams"),this.db.from("hilo_public_config").select("push_public_key").eq("id",true).maybeSingle()]);
    const key=dbResult(config)?.push_public_key||null;
    return {activities:rows.map(r=>({...r.payload,id:r.id,revision:r.revision})),session,settings,google,voiceConfigured:false,aiConfigured:!!this.env.ANTHROPIC_API_KEY,remindersConfigured:!!key,vapidPublicKey:key,authenticated:true,studyDays:days.map(r=>r.payload as StudyDay),exams:exams.map(r=>r.payload as Exam)};
  }
}
export function demoActivities(date=localDate(),audience="adult",language="es"):Activity[]{const adult=audience==="adult";return [
{title:adult?"Preparar la reunión":"Repasar historia",date,kind:"task",duration:15,nextStep:adult?"Anotar los tres temas que quiero tratar":"Abrir los apuntes del tema 3",color:"pink"},
{title:adult?"Organizar la semana":"Preparar la mochila",date,kind:"task",duration:10,nextStep:adult?"Elegir una prioridad para mañana":"Poner los libros de mañana sobre la mesa",color:"mint"},
{title:adult?"Terminar la propuesta":"Terminar el ejercicio de mates",date,kind:"task",duration:25,nextStep:"Abrir el documento y revisar la primera página",color:"peach"},
{title:"Entrenamiento",date,time:"18:00",kind:"event",duration:60,nextStep:"",color:"blue"},
{title:"Probar esa receta",date:null,kind:"task",duration:15,nextStep:"Buscar la receta que guardé",color:"mint"},
{title:"Comprar un cuaderno",date:null,kind:"task",duration:15,nextStep:"",color:"pink"},
].map(x=>{const en:Record<string,string>={"Preparar la reunión":"Prepare the meeting","Repasar historia":"Review history","Anotar los tres temas que quiero tratar":"Write down the three topics to discuss","Abrir los apuntes del tema 3":"Open the notes for topic 3","Organizar la semana":"Organise the week","Preparar la mochila":"Pack my school bag","Elegir una prioridad para mañana":"Choose one priority for tomorrow","Poner los libros de mañana sobre la mesa":"Put tomorrow's books on the table","Terminar la propuesta":"Finish the proposal","Terminar el ejercicio de mates":"Finish the maths exercise","Abrir el documento y revisar la primera página":"Open the document and review the first page","Entrenamiento":"Training","Probar esa receta":"Try that recipe","Buscar la receta que guardé":"Find the recipe I saved","Comprar un cuaderno":"Buy a notebook"};return {id:crypto.randomUUID(),time:null,note:"",status:"pending",recurrence:"none",source:"hilo",reminder:false,...x,...(language==='en'?{title:en[x.title]||x.title,nextStep:en[x.nextStep]||x.nextStep}:{})};}) as Activity[];}
