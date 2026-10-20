import { validateDocument } from './document.js';

/**
 * Render a validated synthetic document as plain text.
 *
 * Uses the same validation, size limits and locale normalization as
 * `validateDocument`/`renderDocument`. Each section is rendered as the
 * trimmed heading, one LF, then the original text verbatim. Sections are
 * joined with two LFs. Markup is never interpreted, no findings are
 * inferred, the input is never mutated, and nothing is written or sent.
 *
 * @param {unknown} input document with locale and sections
 * @returns {{ locale: string, text: string }} normalized locale and plain text
 */
export function renderPlainTextDocument(input) {
  const document = validateDocument(input);
  const text = document.sections
    .map(({ heading, text: sectionText }) => `${heading}
${sectionText}`)
    .join('\n\n');
  return { locale: document.locale, text };
}
