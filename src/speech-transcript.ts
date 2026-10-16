/** Build one stable transcript from a Web Speech result list. Interim results
 * are intentionally ignored: some mobile engines resend their changing
 * hypotheses as extra chunks, which makes them appear repeatedly in the field.
 */
export function transcriptFromResults(results: any): string {
  const chunks: string[] = [];
  let updatingCumulativeHypothesis = false;
  const words = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result?.isFinal) continue;
    const transcript = String(result[0]?.transcript || '').trim().replace(/\s+/g, ' ');
    if (!transcript) continue;
    const previous = chunks.at(-1);
    if (!previous) { chunks.push(transcript); continue; }
    const previousWords = words(previous), currentWords = words(transcript);
    if (previousWords.join(' ') === currentWords.join(' ')) continue;
    const startsWithPrevious = previousWords.every((word, index) => currentWords[index] === word);
    const startsWithCurrent = currentWords.every((word, index) => previousWords[index] === word);
    if (startsWithPrevious) {
      chunks[chunks.length - 1] = transcript;
      updatingCumulativeHypothesis = true;
      continue;
    }
    if (startsWithCurrent) continue;
    const commonPrefix = previousWords.findIndex((word, index) => currentWords[index] !== word);
    const sharedWords = commonPrefix < 0 ? Math.min(previousWords.length, currentWords.length) : commonPrefix;
    const previousEndsSentence = /[.!?…]["')\]]*\s*$/.test(previous);
    if (updatingCumulativeHypothesis && sharedWords > 0 && !previousEndsSentence) {
      chunks[chunks.length - 1] = transcript;
      updatingCumulativeHypothesis = true;
      continue;
    }
    chunks.push(transcript);
    updatingCumulativeHypothesis = false;
  }
  return chunks.join(' ');
}
