export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
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
  const rawSections = payload.sections;
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length < 1 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const entries = [];
  let cumulative = 0;
  let totalLoad = 0;
  let heaviestIndex = 0;
  let heaviestLoad = -1;
  let currentIndex = 0;
  for (const section of rawSections) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const rawHeading = section.heading;
    const rawText = section.text;
    if (typeof rawHeading !== "string" || typeof rawText !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.trim().length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + rawHeading.length + rawText.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const h = rawHeading.trim();
    const sectionLoad = h.length + rawText.length;
    entries.push({ index: currentIndex, sectionLoad: sectionLoad });
    totalLoad = totalLoad + sectionLoad;
    if (sectionLoad > heaviestLoad) {
      heaviestLoad = sectionLoad;
      heaviestIndex = currentIndex;
    }
    currentIndex = currentIndex + 1;
  }
  return { locale: normalizedLocale, entries: entries, totalLoad: totalLoad, heaviestIndex: heaviestIndex };
}
