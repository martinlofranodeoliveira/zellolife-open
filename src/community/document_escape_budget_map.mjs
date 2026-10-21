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
  const sections = payload.sections;
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (sections.length < 1 || sections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulative = 0;
  for (const section of sections) {
    if (typeof section !== "object" || section === null || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof section.heading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof section.text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (section.heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (section.heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + section.heading.length + section.text.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const budgets = [];
  let totalEscapeCount = 0;
  let totalEscapedExtraChars = 0;
  let nextIndex = 0;
  for (const section of sections) {
    const h = section.heading.trim();
    let escapeCount = 0;
    let escapedExtraChars = 0;
    for (const ch of h) {
      if (ch === "&") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 4;
      } else if (ch === "<") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 3;
      } else if (ch === ">") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 3;
      } else if (ch === "\"") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 5;
      } else if (ch === "'") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 4;
      }
    }
    for (const ch of section.text) {
      if (ch === "&") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 4;
      } else if (ch === "<") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 3;
      } else if (ch === ">") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 3;
      } else if (ch === "\"") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 5;
      } else if (ch === "'") {
        escapeCount = escapeCount + 1;
        escapedExtraChars = escapedExtraChars + 4;
      }
    }
    budgets.push({ index: nextIndex, escapeCount: escapeCount, escapedExtraChars: escapedExtraChars });
    totalEscapeCount = totalEscapeCount + escapeCount;
    totalEscapedExtraChars = totalEscapedExtraChars + escapedExtraChars;
    nextIndex = nextIndex + 1;
  }
  return { locale: normalizedLocale, budgets: budgets, totalEscapeCount: totalEscapeCount, totalEscapedExtraChars: totalEscapedExtraChars };
}
