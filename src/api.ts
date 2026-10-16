import { getLanguage, tr, pick } from './i18n';
import { accessToken } from './auth';
import type { AppState } from './types';
export class HiloApiError extends Error {constructor(message:string,public status:number,public code?:string){super(message);}}
export async function api<T = AppState>(path: string, body?: unknown, expectedOwner?:string): Promise<T> {
  const token = await accessToken(expectedOwner);
  if (!token) throw new Error(tr('Inicia sesión para abrir tu espacio.'));
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Hilo-Language':getLanguage(), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(path.includes("/study/")||path.includes("/capture/parse")?100000:25000) }).catch(()=>{throw new Error(pick("No se pudo conectar con Hilo. Comprueba internet y vuelve a intentarlo; tu texto sigue en pantalla.","Could not connect to Hilo. Check your connection and retry; your text is still on screen."));});
  const data = await response.json().catch(()=>{throw new Error(pick("Hilo no ha podido responder. Vuelve a intentarlo en un momento.","Hilo could not respond. Please try again shortly."));}) as T & { error?: string; code?:string };
  if (!response.ok) throw new HiloApiError(response.status === 401 ? tr('Inicia sesión para abrir tu espacio.') : tr(data.error || 'No se pudo completar la acción.'),response.status,data.code);
  return data;
}
