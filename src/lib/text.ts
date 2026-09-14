/** A one-paragraph summary of a piece: collapse whitespace, cut at `max`, then
 *  back up to the last word boundary so the summary never ends mid-word.
 *  Shared by the index and the feed so the two cannot describe the same piece
 *  differently. */
export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max).replace(/\s\S*$/, '') + '…'
}
