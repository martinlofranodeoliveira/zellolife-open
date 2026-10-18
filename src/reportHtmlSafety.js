import sanitizeHtml from 'sanitize-html';

export const REPORT_ALLOWED_TAGS = Object.freeze([
  'h1', 'h2', 'h3', 'h4', 'p', 'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote', 'ul', 'ol', 'li', 'br', 'hr', 'table', 'thead', 'tbody',
  'tr', 'th', 'td', 'code', 'pre', 'span', 'div',
]);

const REPORT_ALLOWED_ATTRIBUTES = Object.freeze({
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
});

/**
 * Report HTML is active content until proven otherwise. Keep only the small
 * formatting vocabulary supported by the editor and remove every executable,
 * remote-loading, form, URL, style, class, data and event-handler attribute.
 */
export function sanitizeReportHtml(value) {
  return sanitizeHtml(String(value ?? ''), {
    allowedTags: [...REPORT_ALLOWED_TAGS],
    allowedAttributes: REPORT_ALLOWED_ATTRIBUTES,
    allowedSchemes: [],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
    nonTextTags: [
      'script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed',
      'noframes', 'noscript', 'plaintext', 'template', 'svg', 'math',
    ],
    parser: {
      lowerCaseAttributeNames: true,
      lowerCaseTags: true,
    },
  });
}
