import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import webpush from 'npm:web-push@3.6.7';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function result<T>(r:{data:T;error:unknown}):T{if(r.error)throw new Error('Database operation failed');return r.data;}
function endpointAllowed(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','wns.windows.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host));}catch{return false;}}
async function equalSecret(a:string,b:string){if(!a||!b)return false;const hash=async(v:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));const [x,y]=await Promise.all([hash(a),hash(b)]);let delta=0;for(let i=0;i<x.length;i++)delta|=x[i]^y[i];return delta===0;}

async function send(owner:string,tag:string,test=false,reminder?:{activity_id:string;occurrence:string;kind:string}){
  const subscriptions=result(await db.from('hilo_push_subscriptions').select('id,subscription').eq('owner',owner).limit(10))||[];
  let sent=0,retry=false;
  await Promise.all(subscriptions.map(async row=>{
    if(!endpointAllowed(row.subscription?.endpoint||'')){result(await db.from('hilo_push_subscriptions').delete().eq('id',row.id));return;}
    try{await webpush.sendNotification(row.subscription,JSON.stringify({title:'Hilo',body:row.subscription.language==='en'?(test?'This is your test notification. Your device is connected.':reminder?.kind==='departure'?'It is time to leave. Open Hilo to see your appointment.':'You have a scheduled activity. Open Hilo for your next step.'):(test?'Este es tu aviso de prueba. Tu dispositivo está conectado.':reminder?.kind==='departure'?'Es hora de salir. Abre Hilo para ver tu cita.':'Tienes una actividad programada. Abre Hilo para ver tu siguiente paso.'),url:reminder?'/?view=agenda&reminder='+reminder.activity_id+'&day='+reminder.occurrence+'&kind='+reminder.kind:'/?view=agenda',tag,reminder:!!reminder,language:row.subscription.language||'es'}),{TTL:120,urgency:'normal',timeout:7000});sent++;}
    catch(e){const code=(e as {statusCode?:number}).statusCode;if(code===404||code===410)result(await db.from('hilo_push_subscriptions').delete().eq('id',row.id));else retry=true;}
  }));
  return {sent,retry};
}

// Gateway JWT verification is disabled because cron uses a dedicated Vault secret.
// Every request is authenticated here: either that secret or a verified Supabase user.
Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return json({error:'Unauthorized'},401);
  try{
    const config=result(await db.rpc('hilo_push_config'));
    const cron=await equalSecret(token,config.cronSecret||'');let userId:string|null=null;
    if(!cron){const {data,error}=await db.auth.getUser(token);if(error||!data.user)return json({error:'Unauthorized'},401);userId=data.user.id;
      const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
      if(result(await caller.rpc('hilo_trial_access'))!==true)return json({error:'Tu correo no está en la lista de prueba de Hilo. Pide acceso para probar.'},403);
      const body=await request.json().catch(()=>null);if(body?.test!==true)return json({error:'Forbidden'},403);
      if(!result(await db.rpc('hilo_allow_push_test',{user_id:userId})))return json({error:'Test limit reached'},429);
    }
    const vapid=config.vapid||result(await db.rpc('hilo_initialize_push',{value:webpush.generateVAPIDKeys()}));
    webpush.setVapidDetails('https://hilo-tu-siguiente-paso.waikastudios.chatgpt.site',vapid.publicKey,vapid.privateKey);
    if(userId){const delivery=await send(userId,'hilo-test',true);return json({sent:delivery.sent},delivery.retry&&!delivery.sent?502:200);}
    result(await db.rpc('hilo_queue_reminders'));const jobs=result(await db.rpc('hilo_claim_reminders'))||[];let sent=0;
    async function processJob(job:typeof jobs[number]){
      const current=result(await db.from('hilo_activities').select('payload,revision').eq('id',job.activity_id).eq('owner',job.owner).maybeSingle());
      const profile=result(await db.from('hilo_profiles').select('settings').eq('id',job.owner).maybeSingle());
      const quiet=profile?result(await db.rpc('hilo_is_quiet',{settings:profile.settings,instant:new Date().toISOString()})):true;
      const preferences=profile?.settings?.reminderPreferences;
      const optedOut=job.kind==='departure'?preferences?.departure===false:current?.payload.purpose==='study'?preferences?.study===false:current?.payload.kind==='task'&&preferences?.resume===false;
      if(!current||quiet||optedOut||current.revision!==job.revision||!current.payload.reminder||current.payload.status!=='pending'||current.payload.completedDates?.includes(job.occurrence)){
        result(await db.from('hilo_push_jobs').update({state:'missed'}).eq('id',job.id).eq('state','sending').eq('leased_until',job.leased_until));return;
      }
      const lease=result(await db.from('hilo_push_jobs').select('state,leased_until').eq('id',job.id).single());if(lease.state!=='sending'||lease.leased_until!==job.leased_until)return;
      const delivery=await send(job.owner,'hilo-'+job.activity_id+'-'+job.occurrence+'-'+job.kind,false,job);sent+=delivery.sent;
      result(await db.from('hilo_push_jobs').update({state:delivery.sent?'sent':delivery.retry&&job.attempts<3?'pending':delivery.retry?'failed':'skipped',leased_until:null,next_attempt:new Date(Date.now()+60000*job.attempts).toISOString()}).eq('id',job.id).eq('state','sending').eq('leased_until',job.leased_until));
    }
    // Bound parallelism keeps slow push endpoints from exhausting the job lease.
    for(let i=0;i<jobs.length;i+=4)await Promise.all(jobs.slice(i,i+4).map(processJob));
    return json({processed:jobs.length,sent});
  }catch{console.error('Hilo push operation failed');return json({error:'Push operation failed'},500);}
});
