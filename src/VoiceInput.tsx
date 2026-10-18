import { tr, locale, pick } from './i18n';
import { createSpeechSession, speechErrorText } from './speech-session';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

export function VoiceInput({value,onChange,disabled=false,onRecording,reviewHint=false}:{value:string;onChange:(v:string)=>void;disabled?:boolean;onRecording?:(v:boolean)=>void;reviewHint?:boolean}) {
  const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[message,setMessage]=useState('');
  const voice=useRef<ReturnType<typeof createSpeechSession>|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),alive=useRef(true);
  const change=useRef(onChange),status=useRef(onRecording);change.current=onChange;status.current=onRecording;
  function clear(){if(timer.current)clearInterval(timer.current);timer.current=null;}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;clear();voice.current?.dispose();status.current?.(false);};},[]);
  function stop(cancel=false){voice.current?.stop(cancel);}
  function start(){
    const Speech=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    const showError=(code:string)=>{if(alive.current)setMessage(speechErrorText(code,locale().startsWith('en')));};
    if(!Speech){showError('unsupported');return;}
    if(!navigator.onLine){showError('offline');return;}
    voice.current?.dispose();setMessage('');setSeconds(0);
    voice.current=createSpeechSession({
      initialText:value,
      create:()=>{const r=new Speech();r.lang=locale();return r;},
      onText:text=>{if(alive.current)change.current(text);},
      onActive:active=>{clear();if(!alive.current)return;setRecording(active);status.current?.(active);if(active)timer.current=setInterval(()=>setSeconds(s=>s+1),1000);},
      onError:showError,
    });
    voice.current.start();
  }
  return <div className="voice-input"><div className="voice-controls">{recording?<><button type="button" className="button recording" onClick={()=>stop()}><Square size={16}/> {tr("Detener ·")} {seconds}s</button><button type="button" className="text-button" onClick={()=>stop(true)}>{tr("Cancelar dictado")}</button></>:<button type="button" className="button white" disabled={disabled} onClick={start}><Mic size={19}/> {tr("Dictar")}</button>}<span>{pick("Hasta 3 minutos por dictado","Up to 3 minutes per recording")}</span></div><p className="field-help">{reviewHint?pick("Tu voz se convierte en texto usando el servicio del navegador. Hilo no guarda el audio. Revisa lo escrito antes de pulsar Revisar.","Your voice becomes text using your browser service. Hilo does not save audio. Check the text before selecting Review."):pick("Tu voz se convierte en texto usando el servicio del navegador. Hilo no guarda el audio. Revisa lo escrito antes de continuar.","Your voice becomes text using your browser service. Hilo does not save audio. Check the text before continuing.")}</p>{message&&<p className="inline-error" role="status">{message}</p>}</div>;
}
