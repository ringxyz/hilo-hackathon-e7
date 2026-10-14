import { accessToken } from './auth';
import type { AppState } from './types';
export async function api<T = AppState>(path: string, body?: unknown): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error('Inicia sesión para abrir tu espacio.');
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(response.status === 401 ? 'Inicia sesión para abrir tu espacio.' : data.error || 'No se pudo completar la acción.');
  return data;
}
