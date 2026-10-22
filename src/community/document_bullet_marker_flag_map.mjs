export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const rawSections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalized = rawLocale.trim().toLowerCase();
  if (normalized !== "pt-br" && normalized !== "en-us" && normalized !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length < 1 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let total = 0;
  for (const section of rawSections) {
    if (section === null || typeof section !== "object" || Array.isArray(section) === true) {
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
    total = total + heading.length + text.length;
    if (total > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const entries = [];
  let idx = 0;
  let bulletSectionCount = 0;
  let totalBulletLineCount = 0;
  for (const section of rawSections) {
    const h = section.heading.trim();
    const t = section.text;
    let bulletLineCount = 0;
    let atLineStart = true;
    let linePos = 0;
    let firstChar = "";
    for (const chH of h) {
      if (chH === "\n" || chH === "\r") {
        atLineStart = true;
        linePos = 0;
        firstChar = "";
      } else if (atLineStart === true && linePos === 0) {
        firstChar = chH;
        linePos = 1;
      } else if (atLineStart === true && linePos === 1) {
        if ((firstChar === "-" || firstChar === "*" || firstChar === "+") && chH === " ") {
          bulletLineCount = bulletLineCount + 1;
          atLineStart = false;
        } else {
          atLineStart = false;
        }
      } else {
      }
    }
    atLineStart = true;
    linePos = 0;
    firstChar = "";
    for (const chT of t) {
      if (chT === "\n" || chT === "\r") {
        atLineStart = true;
        linePos = 0;
        firstChar = "";
      } else if (atLineStart === true && linePos === 0) {
        firstChar = chT;
        linePos = 1;
      } else if (atLineStart === true && linePos === 1) {
        if ((firstChar === "-" || firstChar === "*" || firstChar === "+") && chT === " ") {
          bulletLineCount = bulletLineCount + 1;
          atLineStart = false;
        } else {
          atLineStart = false;
        }
      } else {
      }
    }
    const hasBullet = bulletLineCount > 0;
    if (hasBullet === true) {
      bulletSectionCount = bulletSectionCount + 1;
    }
    totalBulletLineCount = totalBulletLineCount + bulletLineCount;
    const entryIndex = idx;
    entries.push({ index: entryIndex, hasBullet: hasBullet, bulletLineCount: bulletLineCount });
    idx = idx + 1;
  }
  return { locale: normalized, entries: entries, bulletSectionCount: bulletSectionCount, totalBulletLineCount: totalBulletLineCount };
}
