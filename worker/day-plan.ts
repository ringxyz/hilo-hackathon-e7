import { activitySchema } from './repo';
import type { Settings } from '../src/types';

// Dates and notifications are resolved by application rules, not model defaults.
export function prepareDayDrafts(values:Record<string,unknown>[],settings:Settings){
  return values.map(value=>{
    let ambiguous=typeof value.ambiguous==='string'?value.ambiguous.slice(0,500):'';
    const hasTime=typeof value.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time),hasDate=typeof value.date==='string';
    if(hasTime&&!hasDate)ambiguous ||= 'Confirma el día de esta actividad.';
    const scheduled=hasTime&&hasDate&&!ambiguous,dated=hasDate&&!ambiguous;
    const a=activitySchema.parse({...value,tag:typeof value.tag==='string'?value.tag:undefined,priority:[1,2,3,4].includes(value.priority as number)?value.priority:undefined,purpose:value.purpose==='study'?'study':undefined,date:dated?value.date:null,time:scheduled?value.time:null,recurrence:dated?(value.recurrence||'none'):'none',reminder:scheduled,status:'pending',source:'hilo',travelMinutes:value.kind==='event'?(settings.defaultTravelMinutes??30):0,timezone:settings.timezone});
    return {...a,ambiguous};
  });
}
