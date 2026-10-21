export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
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
  const rawSections = payload.sections;
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionsLength = rawSections.length;
  if (sectionsLength < 1 || sectionsLength > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulativeTotal = 0;
  for (const section of rawSections) {
    if (typeof section !== "object" || section === null || Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const rawHeading = section.heading;
    const rawText = section.text;
    if (typeof rawHeading !== "string" || typeof rawText !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulativeTotal = cumulativeTotal + rawHeading.length + rawText.length;
    if (cumulativeTotal > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const counts = [];
  let totalHeadingDigitsValue = 0;
  let totalTextDigitsValue = 0;
  let totalDigitsValue = 0;
  let indexCounter = 0;
  for (const section of rawSections) {
    const h = section.heading.trim();
    const t = section.text;
    let headingDigitCount = 0;
    for (const ch of h) {
      if (ch === "0" || ch === "1" || ch === "2" || ch === "3" || ch === "4" || ch === "5" || ch === "6" || ch === "7" || ch === "8" || ch === "9") {
        headingDigitCount = headingDigitCount + 1;
      }
    }
    let textDigitCount = 0;
    for (const ch of t) {
      if (ch === "0" || ch === "1" || ch === "2" || ch === "3" || ch === "4" || ch === "5" || ch === "6" || ch === "7" || ch === "8" || ch === "9") {
        textDigitCount = textDigitCount + 1;
      }
    }
    const digitCount = headingDigitCount + textDigitCount;
    totalHeadingDigitsValue = totalHeadingDigitsValue + headingDigitCount;
    totalTextDigitsValue = totalTextDigitsValue + textDigitCount;
    totalDigitsValue = totalDigitsValue + digitCount;
    counts.push({
      index: indexCounter,
      headingDigitCount: headingDigitCount,
      textDigitCount: textDigitCount,
      digitCount: digitCount
    });
    indexCounter = indexCounter + 1;
  }
  return {
    locale: normalizedLocale,
    counts: counts,
    totalHeadingDigits: totalHeadingDigitsValue,
    totalTextDigits: totalTextDigitsValue,
    totalDigits: totalDigitsValue
  };
}
