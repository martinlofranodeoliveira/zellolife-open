import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_numbered_prefix_map.mjs";

describe("document numbered prefix map", () => {
  it("maps example with one numbered heading", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "1. Exemplo", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      totalNumbered: 1,
      sections: [
        { index: 0, hasNumberedPrefix: true },
        { index: 1, hasNumberedPrefix: false }
      ]
    });
  });
  it("normalizes locale whitespace and case", () => {
    const out = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "  12) Intro  ", text: "Hi" }]
    });
    expect(out).toEqual({
      locale: "en-us",
      totalNumbered: 1,
      sections: [{ index: 0, hasNumberedPrefix: true }]
    });
  });
  it("accepts es locale", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "Hola", text: "x" }] });
    expect(out.locale).toBe("es");
    expect(out.totalNumbered).toBe(0);
  });
  it("rejects non-object payloads", () => {
    for (const bad of [null, [1, 2], "x", 42, undefined]) {
      expect(() => runFeature(bad)).toThrowError(TypeError);
      try {
        runFeature(bad);
      } catch (e) {
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });
  it("rejects bad locale", () => {
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "b" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: 42, sections: [{ heading: "A", text: "b" }] })).toThrowError(TypeError);
  });
  it("rejects bad sections array", () => {
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "nope" })).toThrowError("DOCUMENT_SECTIONS_INVALID");
  });
  it("rejects bad heading or text", () => {
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "b" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 42 }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "x".repeat(201), text: "b" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
  });
  it("rejects size overflow", () => {
    const big = "y".repeat(90001);
    expect(() => runFeature({
      locale: "pt-br",
      sections: [
        { heading: "A", text: big },
        { heading: "B", text: big }
      ]
    })).toThrowError("DOCUMENT_TOO_LARGE");
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] });
    } catch (e) {
      expect(e instanceof RangeError).toBe(true);
    }
  });
  it("detects delimiter variants and negatives", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "1. A", text: "t" },
        { heading: "2) B", text: "t" },
        { heading: "123", text: "t" },
        { heading: ". Intro", text: "t" },
        { heading: "Notas", text: "t" },
        { heading: "1a. C", text: "t" }
      ]
    });
    expect(out.sections.map((s) => s.hasNumberedPrefix)).toEqual([true, true, false, false, false, false]);
    expect(out.totalNumbered).toBe(2);
  });
  it("preserves input and returns only index-flag pairs", () => {
    const payload = {
      locale: "pt-br",
      sections: [{ heading: "1. A", text: "t", extra: "keep" }],
      extra: "keep"
    };
    const snap = JSON.parse(JSON.stringify(payload));
    const out = runFeature(payload);
    expect(payload).toEqual(snap);
    expect(Object.keys(out).sort()).toEqual(["locale", "sections", "totalNumbered"]);
    expect(Object.keys(out.sections[0]).sort()).toEqual(["hasNumberedPrefix", "index"]);
    expect(JSON.stringify(out)).not.toContain("1. A");
  });
  it("is deterministic", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "10. X", text: "t" }] };
    expect(runFeature(payload)).toEqual(runFeature(JSON.parse(JSON.stringify(payload))));
  });
});
