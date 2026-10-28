export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
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
  const sectionCountValue = sectionsInput.length;
  if (sectionCountValue < 1 || sectionCountValue > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let headingTotalValue = 0;
  let textTotalValue = 0;
  let cumulativeValue = 0;
  for (const section of sectionsInput) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingInput = section.heading;
    const textInput = section.text;
    if (typeof headingInput !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingInput.trim().length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingInput.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof textInput !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulativeValue = cumulativeValue + headingInput.length + textInput.length;
    if (cumulativeValue > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const trimmedHeadingLength = headingInput.trim().length;
    headingTotalValue = headingTotalValue + trimmedHeadingLength;
    textTotalValue = textTotalValue + textInput.length;
  }
  const separatorTotalValue = 3 * sectionCountValue - 2;
  const totalLengthValue = headingTotalValue + textTotalValue + separatorTotalValue;
  return {
    headingTotal: headingTotalValue,
    locale: normalizedLocale,
    sectionCount: sectionCountValue,
    separatorTotal: separatorTotalValue,
    textTotal: textTotalValue,
    totalLength: totalLengthValue
  };
}
