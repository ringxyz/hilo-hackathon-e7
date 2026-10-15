import {useEffect,useState} from 'react';
import {Check,Pencil} from 'lucide-react';
import {ProfileFields} from './Onboarding';
import {LanguageSelector} from './AppUtilities';
import {pick,tr,getLanguage} from './i18n';
import type {Settings} from './types';
import type {Mutate} from './CalendarConnection';
export function ProfileCard({settings,busy,mutate,error}:{settings:Settings;busy:boolean;mutate:Mutate;error:string}){
 const [open,setOpen]=useState(!settings.profile.completed),[draft,setDraft]=useState(settings);
 useEffect(()=>{if(!open)setDraft(settings);},[settings,open]);
 function field<K extends keyof Settings>(key:K,value:Settings[K]){setDraft(s=>({...s,[key]:value}));}
 return <section className={`profile-card dashboard-section ${open?'is-open':''}`}>
  <div className="profile-card-heading"><div>{open?<><h2>{pick('Conóceme','About you')}</h2><p>{pick('¿Quién usa Hilo?','Who uses Hilo?')}</p></>:<span>{pick('Tu perfil: ','Your profile: ')}<strong>{settings.name||pick('Mi espacio','My space')}</strong></span>}</div>{settings.profile.completed&&<button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>{open?tr('Cancelar'):pick('Editar','Edit')}<Pencil size={16}/></button>}</div>
  {open&&<form onSubmit={async e=>{e.preventDefault();if(await mutate('/api/onboarding',{name:draft.name,profile:{...draft.profile,completed:true},timezone:draft.timezone,quietStart:draft.quietStart,quietEnd:draft.quietEnd,language:getLanguage()},pick('Perfil guardado.','Profile saved.')))setOpen(false);}}>
   <label className="field">{tr('Cómo quieres que te llamemos')}<input maxLength={40} value={draft.name} onChange={e=>field('name',e.target.value)} placeholder={tr('Nombre o apodo (opcional)')}/></label>
   <ProfileFields profile={draft.profile} onChange={p=>field('profile',p)}/><LanguageSelector/>
   <label className="field">{tr('Zona horaria')}<select value={draft.timezone} onChange={e=>field('timezone',e.target.value)}>{[...new Set([draft.timezone,'Europe/Madrid','Atlantic/Canary','Europe/London','America/Mexico_City','America/Bogota','America/Argentina/Buenos_Aires','America/New_York','UTC'])].map(z=><option key={z}>{z}</option>)}</select></label>
   {draft.profile.audience!=='adult'&&<label className="checkbox-label"><input type="checkbox" required checked={draft.profile.guardianConsent} onChange={e=>field('profile',{...draft.profile,guardianConsent:e.target.checked,aiConsent:e.target.checked&&draft.profile.aiConsent})}/>{tr('Soy su madre, padre o tutor y autorizo este espacio de prueba.')}</label>}
   <label className="checkbox-label"><input type="checkbox" role="switch" checked={draft.profile.aiConsent} disabled={draft.profile.audience!=='adult'&&!draft.profile.guardianConsent} onChange={e=>field('profile',{...draft.profile,aiConsent:e.target.checked})}/>{pick('Permitir que Anthropic procese el texto que envíe para organizarlo y crear fichas.','Allow Anthropic to process text I send to organise it and create study cards.')}</label>
   <div className="form-grid"><label className="field">{pick('Silencio desde','Quiet hours from')}<input type="time" required value={draft.quietStart} onChange={e=>field('quietStart',e.target.value)}/></label><label className="field">{tr('Hasta')}<input type="time" required value={draft.quietEnd} onChange={e=>field('quietEnd',e.target.value)}/></label></div>
   {error&&<p role="alert" className="inline-error">{error}</p>}<button className="button primary" disabled={busy}>{pick('Guardar mi perfil','Save my profile')}<Check size={18}/></button>
  </form>}
 </section>;
}
