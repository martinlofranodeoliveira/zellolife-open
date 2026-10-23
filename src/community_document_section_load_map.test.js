import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_section_load_map.mjs";

describe("document section load map", () => {
  it("maps pt-br example with trimmed headings", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    });
    expect(result).toEqual({
      locale: "pt-br",
      entries: [
        { index: 0, sectionLoad: 13 },
        { index: 1, sectionLoad: 15 }
      ],
      totalLoad: 28,
      heaviestIndex: 1
    });
  });
  it("normalizes locale with trim and lowercase", () => {
    const result = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(result).toEqual({
      locale: "en-us",
      entries: [{ index: 0, sectionLoad: 7 }],
      totalLoad: 7,
      heaviestIndex: 0
    });
  });
  it("accepts es with surrounding whitespace and mixed case", () => {
    const result = runFeature({ locale: "  ES  ", sections: [{ heading: "Hola", text: "!" }] });
    expect(result.locale).toBe("es");
    expect(result.entries).toEqual([{ index: 0, sectionLoad: 5 }]);
    expect(result.totalLoad).toBe(5);
    expect(result.heaviestIndex).toBe(0);
  });
  it("rejects non-object payloads with DOCUMENT_OBJECT_REQUIRED", () => {
    for (const bad of [null, undefined, 42, "x", [], [{ locale: "es", sections: [{ heading: "a", text: "b" }] }]]) {
      try {
        runFeature(bad);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });
  it("rejects bad locale with DOCUMENT_LOCALE_INVALID", () => {
    for (const locale of ["fr", "pt_br", "en", "", "  ", 42, null, undefined]) {
      try {
        runFeature({ locale, sections: [{ heading: "a", text: "b" }] });
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });
  it("checks locale before sections shape", () => {
    try {
      runFeature({ locale: "bad", sections: "nope" });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
  });
  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    const badSections = ["nope", 42, {}, null, [], Array.from({ length: 101 }, () => ({ heading: "a", text: "b" }))];
    for (const sections of badSections) {
      try {
        runFeature({ locale: "pt-br", sections });
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
    }
  });
  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    const cases = [
      { heading: "   ", text: "ok" },
      { heading: "", text: "ok" },
      { heading: 42, text: "ok" },
      { heading: "ok", text: 42 },
      { heading: "ok", text: null },
      { heading: "a".repeat(201), text: "ok" },
      null,
      "section",
      []
    ];
    for (const bad of cases) {
      try {
        runFeature({ locale: "es", sections: [bad] });
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
      }
    }
  });
  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(180000);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "h", text: big }] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
  it("allows exactly 180000 cumulative units", () => {
    const text = "x".repeat(179999);
    const result = runFeature({ locale: "es", sections: [{ heading: "h", text }] });
    expect(result.totalLoad).toBe(180000);
    expect(result.heaviestIndex).toBe(0);
  });
  it("uses trimmed heading length for sectionLoad", () => {
    const result = runFeature({ locale: "pt-br", sections: [{ heading: "  ab  ", text: "12" }] });
    expect(result.entries).toEqual([{ index: 0, sectionLoad: 4 }]);
    expect(result.totalLoad).toBe(4);
  });
  it("counts UTF-16 units for sectionLoad", () => {
    const emoji = "\uD83D\uDE00";
    expect(emoji.length).toBe(2);
    const result = runFeature({ locale: "en-us", sections: [{ heading: "A", text: emoji }] });
    expect(result.entries[0].sectionLoad).toBe(3);
  });
  it("picks smallest index for maximal load ties", () => {
    const result = runFeature({
      locale: "es",
      sections: [
        { heading: "aa", text: "bbb" },
        { heading: "ccccc", text: "ddddd" },
        { heading: "12345", text: "67890" }
      ]
    });
    expect(result.entries.map((e) => e.sectionLoad)).toEqual([5, 10, 10]);
    expect(result.totalLoad).toBe(25);
    expect(result.heaviestIndex).toBe(1);
  });
  it("returns only locale, entries, totalLoad and heaviestIndex", () => {
    const result = runFeature({
      locale: "pt-br",
      extra: "ignore",
      sections: [{ heading: "H", text: "T", extra: 1 }]
    });
    expect(Object.keys(result).sort()).toEqual(["entries", "heaviestIndex", "locale", "totalLoad"]);
    expect(JSON.stringify(result)).not.toContain("H");
    expect(result.entries[0]).toEqual({ index: 0, sectionLoad: 2 });
  });
  it("does not mutate input", () => {
    const payload = { locale: " EN-US ", sections: [{ heading: "  Hi  ", text: "yo" }] };
    const snapshot = JSON.stringify(payload);
    runFeature(payload);
    expect(JSON.stringify(payload)).toBe(snapshot);
  });
  it("is deterministic", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "1" }, { heading: "BB", text: "22" }] };
    const a = runFeature(payload);
    const b = runFeature(payload);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.entries).not.toBe(b.entries);
  });
});
