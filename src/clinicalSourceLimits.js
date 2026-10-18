// Shared input limits for this standalone document-processing toolkit.
export const MAX_CLINICAL_SOURCE_TEXT_CHARS = 180_000;
export const MAX_CLINICAL_SOURCE_SEGMENTS = 5_000;
export const MAX_SYNCHRONOUS_CLINICAL_SOURCE_TEXT_CHARS = 15_000;
export const MAX_SYNCHRONOUS_CLINICAL_SOURCE_SEGMENTS = 500;

const MEBIBYTE = 1024 * 1024;
const MAX_INFERENCE_BODY_BYTES = 4 * MEBIBYTE;
const INFERENCE_JSON_OVERHEAD_BYTES = 16 * 1024;
const CLINICAL_CONTINUATION_JSON_OVERHEAD_BYTES = 2 * MEBIBYTE;

function runtimeBodyLimit(overheadBytes) {
  return Math.min(
    MAX_INFERENCE_BODY_BYTES,
    (MAX_CLINICAL_SOURCE_TEXT_CHARS * 4) + overheadBytes,
  );
}

export const CLINICAL_REQUEST_BODY_LIMIT_BYTES = runtimeBodyLimit(
  INFERENCE_JSON_OVERHEAD_BYTES,
);
export const CLINICAL_CONTINUATION_BODY_LIMIT_BYTES = runtimeBodyLimit(
  CLINICAL_CONTINUATION_JSON_OVERHEAD_BYTES,
);

export function clinicalSourceTextLength(source) {
  if (source?.provenance === 'transcript_only') {
    return String(source.text || '').length;
  }
  if (!Array.isArray(source?.segments)) return 0;
  return source.segments.reduce(
    (total, segment) => total + String(segment?.text || '').length,
    0,
  );
}

export function clinicalSourceText(source) {
  if (source?.provenance === 'transcript_only') return String(source.text || '');
  if (!Array.isArray(source?.segments)) return '';
  return source.segments.map((segment) => String(segment?.text || '')).join('');
}

export function serializedJsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}
