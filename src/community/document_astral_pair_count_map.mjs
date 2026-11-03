export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  const localeTable = new Map();
  localeTable.set("pt-br", "pt-br");
  localeTable.set("en-us", "en-us");
  localeTable.set("es", "es");
  const matchedLocale = localeTable.get(normalizedLocale);
  if (matchedLocale === undefined) {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const rawSections = payload.sections;
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length < 1 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const outSections = [];
  let cumulativeUnits = 0;
  let totalAstralPairs = 0;
  let sectionIndex = 0;
  for (const section of rawSections) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const rawHeading = section.heading;
    const rawText = section.text;
    if (typeof rawHeading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.trim().length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof rawText !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulativeUnits = cumulativeUnits + rawHeading.length + rawText.length;
    if (cumulativeUnits > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const h = rawHeading.trim();
    const t = rawText;
    let pairCount = 0;
    for (const pieceA of h) {
      if (pieceA.length === 2) {
        pairCount = pairCount + 1;
      }
    }
    for (const pieceB of t) {
      if (pieceB.length === 2) {
        pairCount = pairCount + 1;
      }
    }
    totalAstralPairs = totalAstralPairs + pairCount;
    outSections.push({ index: sectionIndex, astralPairCount: pairCount });
    sectionIndex = sectionIndex + 1;
  }
  return { locale: matchedLocale, totalAstralPairs: totalAstralPairs, sections: outSections };
}
