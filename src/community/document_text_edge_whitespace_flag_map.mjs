export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  if (typeof payload.locale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = payload.locale.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(payload.sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sections = payload.sections;
  if (sections.length < 1 || sections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalUnits = 0;
  for (const section of sections) {
    if (typeof section !== "object" || section === null || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof section.heading !== "string" || typeof section.text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (section.heading.trim().length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (section.heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalUnits = totalUnits + section.heading.length + section.text.length;
    if (totalUnits > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const entries = [];
  let leadingWhitespaceSectionCount = 0;
  let trailingWhitespaceSectionCount = 0;
  let edgeWhitespaceSectionCount = 0;
  let currentIndex = 0;
  for (const section of sections) {
    const t = section.text;
    let seenFirst = false;
    let firstChar = "";
    let lastChar = "";
    for (const ch of t) {
      if (seenFirst === false) {
        firstChar = ch;
        seenFirst = true;
      }
      lastChar = ch;
    }
    const hasLeadingWhitespace = t.length !== 0 && (firstChar === " " || firstChar === "\t" || firstChar === "\n" || firstChar === "\r");
    const hasTrailingWhitespace = t.length !== 0 && (lastChar === " " || lastChar === "\t" || lastChar === "\n" || lastChar === "\r");
    const hasEdgeWhitespace = hasLeadingWhitespace || hasTrailingWhitespace;
    entries.push({ index: currentIndex, hasLeadingWhitespace: hasLeadingWhitespace, hasTrailingWhitespace: hasTrailingWhitespace, hasEdgeWhitespace: hasEdgeWhitespace });
    if (hasLeadingWhitespace === true) {
      leadingWhitespaceSectionCount = leadingWhitespaceSectionCount + 1;
    }
    if (hasTrailingWhitespace === true) {
      trailingWhitespaceSectionCount = trailingWhitespaceSectionCount + 1;
    }
    if (hasEdgeWhitespace === true) {
      edgeWhitespaceSectionCount = edgeWhitespaceSectionCount + 1;
    }
    currentIndex = currentIndex + 1;
  }
  return { locale: normalizedLocale, entries: entries, leadingWhitespaceSectionCount: leadingWhitespaceSectionCount, trailingWhitespaceSectionCount: trailingWhitespaceSectionCount, edgeWhitespaceSectionCount: edgeWhitespaceSectionCount };
}
