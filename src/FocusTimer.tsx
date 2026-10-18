import { pick } from './i18n';
import { useEffect, useRef, useState } from 'react';
export function FocusTimer({remaining,total,compact=false,reducedMotion=false}:{remaining:number;total:number;compact?:boolean;reducedMotion?:boolean}){
 const [systemReduce,setSystemReduce]=useState(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setSystemReduce(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 const current=Math.max(0,Math.min(1,remaining/Math.max(total,1))),initial=useRef(current),fraction=reducedMotion||systemReduce?initial.current:current,minutes=Math.ceil(remaining/60),length=Math.round(total/60);
 return <div className={'focus-time '+(compact?'compact':'')} role="img" aria-label={remaining>0?pick(`Quedan ${minutes} minutos de ${length}`,`${minutes} minutes left of ${length}`):pick('A tu ritmo','At your own pace')}><svg viewBox="0 0 200 200" aria-hidden="true"><circle className="time-track" cx="100" cy="100" r="85"/><circle className="time-remaining" cx="100" cy="100" r="85" pathLength="100" strokeDasharray={`${fraction*100} 100`} transform="rotate(-90 100 100)"/></svg><p>{remaining>0?<>{pick(`Quedan ${minutes} min`,`${minutes} min left`)}<small>{pick(`de ${length}`,`of ${length}`)}</small></>:pick('A tu ritmo','At your own pace')}</p></div>;
}
