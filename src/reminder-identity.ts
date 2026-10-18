import type {Reminder} from './types';
export function uniqueReminders(items:Reminder[]){
  return [...new Map(items.map(r=>[`${r.activity_id}|${r.occurrence}|${r.kind}`,r])).values()];
}
