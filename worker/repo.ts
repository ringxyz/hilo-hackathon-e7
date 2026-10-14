import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { z } from "zod";
import type { Activity, AppState, Settings } from "../src/types";
import { localDate } from "../src/domain";
import { googleStatus } from "./google";
export type Env={DB:D1Database;ASSETS:Fetcher;GOOGLE_CLIENT_ID?:string;GOOGLE_CLIENT_SECRET?:string;TOKEN_ENCRYPTION_KEY?:string;VOICE_API_KEY?:string;SITE_URL?:string};
export const defaults:Settings={name:"",timezone:"Europe/Madrid",hideTimer:false,quietStart:"22:00",quietEnd:"08:00",demo:false};
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T12:00:00Z");return !isNaN(+d)&&d.toISOString().slice(0,10)===v;},"Elige una fecha válida.");
export const activitySchema=z.object({id:z.string().uuid().optional(),title:z.string().trim().min(1,"Escribe un título.").max(160),kind:z.enum(["task","event"]),date:date.nullable(),time:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),duration:z.number().int().min(1).max(240),nextStep:z.string().max(500).default(""),note:z.string().max(2000).default(""),status:z.enum(["pending","done"]).default("pending"),color:z.enum(["pink","mint","peach","blue"]).default("pink"),recurrence:z.enum(["none","daily","weekly","annual"]).default("none"),source:z.literal("hilo").default("hilo"),reminder:z.literal(false).default(false),estimated:z.boolean().optional(),completedDates:z.array(date).max(1000).optional()}).superRefine((a,c)=>{if(a.time&&!a.date)c.addIssue({code:"custom",message:"Elige un día para la hora.",path:["date"]});if(a.recurrence!=="none"&&!a.date)c.addIssue({code:"custom",message:"Elige el primer día.",path:["date"]});if(a.recurrence==="annual"&&a.date?.slice(5)==="02-29")c.addIssue({code:"custom",message:"En esta versión, guarda el 29 de febrero por separado.",path:["recurrence"]});});
export class ApiError extends Error {constructor(message:string,public status=400){super(message);}}
export function errorResponse(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message||"Revisa los datos."},{status:400});console.error("Hilo operation failed",e instanceof Error?e.name:"Unknown");return Response.json({error:"No se pudo guardar. Tu entrada sigue disponible; vuelve a intentarlo."},{status:500});}
export function owner(r:Request){const id=r.headers.get("oai-authenticated-user-id");if(!id)throw new ApiError("Inicia sesión para abrir tu espacio.",401);return id;}
export function sameOrigin(r:Request){const o=r.headers.get("origin");if(o&&o!==new URL(r.url).origin)throw new ApiError("Solicitud no permitida.",403);if(r.headers.get("sec-fetch-site")==="cross-site")throw new ApiError("Solicitud no permitida.",403);}
export class Repo {
  db; constructor(public env:Env,public userId:string){this.db=drizzle(env.DB,{schema});}
  async init(){await this.db.insert(schema.users).values({id:this.userId,settings:JSON.stringify(defaults),createdAt:Date.now()}).onConflictDoNothing();}
  async settings(){const [u]=await this.db.select().from(schema.users).where(eq(schema.users.id,this.userId));return {...defaults,...JSON.parse(u.settings)} as Settings;}
  async activity(id:string){const [a]=await this.db.select().from(schema.activities).where(and(eq(schema.activities.id,id),eq(schema.activities.owner,this.userId)));if(!a)throw new ApiError("Esta actividad no está disponible.",404);return {...JSON.parse(a.payload),id:a.id,revision:a.revision} as Activity;}
  async state():Promise<AppState>{const rows=await this.db.select().from(schema.activities).where(eq(schema.activities.owner,this.userId));const [s]=await this.db.select().from(schema.sessions).where(eq(schema.sessions.owner,this.userId));return {activities:rows.map(r=>({...JSON.parse(r.payload),id:r.id,revision:r.revision})),session:s?JSON.parse(s.payload):null,settings:await this.settings(),google:await googleStatus(this),voiceConfigured:!!this.env.VOICE_API_KEY,remindersConfigured:false,authenticated:true};}
}
export function demoActivities(date=localDate()):Activity[]{return [
{title:"Repasar historia",date,kind:"task",duration:15,nextStep:"Abrir los apuntes del tema 3",color:"pink"},
{title:"Preparar la mochila",date,kind:"task",duration:10,nextStep:"Poner los libros de mañana sobre la mesa",color:"mint"},
{title:"Terminar la propuesta",date,kind:"task",duration:25,nextStep:"Abrir el documento y revisar la primera página",color:"peach"},
{title:"Entrenamiento",date,time:"18:00",kind:"event",duration:60,nextStep:"",color:"blue"},
{title:"Probar esa receta",date:null,kind:"task",duration:15,nextStep:"Buscar la receta que guardé",color:"mint"},
{title:"Comprar un cuaderno",date:null,kind:"task",duration:15,nextStep:"",color:"pink"},
].map(x=>({id:crypto.randomUUID(),time:null,note:"",status:"pending",recurrence:"none",source:"hilo",reminder:false,...x})) as Activity[];}
