export function runFeature(payload) {
  if (payload === null) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  if (typeof payload !== "object") {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  if (Array.isArray(payload) === true) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  let rawLocale;
  let rawSections;
  for (const entry of Object.entries(payload)) {
    if (entry[0] === "locale") {
      rawLocale = entry[1];
    }
    if (entry[0] === "sections") {
      rawSections = entry[1];
    }
  }
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  const localeMap = new Map();
  localeMap.set("pt-br", "pt-br");
  localeMap.set("en-us", "en-us");
  localeMap.set("es", "es");
  const mappedLocale = localeMap.get(normalizedLocale);
  if (mappedLocale !== normalizedLocale) {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length < 1) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let cumulative = 0;
  let total = 0;
  let currentIndex = 0;
  const sectionsOut = [];
  for (const section of Object.values(rawSections)) {
    if (section === null) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof section !== "object") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (Array.isArray(section) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    let headingRaw;
    let textRaw;
    for (const pair of Object.entries(section)) {
      if (pair[0] === "heading") {
        headingRaw = pair[1];
      }
      if (pair[0] === "text") {
        textRaw = pair[1];
      }
    }
    if (typeof headingRaw !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingRaw.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingRaw.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof textRaw !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    cumulative = cumulative + headingRaw.length + textRaw.length;
    if (cumulative > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
    const h = headingRaw.trim();
    const t = textRaw;
    let unitSum = 0;
    for (const c of h) {
      unitSum = unitSum + c.charCodeAt(0);
      if (c.length === 2) {
        unitSum = unitSum + c.charCodeAt(1);
      }
    }
    for (const d of t) {
      unitSum = unitSum + d.charCodeAt(0);
      if (d.length === 2) {
        unitSum = unitSum + d.charCodeAt(1);
      }
    }
    const checksum = unitSum % 65536;
    total = total + checksum;
    const outEntry = { index: currentIndex, checksum: checksum };
    sectionsOut.push(outEntry);
    currentIndex = currentIndex + 1;
  }
  const totalChecksum = total % 65536;
  return { locale: normalizedLocale, totalChecksum: totalChecksum, sections: sectionsOut };
}
