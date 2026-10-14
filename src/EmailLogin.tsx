import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { authClient } from './auth';
import { pick } from './i18n';

export function EmailLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const client = await authClient();
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
    } catch {
      setError(pick('No se pudo iniciar sesión. Revisa el correo y la contraseña e inténtalo de nuevo.', 'Unable to sign in. Check your email and password and try again.'));
    } finally { setBusy(false); }
  }
  return <details className="email-login"><summary>{pick('Acceso con correo y contraseña', 'Sign in with email and password')}</summary><form onSubmit={submit}>
    <p className="field-help">{pick('Si tienes una cuenta de prueba, entra aquí para explorar Hilo con datos ficticios.', 'If you have a test account, sign in here to explore Hilo with fictional data.')}</p>
    <label className="field">{pick('Correo de la cuenta', 'Account email')}<input type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
    <label className="field">{pick('Contraseña', 'Password')}<input type="password" autoComplete="current-password" required value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <button className="button primary full" disabled={busy}>{busy ? pick('Entrando…', 'Signing in…') : pick('Entrar en Hilo', 'Sign in to Hilo')}<ArrowRight size={18}/></button>
  </form></details>;
}
