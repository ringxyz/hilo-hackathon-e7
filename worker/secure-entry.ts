import { handle } from './router';
import { errorResponse, type Env } from './repo';
export default {async fetch(r:Request,env:Env){
 let response:Response;try{response=await handle(r,env);}catch(e){response=errorResponse(e);}
 const url=new URL(r.url),headers=new Headers(response.headers),html=headers.get('content-type')?.includes('text/html');
 if(url.pathname.startsWith('/api/'))headers.set('Cache-Control','private, no-store');
 if(url.pathname==='/sw.js')headers.set('Cache-Control','no-cache');
 headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), geolocation=(), microphone=(self), payment=()');
 headers.set('X-Frame-Options','SAMEORIGIN');headers.set('X-Robots-Tag','noindex, nofollow');
 if(url.protocol==='https:')headers.set('Strict-Transport-Security','max-age=15552000');
 let hashes='';if(html){const body=await response.clone().text();for(const match of body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));hashes+=" 'sha256-"+btoa(String.fromCharCode(...new Uint8Array(hash)))+"'";}}
 headers.set('Content-Security-Policy',`default-src 'self'; script-src 'self'${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://wpvuhkhmmrgfciphrxbp.supabase.co wss://wpvuhkhmmrgfciphrxbp.supabase.co${url.hostname==='127.0.0.1'?" ws://127.0.0.1:*":''}; worker-src 'self'; object-src 'none'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; base-uri 'self'; form-action 'self' https://accounts.google.com`);
 if(response.status===429)headers.set('Retry-After','60');
 return new Response(r.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
}};
