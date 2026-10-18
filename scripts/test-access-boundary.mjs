import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['worker/index.ts'],outfile:'.sites-runtime/tests/access-worker.mjs',bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'authenticated-fixture',setup(b){
  b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'fixture-client',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`
    export function createClient(){return {
      auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@hilo.invalid'}},error:null})},
      rpc:async name=>({data:name==='hilo_trial_access'?globalThis.fixtureAllowed:name==='hilo_own_reminders'?[]:true,error:name==='hilo_trial_access'&&globalThis.fixtureAccessUnavailable?{}:null}),
      from(table){const chain={
        select(){return chain},eq(){return chain},
        upsert:async()=>{globalThis.fixtureWrites++;return {error:null}},
        update(value){globalThis.fixtureSettings=value.settings;return chain},
        single:async()=>({data:{settings:globalThis.fixtureSettings},error:null}),
        maybeSingle:async()=>({data:null,error:null}),
        then(resolve){return Promise.resolve({data:table==='hilo_profiles'?{settings:globalThis.fixtureSettings}:[],error:null}).then(resolve)}
      };return chain}
    }};`,loader:'js'}));
}}]});
const {default:worker}=await import('../.sites-runtime/tests/access-worker.mjs');
const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fixture-key',ASSETS:{fetch:async()=>new Response('static')}};
const profile={audience:'adult',age:null,country:'España',course:'',guardianConsent:false,aiConsent:false,completed:true};
const reset=()=>{globalThis.fixtureAllowed=true;globalThis.fixtureAccessUnavailable=false;globalThis.fixtureWrites=0;globalThis.fixtureSettings={name:'',timezone:'Europe/Madrid',profile:{...profile,completed:false}};};
const call=(path,body)=>worker.fetch(new Request('https://hilo.example'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer signed-fixture','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
reset();globalThis.fixtureAllowed=false;
let response=await call('/api/state');assert.equal(response.status,403);assert.equal((await response.json()).code,'TRIAL_ACCESS_DENIED');assert.equal(globalThis.fixtureWrites,0,'Unlisted account must not create a profile');
reset();globalThis.fixtureAccessUnavailable=true;response=await call('/api/state');assert.equal(response.status,503);assert.equal(globalThis.fixtureWrites,0,'Access check failure must fail closed');
reset();response=await call('/api/capture/parse',{text:'Hoy tengo clase a las 09:00'});assert.equal(response.status,403,'New account must complete onboarding');
response=await call('/api/onboarding',{name:'Fixture',profile});assert.equal(response.status,400,'Old payload must not skip new onboarding');
response=await call('/api/settings',{name:'Fixture',profile,timezone:'Europe/Madrid',quietStart:'22:00',quietEnd:'08:00',hideTimer:false});assert.equal(response.status,400,'Settings must not bypass onboarding');
response=await call('/api/onboarding',{name:'Fixture',profile:{...profile,studying:false,useCases:['home']},timezone:'Europe/Madrid',quietStart:'22:00',quietEnd:'08:00',defaultTravelMinutes:45,onboardingVersion:2,language:'en'});
assert.equal(response.status,200);const state=await response.json();assert.equal(state.settings.profile.completed,true);assert.equal(state.settings.defaultTravelMinutes,45);assert.equal(state.settings.profile.studying,false);assert.deepEqual(state.settings.profile.useCases,['home']);
response=await call('/api/capture/parse',{text:'Enviar presupuesto todos los martes a las 10am #Trabajo p1',capturedAt:Date.now(),dayPlan:true,energy:'low'});assert.equal(response.status,200);let data=await response.json();assert.equal(data.drafts[0].recurrence,'weekly');assert.equal(data.drafts[0].time,'10:00');assert.equal(data.drafts[0].priority,1);assert.equal(data.drafts[0].tag,'Trabajo');
response=await call('/api/activity/breakdown',{title:'Preparar presentación',level:3,energy:'low'});assert.equal(response.status,403,'Breakdown must respect AI consent');
response=await call('/api/activity/breakdown',{title:'Preparar presentación',level:9,energy:'low'});assert.equal(response.status,400,'Reject invalid stuck level');
response=await call('/api/activity/steps',{id:crypto.randomUUID(),revision:1,steps:[],date:new Date().toISOString().slice(0,10)});assert.equal(response.status,404,'No cross-account steps update');
response=await call('/api/day/replan',{preview:true});assert.equal(response.status,200);data=await response.json();assert.deepEqual(data.changes,[]);assert.deepEqual(data.snapshot,[]);
response=await call('/api/day/replan',{plan:{...data,sessionSignature:'changed'},requestId:crypto.randomUUID()});assert.equal(response.status,400,'Reject empty/malformed replan before write');
response=await call('/api/capture/save',{requestId:crypto.randomUUID(),dayPlan:true,energy:'low',activities:[{title:'Fixture',kind:'task',date:null,time:null,duration:15,steps:[{id:crypto.randomUUID(),title:'Open file',minutes:1,done:false}],tag:'Trabajo',priority:1}]});assert.equal(response.status,200,'Save accepts energy and structured steps');
console.log('Access boundary passed: unlisted denial, fail closed, no premature profile, mandatory onboarding and persisted context.');
