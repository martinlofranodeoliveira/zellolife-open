export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const rawSections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const locale = rawLocale.trim().toLowerCase();
  if (locale !== "pt-br" && locale !== "en-us" && locale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length < 1 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const counts = [];
  let totalTabCount = 0;
  let totalHeadingTabCount = 0;
  let totalTextTabCount = 0;
  let tabSectionCount = 0;
  let cumulative = 0;
  let index = 0;
  for (const section of rawSections) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "" || heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + heading.length + text.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const h = heading.trim();
    const t = text;
    let headingTabCount = 0;
    for (const ch of h) {
      if (ch === "\t") {
        headingTabCount = headingTabCount + 1;
      }
    }
    let textTabCount = 0;
    for (const ch of t) {
      if (ch === "\t") {
        textTabCount = textTabCount + 1;
      }
    }
    const tabCount = headingTabCount + textTabCount;
    totalHeadingTabCount = totalHeadingTabCount + headingTabCount;
    totalTextTabCount = totalTextTabCount + textTabCount;
    totalTabCount = totalTabCount + tabCount;
    if (tabCount > 0) {
      tabSectionCount = tabSectionCount + 1;
    }
    const entry = { index: index, headingTabCount: headingTabCount, textTabCount: textTabCount, tabCount: tabCount };
    counts.push(entry);
    index = index + 1;
  }
  return { locale: locale, counts: counts, totalTabCount: totalTabCount, totalHeadingTabCount: totalHeadingTabCount, totalTextTabCount: totalTextTabCount, tabSectionCount: tabSectionCount };
}
