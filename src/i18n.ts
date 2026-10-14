import { useSyncExternalStore } from 'react';
import { english } from './translations';
export type Language='es'|'en';
const listeners=new Set<()=>void>();
function initial():Language {if(typeof location==='undefined')return 'es';if(location.pathname.startsWith('/en'))return 'en';try{return localStorage.getItem('hilo-language')==='en'?'en':'es';}catch{return 'es';}}
let language=initial();
export const getLanguage=()=>language;
export const locale=()=>language==='en'?'en-GB':'es-ES';
export function setLanguage(value:Language){language=value;try{localStorage.setItem('hilo-language',value);}catch{}document.documentElement.lang=value;if(location.pathname==='/'||location.pathname==='/en')history.replaceState(null,'',(value==='en'?'/en':'/')+location.search+location.hash);listeners.forEach(fn=>fn());}
export function useLanguage(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},getLanguage,()=> 'es' as Language);}
export function tr(text:string){return language==='en'?(english[text]??text):text;}
export function pick(es:string,en:string){return language==='en'?en:es;}
