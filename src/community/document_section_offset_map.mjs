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
  const totalSections = sectionsInput.length;
  if (totalSections < 1 || totalSections > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulativeSize = 0;
  for (const section of sectionsInput) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingInput = section.heading;
    const textInput = section.text;
    if (typeof headingInput !== "string" || typeof textInput !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingInput.trim().length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingInput.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulativeSize = cumulativeSize + headingInput.length + textInput.length;
    if (cumulativeSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const boundaries = [];
  let nextStart = 0;
  let nextIndex = 0;
  for (const section of sectionsInput) {
    const rawHeading = section.heading;
    const rawText = section.text;
    const cleanHeading = rawHeading.trim();
    const sectionLength = cleanHeading.length + 1 + rawText.length;
    const entry = { index: nextIndex, start: nextStart, length: sectionLength };
    boundaries.push(entry);
    nextStart = nextStart + sectionLength + 2;
    nextIndex = nextIndex + 1;
  }
  let sumLengths = 0;
  for (const item of boundaries) {
    sumLengths = sumLengths + item.length;
  }
  const separatorCount = boundaries.length - 1;
  const totalLength = sumLengths + separatorCount * 2;
  return { locale: normalizedLocale, totalLength: totalLength, boundaries: boundaries };
}
