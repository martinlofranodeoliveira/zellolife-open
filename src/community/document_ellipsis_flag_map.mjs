export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
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
  const sectionTotal = sectionsRaw.length;
  if (sectionTotal < 1 || sectionTotal > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  for (const section of sectionsRaw) {
    if (typeof section !== "object" || section === null || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingValue = section.heading;
    const textValue = section.text;
    if (typeof headingValue !== "string" || typeof textValue !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingValue.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const trimmedHeading = headingValue.trim();
    if (trimmedHeading === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + headingValue.length + textValue.length;
  }
  if (totalSize > 180000) {
    throw new RangeError("DOCUMENT_TOO_LARGE");
  }
  const entries = [];
  let currentIndex = 0;
  let ellipsisSectionCount = 0;
  let totalEllipsisCount = 0;
  for (const section of sectionsRaw) {
    const h = section.heading.trim();
    const t = section.text;
    let ellipsisCount = 0;
    let consecutivePeriods = 0;
    for (const ch of h) {
      if (ch === "…") {
        ellipsisCount = ellipsisCount + 1;
        consecutivePeriods = 0;
      } else {
        if (ch === ".") {
          consecutivePeriods = consecutivePeriods + 1;
          if (consecutivePeriods === 3) {
            ellipsisCount = ellipsisCount + 1;
            consecutivePeriods = 0;
          }
        } else {
          consecutivePeriods = 0;
        }
      }
    }
    consecutivePeriods = 0;
    for (const ch of t) {
      if (ch === "…") {
        ellipsisCount = ellipsisCount + 1;
        consecutivePeriods = 0;
      } else {
        if (ch === ".") {
          consecutivePeriods = consecutivePeriods + 1;
          if (consecutivePeriods === 3) {
            ellipsisCount = ellipsisCount + 1;
            consecutivePeriods = 0;
          }
        } else {
          consecutivePeriods = 0;
        }
      }
    }
    const hasEllipsis = ellipsisCount > 0;
    if (hasEllipsis === true) {
      ellipsisSectionCount = ellipsisSectionCount + 1;
    }
    totalEllipsisCount = totalEllipsisCount + ellipsisCount;
    const entry = { ellipsisCount: ellipsisCount, hasEllipsis: hasEllipsis, index: currentIndex };
    entries.push(entry);
    currentIndex = currentIndex + 1;
  }
  const result = { ellipsisSectionCount: ellipsisSectionCount, entries: entries, locale: normalizedLocale, totalEllipsisCount: totalEllipsisCount };
  return result;
}
