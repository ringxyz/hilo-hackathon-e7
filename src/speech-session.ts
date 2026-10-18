import { transcriptFromResults } from './speech-transcript';

// Keep browser recognition restarts inside one user-requested, three-minute session.
// A new engine has its own result list; replacing that list must not erase prior text.
export function createSpeechSession({ create, initialText, onText, onActive, onError, duration = 180000, schedule = setTimeout, unschedule = clearTimeout }: {
  create: () => any; initialText: string; onText: (text: string) => void;
  onActive: (active: boolean) => void; onError: (code: string) => void;
  duration?: number; schedule?: typeof setTimeout; unschedule?: typeof clearTimeout;
}) {
  let engine: any, active = false, disposed = false, networkRetries = 0, restarts = 0;
  let committed = initialText.trim(), current = '', error = '';
  let deadline: ReturnType<typeof setTimeout> | undefined, retry: ReturnType<typeof setTimeout> | undefined, opening: ReturnType<typeof setTimeout> | undefined;
  const text = () => [committed, current].filter(Boolean).join('\n').slice(0, 6000);
  const commit = () => { committed = text(); current = ''; };
  function finish() {
    active = false;
    if (deadline) unschedule(deadline);
    if (retry) unschedule(retry);
    if (opening) unschedule(opening);
    onActive(false);
  }
  function listen() {
    if (!active || disposed) return;
    let r: any;
    try { r = create(); }
    catch { onError('start-failed'); finish(); return; }
    engine = r; error = ''; current = '';
    r.continuous = true; r.interimResults = false;
    const valid = () => !disposed && engine === r;
    r.onstart = () => { if (valid() && opening) unschedule(opening); };
    r.onresult = (event: any) => {
      if (!valid()) return;
      current = transcriptFromResults(event.results);
      onText(text());
    };
    r.onerror = (event: any) => {
      if (!valid() || !active) return;
      error = String(event.error || 'unknown');
      // Never log the transcript, audio, profile or provider error message.
      console.warn('[Hilo dictation]', error);
      if (error === 'network' && networkRetries < 1) return;
      onError(error); finish();
    };
    r.onend = () => {
      if (!valid()) return;
      if (opening) unschedule(opening);
      const heard = !!current;
      commit();
      engine = undefined;
      if (!active) { engine = undefined; return; }
      if (error === 'network' && networkRetries++ < 1) {
        retry = schedule(listen, 600); return;
      }
      // Some mobile engines end after a sentence despite continuous=true.
      // Resume only when speech arrived, never repeatedly reopen a silent mic.
      if (!error && heard && restarts++ < 30) { retry = schedule(listen, 200); return; }
      if (!error && !heard) onError('no-speech');
      finish(); engine = undefined;
    };
    try {
      r.start();
      opening = schedule(() => {
        if (!valid() || !active) return;
        onError('start-timeout'); finish(); r.abort();
      }, 10000);
    } catch (cause) {
      onError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'not-allowed' : 'start-failed');
      finish();
    }
  }
  return {
    start() {
      if (active || disposed) return;
      active = true; onActive(true);
      deadline = schedule(() => this.stop(), duration);
      listen();
    },
    stop(cancel = false) {
      finish();
      if (cancel) { disposed = true; engine?.abort(); onText(initialText); }
      else { engine?.stop(); }
    },
    dispose() { disposed = true; finish(); engine?.abort(); },
  };
}

export function speechErrorText(code: string, english = false): string {
  const messages: Record<string, [string, string]> = {
    'not-allowed': ['El navegador ha bloqueado el micrófono. Permite el micrófono para Hilo en los permisos del sitio y vuelve a pulsar Dictar.', 'The browser blocked the microphone. Allow microphone access for Hilo in site permissions, then select Dictate again.'],
    'audio-capture': ['No se puede acceder al micrófono. Comprueba que esté conectado y que otra aplicación no lo esté usando.', 'The microphone is unavailable. Check that it is connected and not being used by another application.'],
    'network': ['No se pudo conectar con el servicio de dictado del navegador tras reintentarlo. Comprueba tu conexión. Si estás en el navegador de Codex, abre Hilo en Chrome. También puedes usar el micrófono del teclado del móvil.', 'The browser dictation service could not connect after retrying. Check your connection. If you are in the Codex browser, open Hilo in Chrome. You can also use your mobile keyboard microphone.'],
    'service-not-allowed': ['Este navegador no permite su servicio de dictado. Abre Hilo en Chrome o usa el micrófono del teclado del móvil.', 'This browser does not allow its dictation service. Open Hilo in Chrome or use your mobile keyboard microphone.'],
    'no-speech': ['No se ha detectado voz. Acércate al micrófono y pulsa Dictar para intentarlo de nuevo. Tu texto se conserva.', 'No speech was detected. Move closer to the microphone and select Dictate to try again. Your text is preserved.'],
    'language-not-supported': ['El servicio de dictado de este navegador no admite el idioma elegido. Prueba en Chrome o usa el micrófono del teclado del móvil.', 'This browser dictation service does not support the selected language. Try Chrome or your mobile keyboard microphone.'],
    'start-timeout': ['El navegador no ha iniciado el dictado. Revisa si hay una solicitud de permiso de micrófono. Si estás en Codex, abre Hilo en Chrome.', 'The browser did not start dictation. Check for a microphone permission prompt. If you are in Codex, open Hilo in Chrome.'],
    'unsupported': ['Este navegador no ofrece dictado. Abre Hilo en Chrome o usa el micrófono del teclado del móvil.', 'This browser does not offer dictation. Open Hilo in Chrome or use your mobile keyboard microphone.'],
    'offline': ['El dictado del navegador necesita conexión. Puedes usar el micrófono del teclado o seguir escribiendo.', 'Browser dictation needs a connection. You can use your keyboard microphone or keep typing.'],
    'aborted': ['El navegador ha detenido el dictado. Tu texto se conserva. Pulsa Dictar para continuar.', 'The browser stopped dictation. Your text is preserved. Select Dictate to continue.'],
  };
  return (messages[code] || ['No se pudo iniciar el dictado. Tu texto se conserva. Inténtalo de nuevo o usa el micrófono del teclado.', 'Dictation could not start. Your text is preserved. Try again or use your keyboard microphone.'])[english ? 1 : 0];
}
