import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_section_offset_map.mjs";

describe("document section offset map", () => {
  it("maps two pt-br sections with trimmed headings and double-LF separators", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    });
    expect(result).toEqual({
      locale: "pt-br",
      totalLength: 32,
      boundaries: [
        { index: 0, start: 0, length: 14 },
        { index: 1, start: 16, length: 16 }
      ]
    });
  });

  it("normalizes locale case and whitespace", () => {
    const result = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "Hi" }]
    });
    expect(result).toEqual({
      locale: "en-us",
      totalLength: 8,
      boundaries: [{ index: 0, start: 0, length: 8 }]
    });
  });

  it("single section total equals its only length", () => {
    const result = runFeature({
      locale: "es",
      sections: [{ heading: "Hola", text: "mundo" }]
    });
    expect(result.boundaries.length).toBe(1);
    expect(result.totalLength).toBe(10);
    expect(result.boundaries[0].start).toBe(0);
    expect(result.boundaries[0].length).toBe(10);
    expect(result.boundaries[0].index).toBe(0);
  });

  it("computes sequential starts with plus-2 separators over three sections", () => {
    const result = runFeature({
      locale: "en-us",
      sections: [
        { heading: "A", text: "1" },
        { heading: "BB", text: "22" },
        { heading: "CCC", text: "333" }
      ]
    });
    expect(result.boundaries).toEqual([
      { index: 0, start: 0, length: 3 },
      { index: 1, start: 5, length: 5 },
      { index: 2, start: 12, length: 7 }
    ]);
    expect(result.totalLength).toBe(19);
  });

  it("measures lengths in UTF-16 units", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "A\uD83D\uDE00", text: "B" }]
    });
    expect("A\uD83D\uDE00".length).toBe(3);
    expect(result.boundaries[0].length).toBe(5);
    expect(result.totalLength).toBe(5);
  });

  it("output contains only locale, totalLength and index-start-length triples", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "Sec", text: "Body", extra: "nope" }],
      unknownTop: "nope",
      id: "nope"
    });
    expect(Object.keys(result).sort()).toEqual(["boundaries", "locale", "totalLength"]);
    expect(Object.keys(result.boundaries[0]).sort()).toEqual(["index", "length", "start"]);
    expect(JSON.stringify(result)).not.toContain("Sec");
    expect(JSON.stringify(result)).not.toContain("Body");
    expect(JSON.stringify(result)).not.toContain("nope");
  });

  it("is pure and deterministic and preserves input", () => {
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "  T  ", text: "x" },
        { heading: "U", text: "yz" }
      ]
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("throws DOCUMENT_OBJECT_REQUIRED for non-object input", () => {
    expect(() => runFeature(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature("x")).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature([])).toThrow("DOCUMENT_OBJECT_REQUIRED");
  });

  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: 7, sections: [{ heading: "A", text: "B" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
  });

  it("throws DOCUMENT_SECTIONS_INVALID for bad array", () => {
    expect(() => runFeature({ locale: "es", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "es", sections: "no" })).toThrow("DOCUMENT_SECTIONS_INVALID");
  });

  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    expect(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "B" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "es", sections: [{ heading: "A", text: 1 }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "es", sections: [null] })).toThrow("DOCUMENT_SECTION_INVALID");
  });

  it("throws DOCUMENT_TOO_LARGE when cumulative size overflows", () => {
    const big = "x".repeat(90001);
    expect(() => runFeature({
      locale: "en-us",
      sections: [
        { heading: "A", text: big },
        { heading: "B", text: big }
      ]
    })).toThrow("DOCUMENT_TOO_LARGE");
    try {
      runFeature({ locale: "en-us", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] });
      expect.unreachable();
    } catch (error) {
      expect(error instanceof RangeError).toBe(true);
      expect(String(error.message)).toContain("DOCUMENT_TOO_LARGE");
    }
  });
});
