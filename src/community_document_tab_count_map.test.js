import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_tab_count_map.mjs";

describe("document tab count map", () => {
  it("rejects non-object payloads with DOCUMENT_OBJECT_REQUIRED", () => {
    const badValues = [null, undefined, 42, "x", true];
    for (const value of badValues) {
      try {
        runFeature(value);
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
    try {
      runFeature([]);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
    }
    const arrayPayload = [{ locale: "pt-br", sections: [{ heading: "A", text: "B" }] }];
    try {
      runFeature(arrayPayload);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
    }
  });
  it("rejects bad locale after trim-and-lowercase normalization", () => {
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: "", sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: 7, sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    const before = JSON.stringify({ locale: " EN-US ", sections: [{ heading: "A", text: "B" }] });
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "A", text: "B" }] });
    expect(out.locale).toBe("en-us");
    expect(JSON.stringify({ locale: " EN-US ", sections: [{ heading: "A", text: "B" }] })).toBe(before);
  });
  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "nope" })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br" })).toThrowError("DOCUMENT_SECTIONS_INVALID");
  });
  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "ok" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "", text: "ok" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: 5, text: "ok" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "ok", text: 5 }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [null] })).toThrowError("DOCUMENT_SECTION_INVALID");
  });
  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(90001);
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] };
    try {
      runFeature(payload);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
  it("matches first contract example", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "Exemplo", text: "A\tB" }, { heading: "Notas", text: "Sem tabs" }] });
    expect(out).toEqual({
      locale: "pt-br",
      counts: [
        { index: 0, headingTabCount: 0, textTabCount: 1, tabCount: 1 },
        { index: 1, headingTabCount: 0, textTabCount: 0, tabCount: 0 }
      ],
      totalTabCount: 1,
      totalHeadingTabCount: 0,
      totalTextTabCount: 1,
      tabSectionCount: 1
    });
  });
  it("matches second contract example with locale normalization", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro\tX", text: "Hi" }] });
    expect(out).toEqual({
      locale: "en-us",
      counts: [{ index: 0, headingTabCount: 1, textTabCount: 0, tabCount: 1 }],
      totalTabCount: 1,
      totalHeadingTabCount: 1,
      totalTextTabCount: 0,
      tabSectionCount: 1
    });
  });
  it("counts TAB-only in trimmed heading and original text", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "a b  c", text: "a b  c" }] });
    expect(out.counts.length).toBe(1);
    const trimmed = runFeature({ locale: "es", sections: [{ heading: "  a\tb  ", text: "x\ty\tz" }] });
    expect(trimmed.totalTabCount).toBe(3);
    expect(trimmed.totalHeadingTabCount).toBe(1);
    expect(trimmed.totalTextTabCount).toBe(2);
    expect(trimmed.tabSectionCount).toBe(1);
  });
  it("returns totals as sums and tabSectionCount for mixed sections", () => {
    const out = runFeature({
      locale: "Pt-Br",
      sections: [
        { heading: "H\t1", text: "\t\t" },
        { heading: "H2", text: "plain" },
        { heading: "H\t\t3", text: "a\tb" }
      ]
    });
    expect(out.locale).toBe("pt-br");
    expect(out.counts.length).toBe(3);
    expect(out.totalHeadingTabCount).toBe(3);
    expect(out.totalTextTabCount).toBe(3);
    expect(out.totalTabCount).toBe(6);
    expect(out.tabSectionCount).toBe(2);
  });
  it("preserves input and returns only locale plus counts and totals", () => {
    const payload = { locale: "  ES ", sections: [{ heading: "ZZZ\tZZZ", text: "QQQ\tQQQ" }], extra: 123 };
    const snapshot = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(JSON.stringify(payload)).toBe(snapshot);
    expect(Object.keys(out).sort()).toEqual(["counts", "locale", "tabSectionCount", "totalHeadingTabCount", "totalTabCount", "totalTextTabCount"].sort());
    const flat = JSON.stringify(out);
    expect(flat.includes("ZZZ")).toBe(false);
    expect(flat.includes("QQQ")).toBe(false);
    expect(flat.includes("extra")).toBe(false);
  });
  it("is deterministic for identical inputs", () => {
    const payload = { locale: "en-us", sections: [{ heading: "A\tB", text: "C\tD\tE" }] };
    const a = runFeature(JSON.parse(JSON.stringify(payload)));
    const b = runFeature(JSON.parse(JSON.stringify(payload)));
    expect(a).toEqual(b);
  });
});
