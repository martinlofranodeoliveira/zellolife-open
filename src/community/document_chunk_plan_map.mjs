export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  let resolvedMax = 4000;
  if (payload.maxCharacters !== undefined) {
    const candidate = payload.maxCharacters;
    if (typeof candidate !== "number" || Number.isInteger(candidate) === false || candidate < 256 || candidate > 16384) {
      throw new RangeError("DOCUMENT_CHUNK_SIZE_INVALID");
    }
    resolvedMax = candidate;
  }
  const rawLocale = payload.locale;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const sections = payload.sections;
  if (Array.isArray(sections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = sections.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalUnits = 0;
  for (const section of sections) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "" || heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalUnits = totalUnits + heading.length + text.length;
    if (totalUnits > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  let plainText = "";
  let firstSeen = true;
  for (const section of sections) {
    const heading = section.heading;
    const text = section.text;
    const trimmedHeading = heading.trim();
    const piece = trimmedHeading + "\n" + text;
    if (firstSeen === true) {
      plainText = piece;
      firstSeen = false;
    } else {
      plainText = plainText + "\n\n" + piece;
    }
  }
  const totalLength = plainText.length;
  const chunkLengths = [];
  let currentLength = 0;
  for (const ch of plainText) {
    const charSize = ch.length;
    if (currentLength + charSize > resolvedMax) {
      chunkLengths.push(currentLength);
      currentLength = 0;
    }
    currentLength = currentLength + charSize;
  }
  chunkLengths.push(currentLength);
  const chunkCount = chunkLengths.length;
  return {
    locale: normalizedLocale,
    maxCharacters: resolvedMax,
    totalLength: totalLength,
    chunkCount: chunkCount,
    chunkLengths: chunkLengths
  };
}
