import { useState } from 'react';
import { captureHints, type Hint } from './capture-hints';
import { getLanguage, pick } from './i18n';
export function CaptureHints({text,today,onChange}:{text:string;today:string;onChange:(text:string)=>void}){
  const [editing,setEditing]=useState<Hint|null>(null),[value,setValue]=useState('');
  const hints=captureHints(text,today,getLanguage());
  const valid=!!value.trim()&&(editing?.field!=="time"||/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
  if(!hints.length)return null;
  function save(){if(!editing)return;const v=value.trim();if(!v)return;const token=editing.field==='tag'?'#'+v.replace(/^#/, ''):editing.field==='priority'?'p'+v:editing.field==='time'?'a las '+v:editing.field==='recurrence'?({none:'',daily:pick('cada día','every day'),weekly:pick('cada semana','every week')}[v]||''):v;
    let next=editing.raw?text.replace(editing.raw,token):text+' '+token;
    const recurrence=hints.find(h=>h.field==='recurrence');
    if(editing.field==='date'&&recurrence?.value==='weekly')next=next.replace(recurrence.raw,pick('cada semana','every week'));
    onChange(next);setEditing(null);}
  return <div className="capture-hints"><div className="hint-chips" aria-label={pick('Detectado en tu texto. Toca para corregir.','Detected in your text. Tap to correct.')}>
    {hints.map(h=><button type="button" key={h.field} onClick={()=>{setEditing(h);setValue(h.value);}} aria-label={pick('Corregir: ','Correct: ')+h.label}>{h.label}</button>)}
  </div>{editing&&<div className="hint-editor"><label className="field">{pick('Corregir dato','Correct detail')}{editing.field==='priority'||editing.field==='recurrence'?<select value={value} onChange={e=>setValue(e.target.value)}>{(editing.field==='priority'?['1','2','3','4']:['none','daily','weekly']).map(v=><option key={v} value={v}>{editing.field==='priority'?'P'+v:v==='none'?pick('Sin repetición','No repeat'):v==='daily'?pick('Cada día','Every day'):pick('Cada semana','Every week')}</option>)}</select>:<input type={editing.field==='date'?'date':'text'} inputMode={editing.field==="time"?"numeric":undefined} placeholder={editing.field==="time"?"HH:MM":undefined} maxLength={editing.field==="time"?5:40} value={value} onChange={e=>setValue(e.target.value)}/>}</label><button type="button" className="text-button" disabled={!valid} onClick={save}>{pick('Aplicar','Apply')}</button><button type="button" className="text-button" onClick={()=>setEditing(null)}>{pick('Cancelar','Cancel')}</button></div>}</div>;
}
