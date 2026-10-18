const MAX_MESSAGE_LENGTH = 8000;
const VALID_ROLES = new Set(['system', 'user', 'assistant']);

export function sanitizeMessages(messages, { maxLength = MAX_MESSAGE_LENGTH } = {}) {
  if (!Array.isArray(messages)) return [];
  const boundedMaxLength = Number.isInteger(maxLength) && maxLength > 0
    ? Math.min(maxLength, 16_000)
    : MAX_MESSAGE_LENGTH;
  return messages
    .map((m) => ({
      role: VALID_ROLES.has(m?.role) ? m.role : 'user',
      content: String(m?.content ?? '').slice(0, boundedMaxLength),
    }))
    .filter((m) => m.content);
}

export function clampNumber(value, { def = 1, min = 0, max = 2 } = {}) {
  const n = Number(value);
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return def;
}

export function clampInt(value, { def = 400, min = 1, max = 4000 } = {}) {
  const n = Math.floor(Number(value));
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return def;
}

export function requireFields(obj, fields) {
  const missing = fields.filter((f) => !(f in (obj || {})));
  if (missing.length) {
    const err = new Error('MISSING_FIELDS');
    err.details = missing;
    throw err;
  }
}

export function extractJSON(text) {
  if (!text) return null;
  let s = String(text);
  // strip code fences
  s = s.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {}
  }
  return null;
}
