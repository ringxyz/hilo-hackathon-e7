import { useState } from 'react';
import { Modal } from './components';
import { pick } from './i18n';

export const draftKey=(owner:string,mode:string)=>`hilo-draft-v1:${owner}:${mode}`;
export function ownedDrafts(owner:string){return Object.fromEntries(['day','idea','study'].map(mode=>[mode,readDraft(owner,mode)]));}
export function clearOwnedDrafts(owner:string){for(const mode of ['day','idea','study'])localStorage.removeItem(draftKey(owner,mode));}
export function readDraft<T>(owner:string|undefined,mode:string):T|null {
  if(!owner)return null;
  try {const raw=localStorage.getItem(draftKey(owner,mode));const value=raw?JSON.parse(raw).value:null;return value&&typeof value==='object'?value:null;}catch{return null;}
}
export function useDraftPersistence(owner:string|undefined,mode:string,value:unknown,_hasContent:boolean){
  const [storageError,setStorageError]=useState(false);
  function save(next=value){if(!owner)return false;try{localStorage.setItem(draftKey(owner,mode),JSON.stringify({value:next}));setStorageError(false);return true;}catch{setStorageError(true);return false;}}
  function clear(){if(owner)try{localStorage.removeItem(draftKey(owner,mode));setStorageError(false);}catch{setStorageError(true);}}
  return {save,clear,storageError};
}
export function DraftExit({onContinue,onSave,onDiscard,storageError=false}:{onContinue:()=>void;onSave:()=>void;onDiscard:()=>void;storageError?:boolean}){
  return <Modal title={pick('Tienes texto sin guardar.','You have unsaved text.')} onClose={onContinue}><p>{pick('Elige qué quieres hacer antes de cerrar.','Choose what to do before closing.')}</p>{storageError&&<p className="inline-error" role="alert">{pick('No se pudo conservar el borrador en este dispositivo. Sigue editando o copia tu texto antes de cerrar.','The draft could not be saved on this device. Keep editing or copy your text before closing.')}</p>}<div className="draft-exit-actions"><button className="button primary full" onClick={onContinue}>{pick('Seguir editando','Keep editing')}</button><button className="button white full" disabled={storageError} onClick={onSave}>{pick('Guardar borrador','Save draft')}</button><button className="text-button" onClick={onDiscard}>{pick('Descartar','Discard')}</button></div></Modal>;
}

export function DraftRestore({onContinue,onDiscard}:{onContinue:()=>void;onDiscard:()=>void}){
  return <section className="draft-restore" role="region" aria-label={pick('Borrador guardado','Saved draft')}><p>{pick('¿Quieres continuar o descartar este borrador?','Would you like to continue or discard this draft?')}</p><div className="draft-exit-actions"><button className="button primary full" onClick={onContinue}>{pick('Continuar','Continue')}</button><button className="button white full" onClick={onDiscard}>{pick('Descartar','Discard')}</button></div></section>;
}
