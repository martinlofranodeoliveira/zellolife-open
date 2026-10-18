import { isClinicalLocale, normalizeClinicalLocale } from './clinicalLocale.js';
import { sanitizeReportHtml } from './reportHtmlSafety.js';
import { MAX_CLINICAL_SOURCE_TEXT_CHARS } from './clinicalSourceLimits.js';

const MAX_SECTIONS = 100;
const MAX_HEADING_CHARS = 200;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

/** Validate a local document without inventing or inferring clinical facts. */
export function validateDocument(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('DOCUMENT_OBJECT_REQUIRED');
  }
  if (!isClinicalLocale(input.locale)) throw new TypeError('DOCUMENT_LOCALE_INVALID');
  if (!Array.isArray(input.sections) || !input.sections.length || input.sections.length > MAX_SECTIONS) {
    throw new TypeError('DOCUMENT_SECTIONS_INVALID');
  }
  let length = 0;
  const sections = input.sections.map((section) => {
    if (!section || typeof section.heading !== 'string' || !section.heading.trim()
      || section.heading.length > MAX_HEADING_CHARS || typeof section.text !== 'string') {
      throw new TypeError('DOCUMENT_SECTION_INVALID');
    }
    length += section.heading.length + section.text.length;
    if (length > MAX_CLINICAL_SOURCE_TEXT_CHARS) throw new RangeError('DOCUMENT_TOO_LARGE');
    return { heading: section.heading.trim(), text: section.text };
  });
  return { locale: normalizeClinicalLocale(input.locale), sections };
}

/** Render only the supplied text. Markup inside headings/text is always escaped. */
export function renderDocument(input) {
  const document = validateDocument(input);
  const html = document.sections.map(({ heading, text }) => (
    `<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text).replace(/\r?\n/g, '<br />')}</p>`
  )).join('');
  return { locale: document.locale, html: sanitizeReportHtml(html) };
}
