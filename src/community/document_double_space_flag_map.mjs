export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) === true) {
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
  if (rawSections.length === 0 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let totalSize = 0;
  for (const entry of rawSections) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry) === true) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const rawHeading = entry.heading;
    const rawText = entry.text;
    if (typeof rawHeading !== "string" || typeof rawText !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.trim() === "") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (rawHeading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    totalSize += rawHeading.length + rawText.length;
    if (totalSize > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const flags = [];
  let headingDoubleSpaceCount = 0;
  let textDoubleSpaceCount = 0;
  let doubleSpaceSectionCount = 0;
  let index = 0;
  for (const entry of rawSections) {
    const rawHeading = entry.heading;
    const rawText = entry.text;
    const h = rawHeading.trim();
    const t = rawText;
    let headingHasDoubleSpace = false;
    let previousWasSpaceHeading = false;
    for (const ch of h) {
      if (ch === " ") {
        if (previousWasSpaceHeading === true) {
          headingHasDoubleSpace = true;
          break;
        }
        previousWasSpaceHeading = true;
      } else {
        previousWasSpaceHeading = false;
      }
    }
    let textHasDoubleSpace = false;
    let previousWasSpaceText = false;
    for (const ch of t) {
      if (ch === " ") {
        if (previousWasSpaceText === true) {
          textHasDoubleSpace = true;
          break;
        }
        previousWasSpaceText = true;
      } else {
        previousWasSpaceText = false;
      }
    }
    let hasDoubleSpace = false;
    if (headingHasDoubleSpace === true || textHasDoubleSpace === true) {
      hasDoubleSpace = true;
    }
    if (headingHasDoubleSpace === true) {
      headingDoubleSpaceCount += 1;
    }
    if (textHasDoubleSpace === true) {
      textDoubleSpaceCount += 1;
    }
    if (hasDoubleSpace === true) {
      doubleSpaceSectionCount += 1;
    }
    const flagEntry = {
      index: index,
      headingHasDoubleSpace: headingHasDoubleSpace,
      textHasDoubleSpace: textHasDoubleSpace,
      hasDoubleSpace: hasDoubleSpace
    };
    flags.push(flagEntry);
    index += 1;
  }
  const result = {
    locale: locale,
    flags: flags,
    headingDoubleSpaceCount: headingDoubleSpaceCount,
    textDoubleSpaceCount: textDoubleSpaceCount,
    doubleSpaceSectionCount: doubleSpaceSectionCount
  };
  return result;
}
