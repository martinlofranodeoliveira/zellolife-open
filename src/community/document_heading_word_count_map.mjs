export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) === true) {
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
  if (sections.length < 1 || sections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulative = 0;
  for (const section of sections) {
    if (section === null || typeof section !== "object" || Array.isArray(section) === true) {
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
  }
  const entries = [];
  let currentIndex = 0;
  let totalHeadingWords = 0;
  for (const section of sections) {
    const heading = section.heading;
    const h = heading.trim();
    let count = 0;
    let inSeparator = true;
    for (const ch of h) {
      const isSeparator = ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
      if (isSeparator === false) {
        if (inSeparator === true) {
          count = count + 1;
        }
        inSeparator = false;
      } else {
        inSeparator = true;
      }
    }
    entries.push({ index: currentIndex, headingWordCount: count });
    totalHeadingWords = totalHeadingWords + count;
    currentIndex = currentIndex + 1;
  }
  return { locale: normalizedLocale, entries: entries, totalHeadingWords: totalHeadingWords };
}
