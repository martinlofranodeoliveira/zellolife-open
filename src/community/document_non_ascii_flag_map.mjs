export function runFeature(payload) {
  const tilde = "~";
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const rawSections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const locale = rawLocale.trim().toLowerCase();
  if (locale !== "pt-br" && locale !== "en-us" && locale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionTotal = rawSections.length;
  if (sectionTotal < 1 || sectionTotal > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulative = 0;
  for (const section of rawSections) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
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
    if (heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + heading.length + text.length;
  }
  if (cumulative > 180000) {
    throw new RangeError("DOCUMENT_TOO_LARGE");
  }
  const flags = [];
  let index = 0;
  let headingNonAsciiCount = 0;
  let textNonAsciiCount = 0;
  let nonAsciiSectionCount = 0;
  for (const section of rawSections) {
    const h = section.heading.trim();
    const t = section.text;
    let headingHasNonAscii = false;
    for (const ch of h) {
      if (ch > tilde) {
        headingHasNonAscii = true;
        break;
      }
    }
    let textHasNonAscii = false;
    for (const ch of t) {
      if (ch > tilde) {
        textHasNonAscii = true;
        break;
      }
    }
    let hasNonAscii = false;
    if (headingHasNonAscii || textHasNonAscii) {
      hasNonAscii = true;
    }
    const entry = {
      hasNonAscii: hasNonAscii,
      headingHasNonAscii: headingHasNonAscii,
      index: index,
      textHasNonAscii: textHasNonAscii
    };
    flags.push(entry);
    if (headingHasNonAscii) {
      headingNonAsciiCount = headingNonAsciiCount + 1;
    }
    if (textHasNonAscii) {
      textNonAsciiCount = textNonAsciiCount + 1;
    }
    if (hasNonAscii) {
      nonAsciiSectionCount = nonAsciiSectionCount + 1;
    }
    index = index + 1;
  }
  return {
    flags: flags,
    headingNonAsciiCount: headingNonAsciiCount,
    locale: locale,
    nonAsciiSectionCount: nonAsciiSectionCount,
    textNonAsciiCount: textNonAsciiCount
  };
}
