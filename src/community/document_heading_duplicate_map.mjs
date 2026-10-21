export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const localeValue = payload.locale;
  if (typeof localeValue !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const locale = localeValue.trim().toLowerCase();
  if (locale !== "pt-br" && locale !== "en-us" && locale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const sections = payload.sections;
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const totalSections = sections.length;
  if (totalSections < 1 || totalSections > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let total = 0;
  for (const section of sections) {
    if (typeof section !== "object" || section === null || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200 || heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    total = total + heading.length + text.length;
  }
  if (total > 180000) {
    throw new RangeError("DOCUMENT_TOO_LARGE");
  }
  const seen = new Map();
  const duplicates = [];
  for (const section of sections) {
    const trimmedHeading = section.heading.trim();
    const index = duplicates.length;
    const existing = seen.get(trimmedHeading);
    if (existing === undefined) {
      seen.set(trimmedHeading, index);
      duplicates.push({ firstIndex: index, index: index, isDuplicate: false });
    } else {
      duplicates.push({ firstIndex: existing, index: index, isDuplicate: true });
    }
  }
  return { duplicates: duplicates, locale: locale, uniqueCount: seen.size };
}
