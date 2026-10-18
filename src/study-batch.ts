import type {StudyDay} from './types';
export function studyEntries(days:StudyDay[]){return days.flatMap(day=>day.cards.map(card=>({day,card})));}
export function selectStudyBatch(days:StudyDay[],limit:number,onlyPending=false,exclude:string[]=[]){
  const entries=studyEntries(days).filter(x=>!exclude.includes(x.card.id)&&(!onlyPending||x.card.status!=='known'));
  return entries.sort((a,b)=>Number(a.card.status==='known')-Number(b.card.status==='known')).slice(0,limit||Infinity).map(x=>x.card.id);
}
