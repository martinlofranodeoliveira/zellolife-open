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
  if (sectionsInput.length < 1 || sectionsInput.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let total = 0;
  for (const section of sectionsInput) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    total = total + heading.length + text.length;
    if (total > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const entries = [];
  let index = 0;
  let shortCount = 0;
  let mediumCount = 0;
  let largeCount = 0;
  for (const section of sectionsInput) {
    const textValue = section.text;
    const textLength = textValue.length;
    let tier = "large";
    if (textLength < 500) {
      tier = "short";
    } else {
      if (textLength < 2000) {
        tier = "medium";
      }
    }
    if (tier === "short") {
      shortCount = shortCount + 1;
    } else {
      if (tier === "medium") {
        mediumCount = mediumCount + 1;
      } else {
        largeCount = largeCount + 1;
      }
    }
    entries.push({ index: index, textLength: textLength, tier: tier });
    index = index + 1;
  }
  const tierCounts = { short: shortCount, medium: mediumCount, large: largeCount };
  return { locale: normalizedLocale, entries: entries, tierCounts: tierCounts };
}
