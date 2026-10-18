import { DayCapture } from './DayCapture';
import type { Activity, AppState } from './types';
/** Both entry points share the same capture and explicit review decisions. */
export function Capture({mode,state,busy,error,onClose,onSave,onRawSave}:{mode:'normal'|'idea'|'tomorrow';state:AppState;busy:boolean;error:string;onClose:()=>void;onRawSave:(text:string,id:string)=>Promise<boolean>;onManual:(text:string)=>void;onSave:(a:Partial<Activity>[],id:string)=>Promise<boolean>}){
 return <DayCapture mode={mode==='idea'?'idea':'day'} state={state} busy={busy} error={error} onClose={onClose} onRawSave={onRawSave} onSave={onSave}/>;
}
