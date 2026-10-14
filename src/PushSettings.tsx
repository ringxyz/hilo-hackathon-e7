import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { api } from './api';
import type { AppState } from './types';

function applicationKey(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export function PushSettings({state,refresh}:{state:AppState;refresh:()=>void}){
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  useEffect(()=>{if(supported)navigator.serviceWorker.getRegistration().then(r=>r?.pushManager.getSubscription()).then(s=>setEnabled(!!s)).catch(()=>{});},[supported]);
  async function toggle(){setBusy(true);setMessage('');try{
    if(!supported)throw new Error('Este navegador no admite avisos web. En iPhone, abre Hilo desde la pantalla de inicio.');
    if(enabled){const registration=await navigator.serviceWorker.getRegistration(),sub=await registration?.pushManager.getSubscription();if(sub){await api('/api/push/unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}setEnabled(false);setMessage('Avisos desactivados en este dispositivo.');return;}
    // Permission is requested only in response to this explicit user action.
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Los avisos no tienen permiso. Puedes cambiarlo en los ajustes del navegador.');
    if(!state.vapidPublicKey)throw new Error('El envío de avisos aún no está configurado.');
    await navigator.serviceWorker.register('/sw.js');const registration=await navigator.serviceWorker.ready;
    const sub=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(state.vapidPublicKey)});
    await api('/api/push/subscribe',sub.toJSON());setEnabled(true);setMessage('Dispositivo conectado. Envía un aviso de prueba para comprobarlo.');refresh();
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function test(){setBusy(true);setMessage('');try{const result=await api<{sent:number}>('/api/push/test',{});setMessage(result.sent?'El servicio aceptó el aviso. Comprueba que aparece en tu dispositivo.':'No hay dispositivos disponibles. Desactiva y vuelve a activar los avisos.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <section className="settings-section"><div className="setting-title"><Bell size={23}/><h2>Recordatorios</h2><span className="connection-status">{enabled?'Este dispositivo activo':state.remindersConfigured?'Disponible':'Por configurar'}</span></div><p>Recibe un aviso a la hora de las actividades que marques con «Recordármelo». El horario de silencio se respeta y los avisos no muestran el título en la pantalla bloqueada.</p><div className="edit-actions"><button className="button white" disabled={busy||!supported||!state.remindersConfigured} onClick={toggle}>{enabled?'Desactivar en este dispositivo':'Activar en este dispositivo'}</button>{enabled&&<button className="button primary" disabled={busy} onClick={test}><Check size={17}/> Probar aviso</button>}</div>{!supported&&<p className="field-help">Este navegador no admite avisos web. En iPhone, instala Hilo en la pantalla de inicio y ábrelo desde ahí.</p>}<p className="field-help">La entrega depende de la conexión y los permisos del sistema. Comprueba los avisos en cada móvil antes de confiar en ellos.</p>{message&&<p className="setup-status" role="status">{message}</p>}</section>;
}
