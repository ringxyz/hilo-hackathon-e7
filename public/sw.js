// Only public offline help and branding are cached. Never cache private pages or API responses.
const CACHE='hilo-public-offline-v4';
const PUBLIC=['/offline.html','/offline-capture.js','/public.css','/logo.svg','/favicon.svg','/icon-192.png','/icon-512.png','/fonts/nunito-sans.woff2'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hilo-public-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;}
 if(PUBLIC.includes(url.pathname))event.respondWith(fetch(request).catch(()=>caches.match(request)));
});
self.addEventListener('push',event=>{let data={title:'Hilo',body:'Tu siguiente paso te espera. / Your next step awaits.',url:'/'};try{data={...data,...event.data.json()};}catch{}event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon-192.png',badge:'/icon-192.png',tag:data.tag||'hilo-reminder',data:{url:data.url},actions:data.reminder?[{action:'options',title:data.language==='en'?'Snooze':'Posponer'},{action:'start',title:data.language==='en'?'I’m on it':'Estoy en ello'}]:[]}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=new URL(event.notification.data?.url||'/',self.location.origin);if(url.origin!==self.location.origin)return;if(event.action==='start')url.searchParams.set('do','start');event.waitUntil(self.clients.matchAll({type:'window'}).then(clients=>{const client=clients.find(x=>x.url.startsWith(self.location.origin));if(client){client.navigate(url.href);return client.focus();}return self.clients.openWindow(url.href);}));});
