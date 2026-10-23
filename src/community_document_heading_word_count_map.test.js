import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_word_count_map.mjs";

describe("document heading word count map", () => {
  it("matches contract example pt-br", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo clínico  ", text: "Texto." }, { heading: "Notas de revisão", text: "Mais texto" }] });
    expect(out).toEqual({ locale: "pt-br", entries: [{ index: 0, headingWordCount: 2 }, { index: 1, headingWordCount: 3 }], totalHeadingWords: 5 });
  });
  it("normalizes locale with trim and lowercase", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "  Relatório final revisão  ", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", entries: [{ index: 0, headingWordCount: 3 }], totalHeadingWords: 3 });
  });
  it("counts collapsed separators and multiple sections", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "A  B   C", text: "Texto." }, { heading: "Solo", text: "Otro." }] });
    expect(out).toEqual({ locale: "es", entries: [{ index: 0, headingWordCount: 3 }, { index: 1, headingWordCount: 1 }], totalHeadingWords: 4 });
  });
  it("splits only on SPACE LF CR TAB and collapses mixed runs", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "a \t\n\r b   c", text: "x" }] });
    expect(out.entries).toEqual([{ index: 0, headingWordCount: 3 }]);
    expect(out.totalHeadingWords).toBe(3);
    const nbsp = runFeature({ locale: "es", sections: [{ heading: "a\u00A0b", text: "x" }] });
    expect(nbsp.entries[0].headingWordCount).toBe(1);
  });
  it("returns entries in input order with zero-based index and summed total", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "one", text: "a" }, { heading: "two words", text: "b" }, { heading: " three  fine words ", text: "c" }] });
    expect(out.locale).toBe("pt-br");
    expect(out.entries).toEqual([{ index: 0, headingWordCount: 1 }, { index: 1, headingWordCount: 2 }, { index: 2, headingWordCount: 3 }]);
    expect(out.totalHeadingWords).toBe(6);
  });
  it("output holds only counts and no source text", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "Hola mundo", text: "Secreto", extra: "keep" }], extraTop: 1 });
    expect(Object.keys(out).sort()).toEqual(["entries", "locale", "totalHeadingWords"]);
    expect(JSON.stringify(out)).not.toContain("Hola");
    expect(JSON.stringify(out)).not.toContain("Secreto");
    for (const e of out.entries) {
      expect(Object.keys(e).sort()).toEqual(["headingWordCount", "index"]);
    }
  });
  it("is deterministic and pure", () => {
    const payload = { locale: "en-us", sections: [{ heading: "Hello world", text: "t" }] };
    const a = runFeature(payload);
    const b = runFeature(payload);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.entries).not.toBe(b.entries);
  });
  it("throws DOCUMENT_OBJECT_REQUIRED as TypeError without mutating input", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      try {
        runFeature(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });
  it("throws DOCUMENT_LOCALE_INVALID and validates before sections", () => {
    try {
      runFeature({ locale: "fr", sections: "nope" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
    try {
      runFeature({ sections: [{ heading: "a", text: "b" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
    expect(runFeature({ locale: "  ES ", sections: [{ heading: "a", text: "b" }] }).locale).toBe("es");
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "a", text: "b" }] }).locale).toBe("pt-br");
  });
  it("throws DOCUMENT_SECTIONS_INVALID for bad shape or length", () => {
    const badArrays = [{ locale: "es", sections: "x" }, { locale: "es", sections: [] }];
    for (const p of badArrays) {
      try {
        runFeature(p);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
    }
    const many = [];
    for (let i = 0; i < 101; i += 1) many.push({ heading: "a", text: "b" });
    try {
      runFeature({ locale: "es", sections: many });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });
  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    const cases = [
      { locale: "es", sections: [{ heading: "   ", text: "b" }] },
      { locale: "es", sections: [{ heading: 42, text: "b" }] },
      { locale: "es", sections: [{ heading: "a", text: 42 }] },
      { locale: "es", sections: [null] },
      { locale: "es", sections: [{ heading: "a".repeat(201), text: "b" }] }
    ];
    for (const p of cases) {
      try {
        runFeature(p);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
      }
    }
  });
  it("throws DOCUMENT_TOO_LARGE as RangeError on cumulative overflow", () => {
    const big = "x".repeat(90000);
    try {
      runFeature({ locale: "es", sections: [{ heading: "a", text: big }, { heading: "b", text: big }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
  it("preserves input and handles boundary lengths", () => {
    const payload = { locale: " en-us ", sections: [{ heading: " " + "h".repeat(198) + " ", text: "t" }] };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
    expect(payload.locale).toBe(" en-us ");
    expect(out.locale).toBe("en-us");
    expect(out.entries[0].headingWordCount).toBe(1);
  });
});
