import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
await viteBuild();
await mkdir('dist/server',{recursive:true});
// Embed the shell so asset-first hosts cannot bypass HTML metadata/security headers.
const shell=await readFile('dist/client/index.html','utf8');
await esbuild({entryPoints:['worker/index.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,define:{__HILO_SHELL__:JSON.stringify(shell)}});
await unlink('dist/client/index.html');
const config=JSON.parse(await readFile('wrangler.json','utf8'));
config.main='index.js';config.assets.directory='../client';config.d1_databases[0].migrations_dir='../.openai/drizzle';
await writeFile('dist/server/wrangler.json',JSON.stringify(config,null,2));
console.log('Hilo: React SPA + API Worker build complete.');
