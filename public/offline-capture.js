// Unsent ideas live in a separate per-account queue, never in the public cache.
const lang=localStorage.getItem('hilo-language')==='en'?'en':'es';
const choose=(es,en)=>lang==='en'?en:es;
document.documentElement.lang=lang;
const form=document.getElementById('offline-capture'),message=document.getElementById('capture-status'),owner=localStorage.getItem('hilo-capture-owner');
document.getElementById('offline-title').textContent=choose('Tu idea puede esperar aquí.','Your idea can wait here.');
document.getElementById('offline-description').textContent=choose('Sin conexión. Guarda una idea en este dispositivo; se enviará a Después al volver a abrir Hilo con tu cuenta y conexión.','You are offline. Save an idea on this device; it will sync to Later when you reopen Hilo online with your account.');
document.getElementById('offline-label').textContent=choose('Te leo','I’m listening');
document.getElementById('offline-save').textContent=choose('Guardar tal cual en Después','Save as-is to Later');
document.getElementById('offline-retry').textContent=choose('Volver a Hilo','Back to Hilo');
if(!owner){form.hidden=true;message.textContent=choose('Conéctate e inicia sesión una vez para activar la captura sin conexión.','Connect and sign in once to enable offline capture.');}
form.addEventListener('submit',async e=>{e.preventDefault();const field=document.getElementById('offline-text'),text=field.value;if(!text.trim()||text.length>6000)return;
const button=document.getElementById('offline-save');button.disabled=true;
try{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hilo-capture-queue',1);r.onupgradeneeded=()=>r.result.createObjectStore('ideas',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
await new Promise((resolve,reject)=>{const tx=db.transaction('ideas','readwrite');tx.objectStore('ideas').put({id:crypto.randomUUID(),owner,text,createdAt:Date.now()});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});
field.value='';message.textContent=choose('Idea guardada en este dispositivo. Pendiente de sincronizar.','Idea saved on this device. Waiting to sync.');
}catch{message.textContent=choose('No se pudo guardar. Conserva el texto y vuelve a intentarlo.','Could not save. Keep your text and retry.');}finally{button.disabled=false;}});
