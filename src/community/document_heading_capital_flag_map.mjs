export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
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
  if (rawSections.length < 1 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let total = 0;
  for (const section of rawSections) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    total = total + heading.length + text.length;
    if (total > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const flags = [];
  let index = 0;
  let capitalizedCount = 0;
  for (const section of rawSections) {
    const heading = section.heading;
    const h = heading.trim();
    let first = "";
    for (const ch of h) {
      first = ch;
      break;
    }
    const upper = first.toUpperCase();
    const lower = first.toLowerCase();
    let capitalized = false;
    if (upper !== lower && first === upper) {
      capitalized = true;
    }
    flags.push({ index: index, capitalized: capitalized });
    if (capitalized === true) {
      capitalizedCount = capitalizedCount + 1;
    }
    index = index + 1;
  }
  const nonCapitalizedCount = flags.length - capitalizedCount;
  return { locale: normalizedLocale, flags: flags, capitalizedCount: capitalizedCount, nonCapitalizedCount: nonCapitalizedCount };
}
