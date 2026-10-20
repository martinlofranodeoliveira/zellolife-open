import { renderPlainTextDocument } from './plainTextDocument.js';

/**
 * Chunk validated plain-text document without losing content or splitting Unicode pairs.
 *
 * Reuses `renderPlainTextDocument` for validation, locale normalization and exact
 * text. Partitions greedily into maximal prefixes of at most `maxCharacters`
 * UTF-16 code units, backing off exactly one unit only when the cut would split
 * an adjacent valid high-surrogate plus low-surrogate pair.
 *
 * @param {unknown} input document with locale and sections
 * @param {number} [maxCharacters=4000] chunk budget in UTF-16 code units
 * @returns {{ locale: string, chunks: string[] }} normalized locale and chunks
 */
export function chunkPlainTextDocument(input, maxCharacters = 4000) {
  if (
    typeof maxCharacters !== 'number' ||
    !Number.isInteger(maxCharacters) ||
    maxCharacters < 256 ||
    maxCharacters > 16384
  ) {
    throw new RangeError('DOCUMENT_CHUNK_SIZE_INVALID');
  }
  const { locale, text } = renderPlainTextDocument(input);
  const chunks = [];
  let start = 0;
  const total = text.length;
  while (start < total) {
    let end = Math.min(start + maxCharacters, total);
    if (end < total) {
      const prev = text.charCodeAt(end - 1);
      const next = text.charCodeAt(end);
      const isHigh = prev >= 0xd800 && prev <= 0xdbff;
      const isLow = next >= 0xdc00 && next <= 0xdfff;
      if (isHigh && isLow) {
        end -= 1;
      }
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return { locale, chunks };
}
