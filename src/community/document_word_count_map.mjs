export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const sections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const locale = rawLocale.trim().toLowerCase();
  if (locale !== "pt-br" && locale !== "en-us" && locale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = sections.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const counts = [];
  let totalHeadingWords = 0;
  let totalTextWords = 0;
  let totalWords = 0;
  let totalSize = 0;
  let index = 0;
  for (const section of sections) {
    if (typeof section !== "object" || section === null || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const h = heading.trim();
    if (h === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + heading.length + text.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    let headingWordCount = 0;
    let headingInWord = false;
    for (const ch of h) {
      if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
        headingInWord = false;
      } else {
        if (headingInWord === false) {
          headingWordCount = headingWordCount + 1;
          headingInWord = true;
        }
      }
    }
    let textWordCount = 0;
    let textInWord = false;
    for (const ch of text) {
      if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
        textInWord = false;
      } else {
        if (textInWord === false) {
          textWordCount = textWordCount + 1;
          textInWord = true;
        }
      }
    }
    const wordCount = headingWordCount + textWordCount;
    totalHeadingWords = totalHeadingWords + headingWordCount;
    totalTextWords = totalTextWords + textWordCount;
    totalWords = totalWords + wordCount;
    const entry = { index: index, headingWordCount: headingWordCount, textWordCount: textWordCount, wordCount: wordCount };
    counts.push(entry);
    index = index + 1;
  }
  if (totalSize > 180000) {
    throw new RangeError("DOCUMENT_TOO_LARGE");
  }
  return { locale: locale, counts: counts, totalHeadingWords: totalHeadingWords, totalTextWords: totalTextWords, totalWords: totalWords };
}
