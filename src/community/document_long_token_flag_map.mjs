export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const localeInput = payload.locale;
  const sectionsInput = payload.sections;
  if (typeof localeInput !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = localeInput.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(sectionsInput) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (sectionsInput.length < 1 || sectionsInput.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  for (const section of sectionsInput) {
    if (section === null || typeof section !== "object" || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingValue = section.heading;
    const textValue = section.text;
    if (typeof headingValue !== "string" || typeof textValue !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingValue.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingValue.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + headingValue.length + textValue.length;
  }
  if (totalSize > 180000) {
    throw new RangeError("DOCUMENT_TOO_LARGE");
  }
  const entries = [];
  let runningIndex = 0;
  let trueCount = 0;
  let longestOverall = 0;
  for (const section of sectionsInput) {
    const h = section.heading.trim();
    const t = section.text;
    let current = 0;
    let best = 0;
    for (const ch of h) {
      if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
        current = 0;
      } else {
        current = current + 1;
        if (current > best) {
          best = current;
        }
      }
    }
    current = 0;
    for (const ch of t) {
      if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
        current = 0;
      } else {
        current = current + 1;
        if (current > best) {
          best = current;
        }
      }
    }
    let flag = false;
    if (best >= 30) {
      flag = true;
    }
    if (flag === true) {
      trueCount = trueCount + 1;
    }
    if (best > longestOverall) {
      longestOverall = best;
    }
    const entry = { hasLongToken: flag, index: runningIndex, maxTokenLength: best };
    entries.push(entry);
    runningIndex = runningIndex + 1;
  }
  return { entries: entries, locale: normalizedLocale, longTokenSectionCount: trueCount, longestTokenLength: longestOverall };
}
