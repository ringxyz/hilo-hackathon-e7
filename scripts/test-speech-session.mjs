import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['src/speech-session.ts'],outfile:'.sites-runtime/tests/speech-session.mjs',bundle:true,platform:'node',format:'esm'});
const {createSpeechSession,speechErrorText}=await import('../.sites-runtime/tests/speech-session.mjs');
function fixture() {
  const engines=[], errors=[], texts=[], states=[], timers=new Map(); let serial=0;
  const session=createSpeechSession({initialText:'Mi nota',onText:t=>texts.push(t),onError:e=>errors.push(e),onActive:s=>states.push(s),
    schedule:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},unschedule:id=>timers.delete(id),
    create:()=>{const engine={start(){},stop(){this.stopped=true;},abort(){this.aborted=true;}};engines.push(engine);return engine;}});
  const result=(engine,text)=>engine.onresult({results:[{isFinal:true,0:{transcript:text}}]});
  const fire=ms=>{const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry,`timer ${ms}`);timers.delete(entry[0]);entry[1].fn();};
  return {session,engines,errors,texts,states,timers,result,fire};
}
// Real engines may end between sentences; keep all text and a single total limit.
{
  const f=fixture();f.session.start();const r=f.engines[0];r.onstart();f.result(r,'Comprar pan.');r.onend();f.fire(200);
  const second=f.engines[1];second.onstart();f.result(second,'Llamar a Ana.');
  assert.equal(f.texts.at(-1),'Mi nota\nComprar pan.\nLlamar a Ana.');
  f.fire(180000);assert.equal(second.stopped,true);second.onend();assert.equal(f.states.at(-1),false);assert.equal(f.timers.size,0);
}
// Retry one transient network failure, preserving text; do not loop forever.
{
  const f=fixture();f.session.start();const r=f.engines[0];r.onstart();f.result(r,'Preparar informe.');r.onerror({error:'network'});r.onend();f.fire(600);
  const second=f.engines[1];second.onstart();second.onerror({error:'network'});second.onend();
  assert.deepEqual(f.errors,['network']);assert.equal(f.engines.length,2);assert.equal(f.timers.size,0);assert.equal(f.states.at(-1),false);
  assert.equal(f.texts.at(-1),'Mi nota\nPreparar informe.');
}
for(const code of ['no-speech','not-allowed','audio-capture','service-not-allowed','language-not-supported']){
  const f=fixture();f.session.start();f.engines[0].onerror({error:code});f.engines[0].onend();
  assert.deepEqual(f.errors,[code]);assert.equal(f.engines.length,1);assert.equal(f.timers.size,0);
  assert.ok(speechErrorText(code).length>30);assert.notEqual(speechErrorText(code),speechErrorText(code,true));
}
// A pending permission request must not leave the UI locked forever.
{const f=fixture();f.session.start();f.fire(10000);assert.deepEqual(f.errors,['start-timeout']);assert.equal(f.engines[0].aborted,true);assert.equal(f.states.at(-1),false);}
// Cancel restores the original text; callbacks from a disposed session do nothing.
{const f=fixture();f.session.start();f.result(f.engines[0],'No guardar');f.session.stop(true);f.result(f.engines[0],'Tardío');assert.equal(f.texts.at(-1),'Mi nota');assert.equal(f.timers.size,0);}
{const f=fixture();f.session.start();f.engines[0].onstart();f.result(f.engines[0],'Una frase');f.engines[0].onend();f.session.dispose();assert.equal(f.timers.size,0);}
console.log('Speech session passed: bounded retry, pauses, preserved text, permissions, timeout, cancel and cleanup.');
