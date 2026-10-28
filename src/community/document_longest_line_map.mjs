export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const localeRaw = payload.locale;
  const sectionsRaw = payload.sections;
  if (typeof localeRaw !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = localeRaw.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(sectionsRaw) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = sectionsRaw.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  let longestOverall = 0;
  const lines = [];
  let currentIndex = 0;
  for (const section of sectionsRaw) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingRaw = section.heading;
    const textRaw = section.text;
    if (typeof headingRaw !== "string" || typeof textRaw !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingRaw.trim() === "" || headingRaw.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + headingRaw.length + textRaw.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const trimmedHeading = headingRaw.trim();
    const block = trimmedHeading + "\n" + textRaw;
    const rawLines = block.split("\n");
    const lineCount = rawLines.length;
    let longestLine = 0;
    for (const rawLine of rawLines) {
      let effectiveLine = rawLine;
      if (rawLine.endsWith("\r")) {
        effectiveLine = rawLine.slice(0, rawLine.length - 1);
      }
      const currentLength = effectiveLine.length;
      if (currentLength > longestLine) {
        longestLine = currentLength;
      }
    }
    if (longestLine > longestOverall) {
      longestOverall = longestLine;
    }
    const entry = { index: currentIndex, longestLine: longestLine, lineCount: lineCount };
    lines.push(entry);
    currentIndex = currentIndex + 1;
  }
  const result = { locale: normalizedLocale, sectionCount: sectionCount, longestOverall: longestOverall, lines: lines };
  return result;
}
