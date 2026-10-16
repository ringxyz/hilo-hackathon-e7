/** Build one stable transcript from a Web Speech result list. Interim results
 * are intentionally ignored: some mobile engines resend their changing
 * hypotheses as extra chunks, which makes them appear repeatedly in the field.
 */
export function transcriptFromResults(results: any): string {
  const chunks: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result?.isFinal) continue;
    const transcript = String(result[0]?.transcript || '').trim().replace(/\s+/g, ' ');
    if (!transcript) continue;
    if (chunks.at(-1)?.toLocaleLowerCase() === transcript.toLocaleLowerCase()) continue;
    chunks.push(transcript);
  }
  return chunks.join(' ');
}
