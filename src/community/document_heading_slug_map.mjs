export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const rawLocale = payload.locale;
  const rawSections = payload.sections;
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normLocale = rawLocale.trim().toLowerCase();
  if (normLocale !== "pt-br" && normLocale !== "en-us" && normLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  if (Array.isArray(rawSections) === false) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const secCount = rawSections.length;
  if (secCount < 1 || secCount > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  let total = 0;
  for (const sec of rawSections) {
    if (sec === null || typeof sec !== "object" || Array.isArray(sec)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const h = sec.heading;
    const t = sec.text;
    if (typeof h !== "string" || typeof t !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (h.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const trimmedCheck = h.trim();
    if (trimmedCheck.length === 0) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    total = total + h.length + t.length;
    if (total > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const seen = new Map();
  const out = [];
  for (const sec of rawSections) {
    const trimmed = sec.heading.trim();
    const lower = trimmed.toLowerCase();
    let built = "";
    let prevHyphen = false;
    for (const ch of lower) {
      if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) {
        built = built + ch;
        prevHyphen = false;
      } else if (ch === " " || ch === "_" || ch === "-") {
        if (prevHyphen === false) {
          built = built + "-";
          prevHyphen = true;
        }
      }
    }
    let base = built;
    if (base.startsWith("-")) {
      base = base.slice(1);
    }
    if (base.endsWith("-")) {
      base = base.slice(0, base.length - 1);
    }
    if (base === "") {
      base = "section";
    }
    if (base.length > 60) {
      base = base.slice(0, 60);
      if (base.endsWith("-")) {
        base = base.slice(0, base.length - 1);
      }
    }
    let suffix = 0;
    let candidate = base;
    for (const other of rawSections) {
      const used = seen.get(candidate);
      if (used === undefined) {
        break;
      }
      suffix = suffix + 1;
      candidate = base + "-" + suffix;
    }
    seen.set(candidate, true);
    const idx = out.length;
    out.push({ index: idx, heading: trimmed, slug: candidate });
  }
  const result = { locale: normLocale, slugs: out };
  return result;
}
