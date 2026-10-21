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
  const sections = payload.sections;
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = sections.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const breaks = [];
  let totalChars = 0;
  let totalLineBreaks = 0;
  let index = 0;
  for (const section of sections) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
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
    totalChars = totalChars + heading.length + text.length;
    if (totalChars > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    let lineBreaks = 0;
    for (const ch of text) {
      if (ch === "\n") {
        lineBreaks = lineBreaks + 1;
      }
    }
    totalLineBreaks = totalLineBreaks + lineBreaks;
    breaks.push({ index: index, lineBreaks: lineBreaks });
    index = index + 1;
  }
  return { locale: normalizedLocale, breaks: breaks, totalLineBreaks: totalLineBreaks };
}
