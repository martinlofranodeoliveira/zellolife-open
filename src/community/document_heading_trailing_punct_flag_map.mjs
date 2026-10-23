export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const locale = rawLocale.trim().toLowerCase();
  if (locale !== "pt-br" && locale !== "en-us" && locale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const sections = payload.sections;
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = sections.length;
  if (sectionCount < 1 || sectionCount > 100) {
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
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const trimmed = heading.trim();
    if (trimmed === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    total = total + heading.length + text.length;
    if (total > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const entries = [];
  let trailingPunctSectionCount = 0;
  let index = 0;
  for (const section of sections) {
    const headingValue = section.heading;
    const h = headingValue.trim();
    let lastChar = "";
    for (const ch of h) {
      lastChar = ch;
    }
    let hasTrailingPunct = false;
    if (lastChar === "." || lastChar === "?" || lastChar === "!" || lastChar === ":" || lastChar === ";" || lastChar === ",") {
      hasTrailingPunct = true;
    }
    if (hasTrailingPunct === true) {
      trailingPunctSectionCount = trailingPunctSectionCount + 1;
    }
    const entry = { hasTrailingPunct: hasTrailingPunct, index: index };
    entries.push(entry);
    index = index + 1;
  }
  return { entries: entries, locale: locale, trailingPunctSectionCount: trailingPunctSectionCount };
}
