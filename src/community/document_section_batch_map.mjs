export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("DOCUMENT_OBJECT_REQUIRED");
  }
  const staged = new Map();
  for (const [k, v] of Object.entries(payload)) {
    staged.set(k, v);
  }
  const rawSize = staged.get("batchSize");
  const resolvedSize = rawSize === undefined ? 10 : rawSize;
  if (typeof resolvedSize !== "number" || Number.isInteger(resolvedSize) === false || resolvedSize < 1 || resolvedSize > 100) {
    throw new RangeError("DOCUMENT_BATCH_SIZE_INVALID");
  }
  const rawLocale = staged.get("locale");
  if (typeof rawLocale !== "string") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const normalizedLocale = rawLocale.trim().toLowerCase();
  if (normalizedLocale !== "pt-br" && normalizedLocale !== "en-us" && normalizedLocale !== "es") {
    throw new TypeError("DOCUMENT_LOCALE_INVALID");
  }
  const rawSections = staged.get("sections");
  if (Array.isArray(rawSections) === false || rawSections.length < 1 || rawSections.length > 100) {
    throw new TypeError("DOCUMENT_SECTIONS_INVALID");
  }
  const totals = new Map();
  totals.set("sum", 0);
  for (const section of Object.values(rawSections)) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const sectionFields = new Map();
    for (const [sk, sv] of Object.entries(section)) {
      sectionFields.set(sk, sv);
    }
    const heading = sectionFields.get("heading");
    const text = sectionFields.get("text");
    if (typeof heading !== "string" || heading.trim().length < 1 || heading.length > 200) {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    if (typeof text !== "string") {
      throw new TypeError("DOCUMENT_SECTION_INVALID");
    }
    const running = totals.get("sum") + heading.length + text.length;
    totals.set("sum", running);
    if (running > 180000) {
      throw new RangeError("DOCUMENT_TOO_LARGE");
    }
  }
  const sectionCount = rawSections.length;
  const batches = [];
  const progress = new Map();
  progress.set("next", 0);
  progress.set("current", []);
  progress.set("filled", 0);
  for (const item of Object.values(rawSections)) {
    const at = progress.get("next");
    const cur = progress.get("current");
    cur.push(at);
    progress.set("next", at + 1);
    const filledNow = progress.get("filled") + 1;
    progress.set("filled", filledNow);
    const isFull = filledNow === resolvedSize;
    const isLast = at + 1 === sectionCount;
    if (isFull === true || isLast === true) {
      batches.push(cur);
      progress.set("current", []);
      progress.set("filled", 0);
    }
  }
  const batchCount = batches.length;
  return {
    locale: normalizedLocale,
    batchSize: resolvedSize,
    sectionCount: sectionCount,
    batchCount: batchCount,
    batches: batches
  };
}
