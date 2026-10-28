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
  let cumulative = 0;
  let totalBlockCount = 0;
  const mapped = [];
  let idx = 0;
  for (const section of rawSections) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + heading.length + text.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    let blockCount = 0;
    let inBlock = false;
    let lineHasContent = false;
    for (const ch of text) {
      if (ch === "\n") {
        if (lineHasContent) {
          if (inBlock === false) {
            blockCount = blockCount + 1;
            inBlock = true;
          }
        } else {
          inBlock = false;
        }
        lineHasContent = false;
      } else {
        lineHasContent = true;
      }
    }
    if (lineHasContent) {
      if (inBlock === false) {
        blockCount = blockCount + 1;
      }
    }
    totalBlockCount = totalBlockCount + blockCount;
    const entry = { index: idx, blockCount: blockCount };
    mapped.push(entry);
    idx = idx + 1;
  }
  return { locale: normalizedLocale, sectionCount: sectionCount, totalBlockCount: totalBlockCount, sections: mapped };
}
