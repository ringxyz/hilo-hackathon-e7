type PendingDraft={kind?:string;date?:string|null;time?:string|null;ambiguous?:string};

/** Put one clear, undated task on today's plan so the capture has a next step. */
export function recommendFirstTaskForToday<T extends PendingDraft>(drafts:T[],today:string):T[]{
  if(drafts.some(d=>d.kind==='task'&&d.date===today))return drafts;
  const index=drafts.findIndex(d=>d.kind==='task'&&!d.date&&!d.time&&!d.ambiguous);
  return index<0?drafts:drafts.map((draft,i)=>i===index?{...draft,date:today}:draft);
}
