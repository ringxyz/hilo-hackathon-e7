import type { Activity, FocusSession } from "./types";
export function localDate(now = new Date(), timezone = "Europe/Madrid") {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(now);
  return `${p.find(x=>x.type==="year")!.value}-${p.find(x=>x.type==="month")!.value}-${p.find(x=>x.type==="day")!.value}`;
}
export function addDays(date: string, days: number) { const d = new Date(date+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
export function occursOn(a: Activity, date: string) {
  if(!a.date || date<a.date) return false;
  if(a.recurrence==="daily") return true;
  if(a.recurrence==="weekly") return new Date(date+"T12:00:00Z").getUTCDay()===new Date(a.date+"T12:00:00Z").getUTCDay();
  if(a.recurrence==="annual") return date.slice(5)===a.date.slice(5);
  return date===a.date;
}
export function isDone(a: Activity, date: string) { return a.recurrence==="none" ? a.status==="done" : (a.completedDates||[]).includes(date); }
export function elapsedSeconds(s: FocusSession, now = Date.now()) { return Math.max(0, s.elapsed + (s.status==="running"&&s.startedAt ? Math.floor((now-s.startedAt)/1000):0)); }
export function pauseSession(s: FocusSession, note: string, now = Date.now()): FocusSession {return {...s, elapsed:elapsedSeconds(s,now), startedAt:null, status:"paused",note};}
export function parseCapture(text: string, baseDate: string, tomorrow = false, language:'es'|'en'='es'): Partial<Activity>[] {
  if(language==='en')return parseEnglishCapture(text,baseDate,tomorrow);
  const defaultDate = tomorrow ? addDays(baseDate,1):null;
  const pieces=text.trim().split(/\n|;|,(?=\s*(?:mañana|hoy|preparar|comprar|repasar|terminar|hacer|llamar|reunión|entrenamiento|cita|estudiar))|\s+y\s+(?=(?:preparar|comprar|repasar|terminar|hacer|llamar|reunión|entrenamiento|cita|estudiar)\b)/i).filter(x=>x.trim());
  return pieces.slice(0,12).map((piece,index)=>{
    let date = /\bmañana\b/i.test(piece)?addDays(baseDate,1):/\bhoy\b/i.test(piece)?baseDate:defaultDate;
    const explicitDate=piece.match(/\b(\d{4}-\d{2}-\d{2})\b/); if(explicitDate) date=explicitDate[1];
    const t=piece.match(/\ba\s+las?\s+(\d{1,2})(?::(\d{2}))?(?:\s*(?:de\s+la\s+)?(mañana|tarde|noche)|\s*(am|pm))?/i);
    const words=piece.match(/\ba\s+las?\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s+de\s+la\s+(mañana|tarde|noche))?/i);
    let time:string|null=null, ambiguous="";
    if(t||words) {
      let hour=t?Number(t[1]):["una","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce"].indexOf(words![1].toLowerCase())+1;
      const minute=t?Number(t[2]||0):0, period=t?(t[3]||t[4]):words![2];
      if(!period&&hour>=1&&hour<=12) ambiguous="Elige la hora: ¿por la mañana o por la tarde?";
      else if(hour>23||minute>59) ambiguous="Revisa la hora indicada.";
      else {if(/tarde|noche|pm/i.test(period||"")&&hour<12)hour+=12;if(/mañana|am/i.test(period||"")&&hour===12)hour=0;time=`${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;if(!date) ambiguous="Elige el día para esta cita.";}
    }
    const recurrence:Activity["recurrence"]=/todos los días|cada día|diariamente/i.test(piece)?"daily":/cada semana|semanalmente/i.test(piece)?"weekly":/cada año|anualmente/i.test(piece)?"annual":"none";
    if(recurrence!=="none"&&!date)ambiguous="Elige el primer día de la repetición.";
    const duration=piece.match(/(\d+)\s*(?:minutos|min)\b/i);
    const title=piece.replace(t?.[0]||words?.[0]||/$(?!)/,"").replace(/\b(?:mañana|hoy)\b/ig,"").replace(explicitDate?.[0]||/$(?!)/,"").replace(/todos los días|cada día|diariamente|cada semana|semanalmente|cada año|anualmente/ig,"").replace(/\s+/g," ").trim().replace(/^[,.\s]+|[,.\s]+$/g,"");
    return {title:title.charAt(0).toUpperCase()+title.slice(1),kind:t||words?"event":"task",date,time,duration:duration?Math.min(240,Math.max(1,Number(duration[1]))):15,estimated:!duration,nextStep:"",note:"",status:"pending",color:(["pink","mint","peach","blue"] as const)[index%4],recurrence,source:"hilo",reminder:false,ambiguous};
  });
}
function parseEnglishCapture(text:string,baseDate:string,tomorrow:boolean):Partial<Activity>[] {
  return text.trim().split(/\n|;/).filter(x=>x.trim()).slice(0,12).map((piece,index)=>{
    let date=/\btomorrow\b/i.test(piece)?addDays(baseDate,1):/\btoday\b/i.test(piece)?baseDate:tomorrow?addDays(baseDate,1):null;
    const explicit=piece.match(/\b\d{4}-\d{2}-\d{2}\b/);if(explicit)date=explicit[0];
    const match=piece.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);let time:string|null=null,ambiguous='';
    if(match){let hour=Number(match[1]);const minutes=Number(match[2]||0),period=match[3]?.toLowerCase();if(hour>23||minutes>59||(period&&(hour<1||hour>12)))ambiguous='Check the time.';else if(!period&&hour>=1&&hour<=12)ambiguous='Choose the time: am or pm?';else{if(period==='pm'&&hour<12)hour+=12;if(period==='am'&&hour===12)hour=0;time=String(hour).padStart(2,'0')+':'+String(minutes).padStart(2,'0');if(!date)ambiguous='Choose a date for this event.';}}
    const recurrence:Activity['recurrence']=/every day|daily/i.test(piece)?'daily':/every week|weekly/i.test(piece)?'weekly':/every year|annually/i.test(piece)?'annual':'none';if(recurrence!=='none'&&!date)ambiguous='Choose the first day of the repeat.';
    const duration=piece.match(/(\d+)\s*(?:minutes|min)\b/i),title=piece.replace(match?.[0]||/$(?!)/,'').replace(explicit?.[0]||/$(?!)/,'').replace(/\b(today|tomorrow|every day|daily|every week|weekly|every year|annually)\b/ig,'').replace(/\s+/g,' ').trim();
    return {title:title.charAt(0).toUpperCase()+title.slice(1),kind:match?'event':'task',date,time,duration:duration?Math.max(1,Math.min(240,Number(duration[1]))):15,estimated:!duration,nextStep:'',note:'',status:'pending',color:(['pink','mint','peach','blue'] as const)[index%4],recurrence,source:'hilo',reminder:false,ambiguous};
  });
}
export function timeToInstant(date:string,time:string,zone:string):Date {
  const target=Date.parse(`${date}T${time}:00Z`); let guess=target;
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(guess));
    const get=(x:string)=>parts.find(p=>p.type===x)!.value;
    const represented=Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
    guess+=target-represented;
  }
  const result=new Date(guess);
  const actual=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(result);
  if(localDate(result,zone)!==date||actual!==time)throw new Error('Esa hora no existe por el cambio horario. Elige otra hora.');
  return result;
}

export function scheduledActivity<T extends Partial<Activity>>(a:T,defaultZone:string):T {
  const timezone=a.timezone||defaultZone;
  return {...a,timezone,startsAt:a.date&&a.time?timeToInstant(a.date,a.time,timezone).toISOString():null,travelMinutes:a.kind==='event'?(a.travelMinutes??30):0};
}
export function departureTime(a:Activity,day=a.date,defaultZone='Europe/Madrid') {
  if(a.kind!=='event'||!day||!a.time)return null;
  const zone=a.timezone||defaultZone,instant=new Date(+timeToInstant(day,a.time,zone)-(a.travelMinutes??30)*60000);
  return {date:localDate(instant,zone),time:new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant)};
}
export function snoozeInstant(option:'10m'|'1h'|'tomorrow',now:Date,zone:string) {
  if(option!=='tomorrow')return new Date(+now+(option==='10m'?10:60)*60000);
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  return timeToInstant(addDays(localDate(now,zone),1),time,zone);
}
export function rawIdea(text:string):Partial<Activity> {
  return {title:text.trim().slice(0,160),note:text,kind:'task',date:null,time:null,duration:20,nextStep:'',status:'pending',color:'mint',recurrence:'none',source:'hilo',reminder:false};
}

