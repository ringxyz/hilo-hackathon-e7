// Hilo never caches private API responses or pretends to save offline.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let data={title:'Hilo',body:'Tu siguiente paso te espera.',url:'/'};try{data={...data,...e.data.json()};}catch{}e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon-192.png',tag:data.tag||'hilo-reminder',data:{url:data.url}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=new URL(e.notification.data?.url||'/',self.location.origin);if(u.origin!==self.location.origin)return;e.waitUntil(self.clients.matchAll({type:'window'}).then(clients=>{const c=clients.find(x=>x.url.startsWith(self.location.origin));if(c){c.navigate(u.href);return c.focus();}return self.clients.openWindow(u.href);}));});
