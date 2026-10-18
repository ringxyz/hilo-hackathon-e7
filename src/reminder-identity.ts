import type {Reminder} from './types';
export function uniqueReminders(items:Reminder[]){
  return [...new Map(items.map(r=>[`${r.activity_id}|${r.occurrence}|${r.kind}`,r])).values()];
}
export type ReminderGroup={activity_id:string;occurrence:string;reminders:Reminder[]};
export function groupReminderActivities(items:Reminder[]):ReminderGroup[]{
  const groups=new Map<string,ReminderGroup>();
  for(const reminder of uniqueReminders(items)){
    const key=`${reminder.activity_id}|${reminder.occurrence}`;
    const group=groups.get(key)||{activity_id:reminder.activity_id,occurrence:reminder.occurrence,reminders:[]};
    group.reminders.push(reminder);groups.set(key,group);
  }
  return [...groups.values()].sort((a,b)=>a.reminders[0].due_at.localeCompare(b.reminders[0].due_at));
}
export function dueReminderGroups(items:Reminder[],today:string,now:number):ReminderGroup[]{
  return groupReminderActivities(uniqueReminders(items).filter(r=>r.state==='pending'&&r.occurrence===today&&Date.parse(r.due_at)<=now));
}
