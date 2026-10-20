export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const inputLocale = payload.locale;
  const inputSections = payload.sections;
  if (typeof inputLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalized = inputLocale.trim().toLowerCase();
  if (normalized !== "pt-br" && normalized !== "en-us" && normalized !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(inputSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const count = inputSections.length;
  if (count < 1 || count > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let total = 0;
  const outline = [];
  let current = 0;
  for (const section of inputSections) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
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
    if (heading.trim().length < 1) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    total = total + heading.length + text.length;
    if (total > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const clean = heading.trim();
    const size = text.length;
    const entryIndex = current;
    current = current + 1;
    outline.push({ index: entryIndex, heading: clean, textLength: size });
  }
  return { locale: normalized, outline: outline };
}
