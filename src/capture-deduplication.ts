/** Collapse duplicate proposals caused by repeated or cumulative speech recognition. */
export function deduplicateCaptureDrafts<T extends {
  title?: unknown;
  kind?: unknown;
  date?: unknown;
  time?: unknown;
  recurrence?: unknown;
}>(drafts: T[], alreadyPending: T[] = []) {
  const seen = new Set<string>();
  const unique: T[] = [];
  const signature = (draft: T) => {
    const title = typeof draft.title === 'string'
      ? draft.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
      : '';
    if (!title) return null;
    return JSON.stringify([title,draft.kind ?? 'task',draft.date ?? null,draft.time ?? null,draft.recurrence ?? 'none']);
  };
  for (const draft of alreadyPending) {
    const key=signature(draft);
    if (key) seen.add(key);
  }
  for (const draft of drafts) {
    // Leave unclear/empty titles untouched so validation can ask the user to edit them.
    const key=signature(draft);
    if (!key) { unique.push(draft); continue; }
    if (seen.has(key)) { continue; }
    seen.add(key);
    unique.push(draft);
  }
  return { drafts: unique, removed: drafts.length - unique.length };
}
