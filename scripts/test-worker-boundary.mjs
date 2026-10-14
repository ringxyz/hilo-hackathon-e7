import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hilo-boundary-'));
try {
  const entry=join(dir,'worker.mjs');
  await build({entryPoints:['worker/index.ts'],outfile:entry,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
  const {default:worker}=await import(pathToFileURL(entry).href);
  const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-fixture',ANTHROPIC_API_KEY:'private-anthropic-fixture',GOOGLE_CLIENT_SECRET:'private-google-fixture',TOKEN_ENCRYPTION_KEY:'private-encryption-fixture',ASSETS:{fetch:async()=>new Response('static')}};
  const origin='https://hilo.example';
  const config=await worker.fetch(new Request(origin+'/api/config'),env);
  assert.equal(config.status,200);
  assert.deepEqual(await config.json(),{supabaseUrl:env.SUPABASE_URL,supabaseKey:env.SUPABASE_PUBLISHABLE_KEY});
  assert.equal(config.headers.get('Cache-Control'),'private, no-store');
  for(const path of ['/api/state','/api/google/calendars','/api/study/generate','/api/push/test']) {
    const res=await worker.fetch(new Request(origin+path),env);
    assert.equal(res.status,401,path);
    assert.equal((await res.text()).includes('private-'),false);
  }
  const forged=await worker.fetch(new Request(origin+'/api/onboarding',{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:'{}'}),env);
  assert.equal(forged.status,403);
  const health=await worker.fetch(new Request(origin+'/api/health'),env);
  assert.equal((await health.json()).database,'supabase');
  console.log('Worker boundary passed: public config, secret isolation, authentication, origin and cache headers.');
} finally { await unlink(join(dir,'worker.mjs')).catch(()=>{}); await rmdir(dir); }
