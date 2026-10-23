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
  let sectionTotal = 0;
  for (const sectionItem of sectionsInput) {
    sectionTotal = sectionTotal + 1;
  }
  if (sectionTotal < 1 || sectionTotal > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const entries = [];
  let totalSize = 0;
  let uppercaseSectionCount = 0;
  let totalUppercaseCount = 0;
  let currentIndex = 0;
  for (const section of sectionsInput) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
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
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const h = headingValue.trim();
    const t = textValue;
    let uppercaseCount = 0;
    for (const ch of h) {
      if (ch >= "A" && ch <= "Z") {
        uppercaseCount = uppercaseCount + 1;
      }
    }
    for (const ch of t) {
      if (ch >= "A" && ch <= "Z") {
        uppercaseCount = uppercaseCount + 1;
      }
    }
    let hasUppercase = false;
    if (uppercaseCount > 0) {
      hasUppercase = true;
    }
    if (hasUppercase === true) {
      uppercaseSectionCount = uppercaseSectionCount + 1;
    }
    totalUppercaseCount = totalUppercaseCount + uppercaseCount;
    entries.push({ index: currentIndex, uppercaseCount: uppercaseCount, hasUppercase: hasUppercase });
    currentIndex = currentIndex + 1;
  }
  return { locale: normalizedLocale, entries: entries, uppercaseSectionCount: uppercaseSectionCount, totalUppercaseCount: totalUppercaseCount };
}
