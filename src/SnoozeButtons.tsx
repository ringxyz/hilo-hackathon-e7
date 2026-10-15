import {useRef} from 'react';
import {pick,tr} from './i18n';
export type Snooze='10m'|'1h'|'tomorrow';
export function SnoozeButtons({busy,onAction}:{busy:boolean;onAction:(action:Snooze,requestId:string)=>Promise<boolean>}){
 const ids=useRef<Partial<Record<Snooze,string>>>({});
 const run=(action:Snooze)=>{ids.current[action]??=crypto.randomUUID();void onAction(action,ids.current[action]!).then(ok=>{if(ok)delete ids.current[action];});};
 return <div className="snooze-options" aria-label={pick('Posponer actividad','Reschedule activity')}><button type="button" className="button white" disabled={busy} onClick={()=>run('10m')}>{pick('Posponer 10 min','Snooze 10 min')}</button><button type="button" className="button white" disabled={busy} onClick={()=>run('1h')}>{pick('Posponer 1 h','Snooze 1 hour')}</button><button type="button" className="button white" disabled={busy} onClick={()=>run('tomorrow')}>{tr('Mañana')}</button></div>;
}
