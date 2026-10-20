import { validateDocument } from './document.js';

/**
 * Summarize validated document metadata without exposing content.
 *
 * Uses the same validation, size limits and locale normalization as
 * `validateDocument`/`renderDocument`. Returns only `{ locale, sectionCount,
 * characterCount }` where `locale` is the normalized locale, `sectionCount`
 * is the number of validated sections, and `characterCount` is the sum of
 * `heading.trim().length + text.length` over all validated sections in
 * UTF-16 units (`String.length`). The locale and presentation separators
 * are never counted. Markup, line breaks and text count literally, without
 * rendering, escaping or inference.
 *
 * Limits are enforced on the original sizes before trim by `validateDocument`:
 * 1 to 100 sections, non-empty original heading up to 200 UTF-16 units,
 * original heading+text sum up to 180000. The input is never mutated,
 * titles/texts/identifiers/unknown fields are never copied, and no network,
 * filesystem, database or global state is used.
 *
 * @param {unknown} input document with locale and sections
 * @returns {{ locale: string, sectionCount: number, characterCount: number }} metadata only
 */
export function summarizeDocumentMetadata(input) {
  const document = validateDocument(input);
  let characterCount = 0;
  for (const section of document.sections) {
    characterCount += section.heading.length + section.text.length;
  }
  return {
    locale: document.locale,
    sectionCount: document.sections.length,
    characterCount,
  };
}
