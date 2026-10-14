import { tr, locale, pick } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

export function VoiceInput({value,onChange,disabled=false,onRecording}:{value:string;onChange:(v:string)=>void;disabled?:boolean;onRecording?:(v:boolean)=>void}) {
  const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[message,setMessage]=useState('');
  const voice=useRef<any>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),limit=useRef<ReturnType<typeof setTimeout>|null>(null),base=useRef(''),alive=useRef(true),cancelled=useRef(false);
  const change=useRef(onChange),status=useRef(onRecording);change.current=onChange;status.current=onRecording;
  function clear(){if(timer.current)clearInterval(timer.current);if(limit.current)clearTimeout(limit.current);}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancelled.current=true;clear();voice.current?.abort();status.current?.(false);};},[]);
  function stop(cancel=false){cancelled.current=cancel;cancel?voice.current?.abort():voice.current?.stop();if(cancel)change.current(base.current.trim());}
  function start(){
    const Speech=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!Speech){setMessage(tr("Este navegador no ofrece dictado. Puedes usar el micrófono del teclado del móvil o escribir aquí."));return;}
    setMessage('');base.current=value.trim()?value.trim()+'\n':'';cancelled.current=false;
    const r=new Speech();voice.current=r;r.lang=locale();r.continuous=true;r.interimResults=true;
    r.onresult=(event:any)=>{let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript+' ';if(alive.current&&!cancelled.current)change.current((base.current+text.trim()).slice(0,6000));};
    r.onerror=(event:any)=>{if(alive.current&&event.error!=='aborted')setMessage(event.error==='not-allowed'?tr("El micrófono no tiene permiso. Puedes activarlo en el navegador o escribir."):tr("El dictado se ha interrumpido. Revisa el texto y continúa cuando quieras."));};
    r.onend=()=>{clear();if(alive.current){setRecording(false);status.current?.(false);}};
    try{r.start();setSeconds(0);setRecording(true);status.current?.(true);timer.current=setInterval(()=>setSeconds(s=>s+1),1000);limit.current=setTimeout(()=>r.stop(),90000);}catch{setMessage(tr("No se pudo abrir el micrófono. Puedes seguir escribiendo."));}
  }
  return <div className="voice-input"><div className="voice-controls">{recording?<><button type="button" className="button recording" onClick={()=>stop()}><Square size={16}/> {tr("Detener ·")} {seconds}s</button><button type="button" className="text-button" onClick={()=>stop(true)}>{tr("Cancelar dictado")}</button></>:<button type="button" className="button white" disabled={disabled} onClick={start}><Mic size={19}/> {tr("Dictar")}</button>}<span>{tr("Hasta 90 segundos por dictado")}</span></div><p className="field-help">{tr("El navegador convierte la voz en texto y puede usar su servicio de reconocimiento. Hilo no guarda el audio. Revisa lo escrito antes de enviarlo.")}</p>{message&&<p className="inline-error" role="status">{message}</p>}</div>;
}
