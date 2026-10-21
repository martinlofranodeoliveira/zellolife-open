export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const localeInput = payload.locale;
  const sectionsInput = payload.sections;
  if (typeof localeInput !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalized = localeInput.trim().toLowerCase();
  if (normalized !== "pt-br" && normalized !== "en-us" && normalized !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(sectionsInput) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const count = sectionsInput.length;
  if (count < 1 || count > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulative = 0;
  for (const section of sectionsInput) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const trimmed = heading.trim();
    if (trimmed.length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + heading.length + text.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  let lengths = [];
  let totalHeadingChars = 0;
  let index = 0;
  for (const section of sectionsInput) {
    const h = section.heading.trim();
    const headingLength = h.length;
    totalHeadingChars = totalHeadingChars + headingLength;
    lengths.push({ index: index, headingLength: headingLength });
    index = index + 1;
  }
  return { locale: normalized, lengths: lengths, totalHeadingChars: totalHeadingChars };
}
