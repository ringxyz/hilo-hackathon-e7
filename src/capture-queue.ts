import { api } from './api';
import { authClient } from './auth';
import { rawIdea } from './domain';
export type QueuedIdea={id:string;owner:string;text:string;createdAt:number};
export const OWNER_KEY='hilo-capture-owner';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('hilo-capture-queue',1);request.onupgradeneeded=()=>request.result.createObjectStore('ideas',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transact<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('ideas',mode),r=run(tx.objectStore('ideas'));tx.oncomplete=()=>{db.close();resolve(r.result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};});}
export async function queuedIdeas(owner:string){return (await transact('readonly',s=>s.getAll()) as QueuedIdea[]).filter(x=>x.owner===owner).sort((a,b)=>a.createdAt-b.createdAt);}
export async function enqueueIdea(owner:string,text:string,id:string){if(!owner||!text.trim()||text.length>6000)throw new Error('Invalid capture');await transact('readwrite',s=>s.put({id,owner,text,createdAt:Date.now()}));window.dispatchEvent(new Event('hilo-queue-change'));}
export async function removeIdea(id:string){await transact('readwrite',s=>s.delete(id));window.dispatchEvent(new Event('hilo-queue-change'));}
export async function clearQueue(owner:string){for(const idea of await queuedIdeas(owner))await removeIdea(idea.id);}
let flushing:Promise<number>|null=null;
export async function flushQueue(owner:string):Promise<number>{
 if(flushing)return flushing;
 flushing=(async()=>{let count=0;for(const idea of await queuedIdeas(owner)){
  const {data}=await (await authClient()).auth.getSession();if(data.session?.user.id!==owner)break;
  await api('/api/capture/save',{requestId:idea.id,activities:[rawIdea(idea.text)]},owner);
  await removeIdea(idea.id);count++;
 }return count;})().finally(()=>{flushing=null;});return flushing;
}
