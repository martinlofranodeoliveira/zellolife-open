export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
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
  if (sectionsInput.length < 1 || sectionsInput.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulative = 0;
  let totalAtSignCount = 0;
  let atSignSectionCount = 0;
  const flags = [];
  let index = 0;
  for (const section of sectionsInput) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
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
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const h = heading.trim();
    const t = text;
    if (h === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + heading.length + text.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    let atSignCount = 0;
    for (const ch of h) {
      if (ch === "@") {
        atSignCount = atSignCount + 1;
      }
    }
    for (const ch of t) {
      if (ch === "@") {
        atSignCount = atSignCount + 1;
      }
    }
    let hasAtSign = false;
    if (atSignCount > 0) {
      hasAtSign = true;
    }
    totalAtSignCount = totalAtSignCount + atSignCount;
    if (hasAtSign === true) {
      atSignSectionCount = atSignSectionCount + 1;
    }
    const entry = { index: index, hasAtSign: hasAtSign, atSignCount: atSignCount };
    flags.push(entry);
    index = index + 1;
  }
  return { locale: normalized, flags: flags, totalAtSignCount: totalAtSignCount, atSignSectionCount: atSignSectionCount };
}
