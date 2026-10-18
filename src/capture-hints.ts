import { addDays } from './domain';
import type { Activity } from './types';
export type Hint = {field:'date'|'time'|'recurrence'|'tag'|'priority'; raw:string; value:string; label:string};
export function captureHints(text:string,today:string,language:'es'|'en'='es'):Hint[]{
  const en=language==='en',h:Hint[]=[];
  const days=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],english=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const weekly=text.match(/\b(?:todos los|cada|every)\s+(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/i);
  const daily=text.match(/\b(?:todos los días|cada día|diariamente|every day|daily)\b/i);
  const weeklyGeneric=text.match(/\b(?:cada semana|semanalmente|every week|weekly)\b/i);
  const explicit=text.match(/\b\d{4}-\d{2}-\d{2}\b/),tomorrow=text.match(/\b(?:mañana|tomorrow)\b/i),now=text.match(/\b(?:hoy|today)\b/i);
  const weekday=weekly||text.match(/\b(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if(explicit)h.push({field:'date',raw:explicit[0],value:explicit[0],label:explicit[0]});
  else if(weekday){const word=weekday[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),idx=[days,english].map(a=>a.findIndex(d=>d.normalize('NFD').replace(/[\u0300-\u036f]/g,'')===word)).find(i=>i>=0)!;const date=addDays(today,(idx-new Date(today+'T12:00Z').getUTCDay()+7)%7);h.push({field:'date',raw:weekly?'':weekday[0],value:date,label:(en?english:days)[idx]});}
  else if(tomorrow&&!/de la mañana|por la mañana/i.test(text))h.push({field:'date',raw:tomorrow[0],value:addDays(today,1),label:en?'Tomorrow':'Mañana'});
  else if(now||daily||weeklyGeneric)h.push({field:'date',raw:now?.[0]||'',value:today,label:en?'Today':'Hoy'});
  if(weekly||daily||weeklyGeneric)h.push({field:'recurrence',raw:(weekly||daily||weeklyGeneric)![0],value:daily?'daily':'weekly',label:en?'Repeats':'Recurrente'});
  const clock=text.match(/\b(?:(?:a las?|at)\s+)?(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b/i)||text.match(/\b(?:(?:a las?|at)\s+)?(\d{1,2})()\s*(am|pm)\b/i);
  if(clock){let hour=+clock[1];const min=+(clock[2]||0),period=clock[3]?.toLowerCase();if(min<60&&hour<24&&(!period||(hour>=1&&hour<=12))){if(period==='pm'&&hour<12)hour+=12;if(period==='am'&&hour===12)hour=0;const time=String(hour).padStart(2,'0')+':'+String(min).padStart(2,'0');h.push({field:'time',raw:clock[0],value:time,label:time});}}
  const tag=text.match(/#[\p{L}\p{N}_-]{1,40}/u);if(tag)h.push({field:'tag',raw:tag[0],value:tag[0].slice(1),label:tag[0].slice(1)});
  const priority=text.match(/\bp([1-4])\b|\b(urgente|urgent)\b/i);if(priority)h.push({field:'priority',raw:priority[0],value:priority[1]||'1',label:(!priority[1]||priority[1]==='1')?(en?'High priority':'Prioridad alta'):en?`Priority ${priority[1]}`:`Prioridad ${priority[1]}`});
  return h;
}
export function applyCaptureHints(d:Partial<Activity>,text:string,today:string,language:'es'|'en'):Partial<Activity>{
  const hints=captureHints(text,today,language),get=(f:Hint['field'])=>hints.find(h=>h.field===f)?.value;
  const date=get('date')||d.date||null,time=get('time')||d.time||null,recurrence=(get('recurrence')||d.recurrence||'none') as Activity['recurrence'];
  return {...d,date,time,recurrence,tag:get('tag')||d.tag,priority:get('priority')?Number(get('priority')) as Activity['priority']:d.priority,
    title:hints.reduce((title,h)=>h.raw?title.replace(h.raw,''):title,d.title||'').replace(/#[\p{L}\p{N}_-]+|\bp[1-4]\b/giu,'').replace(/\s+/g,' ').trim(),
    ambiguous:date&&time?'':d.ambiguous};
}
