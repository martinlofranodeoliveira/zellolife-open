export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const localeInput = payload.locale;
  const sectionsInput = payload.sections;
  if (typeof localeInput !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const locale = localeInput.trim().toLowerCase();
  if (locale !== "pt-br" && locale !== "en-us" && locale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(sectionsInput) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = sectionsInput.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const trims = [];
  let totalHeadingTrimDelta = 0;
  let totalTextEdgeTrimDelta = 0;
  let cumulative = 0;
  let index = 0;
  for (const section of sectionsInput) {
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
    const trimmedHeading = heading.trim();
    if (trimmedHeading.length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + heading.length + text.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const trimmedText = text.trim();
    const headingTrimmedLength = trimmedHeading.length;
    const headingTrimDelta = heading.length - trimmedHeading.length;
    const textLength = text.length;
    const textEdgeTrimDelta = text.length - trimmedText.length;
    totalHeadingTrimDelta = totalHeadingTrimDelta + headingTrimDelta;
    totalTextEdgeTrimDelta = totalTextEdgeTrimDelta + textEdgeTrimDelta;
    trims.push({
      headingTrimDelta: headingTrimDelta,
      headingTrimmedLength: headingTrimmedLength,
      index: index,
      textEdgeTrimDelta: textEdgeTrimDelta,
      textLength: textLength
    });
    index = index + 1;
  }
  return {
    locale: locale,
    totalHeadingTrimDelta: totalHeadingTrimDelta,
    totalTextEdgeTrimDelta: totalTextEdgeTrimDelta,
    trims: trims
  };
}
