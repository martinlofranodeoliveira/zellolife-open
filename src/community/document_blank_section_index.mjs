export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const rawSections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = rawSections.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const blankIndexes = [];
  let totalSize = 0;
  let currentIndex = 0;
  for (const section of rawSections) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim().length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + heading.length + text.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const isBlank = text.trim().length === 0;
    if (isBlank) {
      blankIndexes.push(currentIndex);
    }
    currentIndex = currentIndex + 1;
  }
  const blankCount = blankIndexes.length;
  return { locale: normalizedLocale, blankIndexes: blankIndexes, blankCount: blankCount };
}
