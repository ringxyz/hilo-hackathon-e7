# Dictation reliability — 2026-10-18

- Reproduced the generic interruption in the embedded browser on the deployed app. The old implementation discarded the error code; this does not establish the cause of the user's individual attempt.
- Separate messages for permission denial, unavailable microphone, missing speech, unsupported service/language, offline state and connection failure. Log only the browser error code, never text or audio.
- Retry a connection failure once, then stop with an actionable explanation. No unlimited retries for a blocked service.
- Resume successful speech segments when a mobile engine ends early, preserving prior segments with one total three-minute deadline.
- Cancel restores the original text. Stop accepts final results. Unmount invalidates late callbacks and clears all timers. A stalled start releases the UI after ten seconds.
- Regression coverage: `scripts/test-speech-session.mjs` and `scripts/test-speech-transcript.mjs`. No provider, schema, account or task data changes.
- Physical microphone accuracy and end-to-end recognition in the user's external browser require a spoken test on that device. Simulated recognition events are lifecycle tests, not a real speech-to-text test.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error

## Silence after successful dictation

Track whether the current user-started session produced a non-empty final transcript, across automatic engine restarts. A `no-speech` event or empty engine end now shows the missing-voice warning only if the entire session produced no text. Evaluate explicit silence at `onend` so an already-queued final result can arrive first. Existing typed text does not count as newly recognized speech. Permission, connection and microphone failures remain visible. Regression cases cover same-engine silence, quiet restarted engines, late final results, manual stop and genuinely empty dictation.
