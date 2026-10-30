export function runFeature(payload) {
  if (payload === null) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  if (typeof payload !== "object") {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  if (Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  if (normalizedLocale === "pt-br") {
  } else if (normalizedLocale === "en-us") {
  } else if (normalizedLocale === "es") {
  } else {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const rawSections = payload.sections;
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length < 1) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  if (rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  for (const section of rawSections) {
    if (section === null) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof section !== "object") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const headingValue = section.heading;
    const textValue = section.text;
    if (typeof headingValue !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof textValue !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (headingValue.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const trimmedHeading = headingValue.trim();
    if (trimmedHeading === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize = totalSize + headingValue.length + textValue.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const digitMap = new Map();
  digitMap.set("0", true);
  digitMap.set("1", true);
  digitMap.set("2", true);
  digitMap.set("3", true);
  digitMap.set("4", true);
  digitMap.set("5", true);
  digitMap.set("6", true);
  digitMap.set("7", true);
  digitMap.set("8", true);
  digitMap.set("9", true);
  const delimMap = new Map();
  delimMap.set(".", true);
  delimMap.set(")", true);
  const outSections = [];
  let numberedTotal = 0;
  let currentIndex = 0;
  for (const section of rawSections) {
    const h = section.heading.trim();
    let pos = 0;
    let digitCount = 0;
    let decided = false;
    let hasPrefix = false;
    for (const ch of h) {
      const digitHit = digitMap.get(ch);
      const delimHit = delimMap.get(ch);
      if (decided === false) {
        if (digitHit === true) {
          digitCount = digitCount + 1;
        } else if (digitCount > 0 && pos === digitCount && delimHit === true) {
          hasPrefix = true;
          decided = true;
        } else {
          hasPrefix = false;
          decided = true;
        }
      }
      pos = pos + 1;
    }
    if (hasPrefix === true) {
      numberedTotal = numberedTotal + 1;
    }
    const entry = {index: currentIndex, hasNumberedPrefix: hasPrefix};
    outSections.push(entry);
    currentIndex = currentIndex + 1;
  }
  return {locale: normalizedLocale, totalNumbered: numberedTotal, sections: outSections};
}
