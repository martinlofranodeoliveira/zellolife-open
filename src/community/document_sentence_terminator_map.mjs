export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
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
  const sectionCount = sectionsInput.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalLength = 0;
  for (const section of sectionsInput) {
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
    totalLength += heading.length + text.length;
    if (totalLength > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const counts = [];
  let totalPeriodCount = 0;
  let totalExclamationCount = 0;
  let totalQuestionCount = 0;
  let totalTerminatorCount = 0;
  let index = 0;
  for (const section of sectionsInput) {
    const heading = section.heading;
    const text = section.text;
    const h = heading.trim();
    let periodCount = 0;
    let exclamationCount = 0;
    let questionCount = 0;
    for (const ch of h) {
      if (ch === ".") {
        periodCount += 1;
      }
      if (ch === "!") {
        exclamationCount += 1;
      }
      if (ch === "?") {
        questionCount += 1;
      }
    }
    for (const ch of text) {
      if (ch === ".") {
        periodCount += 1;
      }
      if (ch === "!") {
        exclamationCount += 1;
      }
      if (ch === "?") {
        questionCount += 1;
      }
    }
    const terminatorCount = periodCount + exclamationCount + questionCount;
    totalPeriodCount += periodCount;
    totalExclamationCount += exclamationCount;
    totalQuestionCount += questionCount;
    totalTerminatorCount += terminatorCount;
    const entry = { index: index, periodCount: periodCount, exclamationCount: exclamationCount, questionCount: questionCount, terminatorCount: terminatorCount };
    counts.push(entry);
    index += 1;
  }
  return { locale: normalizedLocale, counts: counts, totalPeriodCount: totalPeriodCount, totalExclamationCount: totalExclamationCount, totalQuestionCount: totalQuestionCount, totalTerminatorCount: totalTerminatorCount };
}
