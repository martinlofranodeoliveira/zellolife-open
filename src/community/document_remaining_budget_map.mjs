export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const sectionsInput = payload.sections;
  if (Array.isArray(sectionsInput) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const inputLength = sectionsInput.length;
  if (inputLength < 1 || inputLength > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const outSections = [];
  let cumulative = 0;
  let idx = 0;
  for (const section of sectionsInput) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const sectionChars = heading.length + text.length;
    cumulative = cumulative + sectionChars;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const remaining = 180000 - cumulative;
    outSections.push({ index: idx, sectionChars: sectionChars, cumulativeChars: cumulative, remainingChars: remaining });
    idx = idx + 1;
  }
  const totalChars = cumulative;
  const totalRemaining = 180000 - totalChars;
  return { locale: normalizedLocale, sectionCount: inputLength, totalChars: totalChars, remainingChars: totalRemaining, sections: outSections };
}
