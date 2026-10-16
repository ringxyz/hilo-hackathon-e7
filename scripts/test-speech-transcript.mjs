import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['src/speech-transcript.ts'],outfile:'.sites-runtime/tests/speech-transcript.mjs',bundle:true,platform:'node',format:'esm'});
const {transcriptFromResults}=await import('../.sites-runtime/tests/speech-transcript.mjs');
const result=(transcript,isFinal=true)=>({isFinal,0:{transcript}});
assert.equal(transcriptFromResults([result('subir que la Cacho pimpari en debo'),result('subir que la Cacho pimpari en debo')]),'subir que la Cacho pimpari en debo');
assert.equal(transcriptFromResults([result('mañana tengo que'),result('mañana tengo que',false),result('llamar al colegio')]),'mañana tengo que llamar al colegio');
assert.equal(transcriptFromResults([result('  recoger   el paquete '),result('después ir al médico')]),'recoger el paquete después ir al médico');
console.log('Speech transcript assertions passed: interim hypotheses ignored and repeated mobile chunks collapsed.');
