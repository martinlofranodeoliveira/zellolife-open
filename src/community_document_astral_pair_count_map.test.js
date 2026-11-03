import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_astral_pair_count_map.mjs";

function checkThrow(fn, Ctor, code) {
  let seen = null;
  try {
    fn();
  } catch (err) {
    seen = err;
  }
  expect(seen).not.toBeNull();
  expect(seen instanceof Ctor).toBe(true);
  expect(String(seen.message)).toContain(code);
}

describe("document astral pair count map examples", () => {
  it("ascii-only yields zero", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }] });
    expect(out).toEqual({ locale: "pt-br", totalAstralPairs: 0, sections: [{ index: 0, astralPairCount: 0 }] });
  });
  it("single section with emoji and musical symbol yields two", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Exemplo \uD83D\uDE00", text: "Hi \uD834\uDD1E end" }] });
    expect(out.locale).toBe("en-us");
    expect(out.totalAstralPairs).toBe(2);
    expect(out.sections).toEqual([{ index: 0, astralPairCount: 2 }]);
  });
  it("two-section mix yields two total with per-section two and zero", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "Notas", text: "A \uD83D\uDE00 B \uD83D\uDE00" },
        { heading: "Intro", text: "Hi" }
      ]
    });
    expect(out).toEqual({
      locale: "es",
      totalAstralPairs: 2,
      sections: [
        { index: 0, astralPairCount: 2 },
        { index: 1, astralPairCount: 0 }
      ]
    });
  });
});

describe("validation order and codes", () => {
  it("rejects non-object input", () => {
    checkThrow(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature("x"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
  });
  it("rejects bad locale before sections shape", () => {
    checkThrow(() => runFeature({ locale: "fr", sections: [{ heading: "H", text: "T" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ locale: 42, sections: [{ heading: "H", text: "T" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });
  it("normalizes locale case and whitespace", () => {
    const out = runFeature({ locale: "  PT-BR  ", sections: [{ heading: "H", text: "T" }] });
    expect(out.locale).toBe("pt-br");
  });
  it("rejects bad array shape", () => {
    checkThrow(() => runFeature({ locale: "es", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: "nope" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });
  it("rejects bad heading or text", () => {
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "H", text: 7 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "a".repeat(201), text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });
  it("rejects cumulative overflow", () => {
    const big = "a".repeat(180000);
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "H", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });
});

describe("counting and output shape", () => {
  it("counts zero for BMP LF CR TAB-only content", () => {
    const out = runFeature({ locale: "en-us", sections: [{ heading: "ABC", text: "a\nb\rc\td\u00E9\uFB01" }] });
    expect(out.totalAstralPairs).toBe(0);
    expect(out.sections[0].astralPairCount).toBe(0);
  });
  it("returns only locale total and index-count pairs in order", () => {
    const payload = { locale: "es", sections: [{ heading: "H1", text: "x" }, { heading: "H2", text: "y" }], extra: "nope" };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(Object.keys(out).sort()).toEqual(["locale", "sections", "totalAstralPairs"]);
    expect(Object.keys(out.sections[0]).sort()).toEqual(["astralPairCount", "index"]);
    expect(out.sections[0].index).toBe(0);
    expect(out.sections[1].index).toBe(1);
    expect(JSON.stringify(payload)).toBe(before);
  });
  it("trims heading for counting without changing text line endings", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  hi  ", text: "a\n\uD83D\uDE00" }] });
    expect(out.totalAstralPairs).toBe(1);
  });
});
