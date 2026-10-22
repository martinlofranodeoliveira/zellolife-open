export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalized = rawLocale.trim().toLowerCase();
  if (normalized !== "pt-br" && normalized !== "en-us" && normalized !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const sections = payload.sections;
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (sections.length < 1 || sections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  for (const section of sections) {
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
    totalSize = totalSize + heading.length + text.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const entries = [];
  let currentIndex = 0;
  let parenthesisSectionCount = 0;
  let totalOpenCount = 0;
  let totalCloseCount = 0;
  let unbalancedSectionCount = 0;
  for (const section of sections) {
    const heading = section.heading;
    const text = section.text;
    const h = heading.trim();
    const t = text;
    let openCount = 0;
    let closeCount = 0;
    for (const ch of h) {
      if (ch === "(") {
        openCount = openCount + 1;
      }
      if (ch === ")") {
        closeCount = closeCount + 1;
      }
    }
    for (const ch of t) {
      if (ch === "(") {
        openCount = openCount + 1;
      }
      if (ch === ")") {
        closeCount = closeCount + 1;
      }
    }
    const hasParenthesis = openCount + closeCount > 0;
    const isBalanced = openCount === closeCount;
    if (hasParenthesis === true) {
      parenthesisSectionCount = parenthesisSectionCount + 1;
    }
    totalOpenCount = totalOpenCount + openCount;
    totalCloseCount = totalCloseCount + closeCount;
    if (isBalanced === false) {
      unbalancedSectionCount = unbalancedSectionCount + 1;
    }
    const entry = {
      closeCount: closeCount,
      hasParenthesis: hasParenthesis,
      index: currentIndex,
      isBalanced: isBalanced,
      openCount: openCount
    };
    entries.push(entry);
    currentIndex = currentIndex + 1;
  }
  const result = {
    entries: entries,
    locale: normalized,
    parenthesisSectionCount: parenthesisSectionCount,
    totalCloseCount: totalCloseCount,
    totalOpenCount: totalOpenCount,
    unbalancedSectionCount: unbalancedSectionCount
  };
  return result;
}
