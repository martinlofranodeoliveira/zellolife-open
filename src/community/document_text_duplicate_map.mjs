export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const rawSections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const sectionCount = rawSections.length;
  if (sectionCount < 1 || sectionCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  for (const section of rawSections) {
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const heading = section.heading;
    const text = section.text;
    if (typeof heading !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + heading.length + text.length;
  }
  if (totalSize > 180000) {
    throw new RangeError("DOCUMENT_TOO_LARGE");
  }
  const counts = new Map();
  for (const section of rawSections) {
    const t = section.text;
    const current = counts.get(t);
    if (current === undefined) {
      counts.set(t, 1);
    } else {
      counts.set(t, current + 1);
    }
  }
  const entries = [];
  const seenGroups = new Map();
  let currentIndex = 0;
  let dupSections = 0;
  let groupCount = 0;
  for (const section of rawSections) {
    const t = section.text;
    const duplicateCount = counts.get(t);
    let isDup = false;
    if (duplicateCount > 1) {
      isDup = true;
    }
    if (isDup === true) {
      dupSections = dupSections + 1;
    }
    const already = seenGroups.get(t);
    if (already === undefined) {
      seenGroups.set(t, true);
      if (isDup === true) {
        groupCount = groupCount + 1;
      }
    }
    const entry = { duplicateCount: duplicateCount, index: currentIndex, isDuplicate: isDup };
    entries.push(entry);
    currentIndex = currentIndex + 1;
  }
  return { duplicateGroupCount: groupCount, duplicateSectionCount: dupSections, entries: entries, locale: normalizedLocale };
}
