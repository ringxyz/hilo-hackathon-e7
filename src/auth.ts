import { tr } from './i18n';
import type { SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | null = null;
let starting: Promise<SupabaseClient> | null = null;
export async function authClient() {
  if (client) return client;
  if (!starting) starting = (async () => {
    const response = await fetch('/api/config',{signal:AbortSignal.timeout(15000)});
    const config = await response.json() as {supabaseUrl?:string;supabaseKey?:string};
    if (!response.ok || !config.supabaseUrl || !config.supabaseKey) throw new Error(tr('Estamos preparando el acceso. Vuelve en unos minutos.'));
    const {createClient}=await import('@supabase/supabase-js');
    client = createClient(config.supabaseUrl, config.supabaseKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    return client;
  })().catch(error => { starting = null; throw error; });
  return starting;
}
export async function accessToken() { const sb = await authClient(); const { data, error } = await sb.auth.getSession(); if (error) throw error; return data.session?.access_token; }
export async function signIn(calendar = false) {
  const sb = await authClient();
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + (calendar ? '/?view=ajustes&calendar=1' : '/'), ...(calendar ? { scopes: 'https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.app.created', queryParams: { access_type: 'offline', prompt: 'consent' } } : {}) } });
  if (error) throw error;
}
export async function signOut() {
  const sb=await authClient();
  if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();const sub=await registration?.pushManager.getSubscription();if(sub){const token=await accessToken();try{await fetch('/api/push/unsubscribe',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint}),signal:AbortSignal.timeout(5000)});}catch{}await sub.unsubscribe();}}
  const {error}=await sb.auth.signOut({scope:'local'});if(error)throw error;location.assign('/');
}
