export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const localeInput = payload.locale;
  if (typeof localeInput !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedInput = localeInput.trim().toLowerCase();
  const localeMap = new Map();
  localeMap.set("pt-br", "pt-br");
  localeMap.set("en-us", "en-us");
  localeMap.set("es", "es");
  const mappedLocale = localeMap.get(normalizedInput);
  if (mappedLocale === undefined) {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const sectionsInput = payload.sections;
  if (Array.isArray(sectionsInput) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionsLen = sectionsInput.length;
  if (sectionsLen < 1 || sectionsLen > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  let echoTotal = 0;
  let currentIndex = 0;
  const flagged = [];
  for (const sec of sectionsInput) {
    if (typeof sec !== "object" || sec === null || Array.isArray(sec)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingInput = sec.heading;
    const textInput = sec.text;
    if (typeof headingInput !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof textInput !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingInput.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const trimmedHeading = headingInput.trim();
    if (trimmedHeading.length < 1) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + headingInput.length + textInput.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    let hasEcho = false;
    if (textInput.length > 0) {
      if (textInput.includes(trimmedHeading) === true) {
        hasEcho = true;
      }
    }
    if (hasEcho === true) {
      echoTotal = echoTotal + 1;
    }
    const entry = { index: currentIndex, hasEcho: hasEcho };
    flagged.push(entry);
    currentIndex = currentIndex + 1;
  }
  const result = { locale: mappedLocale, echoCount: echoTotal, sections: flagged };
  return result;
}
