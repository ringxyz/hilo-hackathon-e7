type PendingDraft={kind?:string;date?:string|null;time?:string|null;ambiguous?:string;priority?:number};
import type { Activity, Energy } from './types';
export function adaptDayToEnergy<T extends Partial<Activity>>(drafts:T[],today:string,energy:Energy,existing=0):T[]{
  if(energy!=='low')return drafts;
  let available=Math.max(0,3-existing);
  return drafts.map(d=>d.kind==='task'&&d.date===today?(available-->0?d:{...d,date:null,time:null,recurrence:'none',reminder:false}):d);
}

/** Put one clear, undated task on today's plan so the capture has a next step. */
export function recommendFirstTaskForToday<T extends PendingDraft>(drafts:T[],today:string):T[]{
  if(drafts.some(d=>d.kind==='task'&&d.date===today))return drafts;
  const index=drafts.map((d,i)=>({d,i})).filter(({d})=>d.kind==='task'&&!d.date&&!d.time&&!d.ambiguous).sort((a,b)=>(a.d.priority||4)-(b.d.priority||4))[0]?.i??-1;
  return index<0?drafts:drafts.map((draft,i)=>i===index?{...draft,date:today}:draft);
}
