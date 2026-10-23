import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_text_duplicate_map.mjs";

describe("document text duplicate map", () => {
  it("rejects non-object payloads without mutating input", () => {
    const bad = [null, undefined, 42, "x", true, []];
    for (const value of bad) {
      try {
        runFeature(value);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "Same" }] };
    const before = JSON.stringify(payload);
    try {
      runFeature(null);
    } catch {
    }
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("validates locale and normalizes case plus whitespace", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out.locale).toBe("en-us");
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "A", text: "x" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: " es ", sections: [{ heading: "A", text: "x" }] }).locale).toBe("es");
    for (const badLocale of ["fr", "", "  ", 42, null, undefined]) {
      try {
        runFeature({ locale: badLocale, sections: [{ heading: "A", text: "x" }] });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });

  it("rejects bad sections and bad heading or text, and overflow", () => {
    try {
      runFeature({ locale: "pt-br", sections: "nope" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "x" }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 42 }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    const big = "a".repeat(90001);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });

  it("reports exact matches with ordered entries and matching totals", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Intro", text: "Same" },
        { heading: "Next", text: "Same" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      entries: [
        { duplicateCount: 2, index: 0, isDuplicate: true },
        { duplicateCount: 2, index: 1, isDuplicate: true }
      ],
      duplicateSectionCount: 2,
      duplicateGroupCount: 1
    });
    const single = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(single).toEqual({
      locale: "en-us",
      entries: [{ duplicateCount: 1, index: 0, isDuplicate: false }],
      duplicateSectionCount: 0,
      duplicateGroupCount: 0
    });
    const mixed = runFeature({
      locale: "es",
      sections: [
        { heading: "A", text: "Same" },
        { heading: "B", text: " Same " },
        { heading: "C", text: "same" },
        { heading: "D", text: "Same" },
        { heading: "E", text: "Other" }
      ]
    });
    expect(mixed.entries.map((e) => e.duplicateCount)).toEqual([2, 1, 1, 2, 1]);
    expect(mixed.entries.map((e) => e.isDuplicate)).toEqual([true, false, false, true, false]);
    expect(mixed.entries.map((e) => e.index)).toEqual([0, 1, 2, 3, 4]);
    expect(mixed.duplicateSectionCount).toBe(2);
    expect(mixed.duplicateGroupCount).toBe(1);
  });

  it("returns only allowed fields and preserves input", () => {
    const payload = {
      locale: "pt-br",
      extra: "drop",
      sections: [
        { heading: "A", text: "Same", extra: 1 },
        { heading: "B", text: "Same" }
      ]
    };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
    expect(Object.keys(out).sort()).toEqual(["duplicateGroupCount", "duplicateSectionCount", "entries", "locale"]);
    for (const entry of out.entries) {
      expect(Object.keys(entry).sort()).toEqual(["duplicateCount", "index", "isDuplicate"]);
    }
    const text = JSON.stringify(out);
    expect(text.includes("Same")).toBe(false);
  });

  it("stays deterministic across repeated calls", () => {
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "A", text: "Alpha" },
        { heading: "B", text: "Beta" },
        { heading: "C", text: "Alpha" }
      ]
    };
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(first.duplicateSectionCount).toBe(2);
    expect(first.duplicateGroupCount).toBe(1);
  });
});
