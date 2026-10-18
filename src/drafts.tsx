import { useLayoutEffect, useRef, useState } from 'react';
import { Modal } from './components';
import { pick } from './i18n';

export const draftKey=(owner:string,mode:string)=>`hilo-draft-v1:${owner}:${mode}`;
export function ownedDrafts(owner:string){return Object.fromEntries(['day','idea','study'].map(mode=>[mode,readDraft(owner,mode)]));}
export function clearOwnedDrafts(owner:string){for(const mode of ['day','idea','study'])localStorage.removeItem(draftKey(owner,mode));}
export function readDraft<T>(owner:string|undefined,mode:string):T|null {
  if(!owner)return null;
  try {const raw=localStorage.getItem(draftKey(owner,mode));const value=raw?JSON.parse(raw).value:null;return value&&typeof value==='object'?value:null;}catch{return null;}
}
export function useDraftPersistence(owner:string|undefined,mode:string,value:unknown,hasContent:boolean){
  const cleared=useRef(false),[storageError,setStorageError]=useState(false);
  useLayoutEffect(()=>{if(!owner||cleared.current)return;try{const key=draftKey(owner,mode);if(hasContent)localStorage.setItem(key,JSON.stringify({value}));else localStorage.removeItem(key);setStorageError(false);}catch{setStorageError(true);}},[owner,mode,JSON.stringify(value),hasContent]);
  function clear(){cleared.current=true;if(owner)try{localStorage.removeItem(draftKey(owner,mode));}catch{}}
  return {clear,storageError};
}
export function DraftExit({onContinue,onSave,onDiscard,storageError=false}:{onContinue:()=>void;onSave:()=>void;onDiscard:()=>void;storageError?:boolean}){
  return <Modal title={pick('Tienes texto sin guardar.','You have unsaved text.')} onClose={onContinue}><p>{pick('¿Qué quieres hacer con este borrador?','What would you like to do with this draft?')}</p>{storageError&&<p className="inline-error" role="alert">{pick('No se pudo conservar el borrador en este dispositivo. Sigue editando o copia tu texto antes de cerrar.','The draft could not be saved on this device. Keep editing or copy your text before closing.')}</p>}<div className="draft-exit-actions"><button className="button primary full" onClick={onContinue}>{pick('Seguir editando','Keep editing')}</button><button className="button white full" disabled={storageError} onClick={onSave}>{pick('Guardar borrador','Save draft')}</button><button className="text-button" onClick={onDiscard}>{pick('Descartar','Discard')}</button></div></Modal>;
}
