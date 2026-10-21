import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_double_space_flag_map.mjs";

describe("document double space flag map", () => {
  it("maps pt-br contract example", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto  com dois espaços." },
        { heading: "Notas", text: "Texto simples" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      flags: [
        { index: 0, headingHasDoubleSpace: false, textHasDoubleSpace: true, hasDoubleSpace: true },
        { index: 1, headingHasDoubleSpace: false, textHasDoubleSpace: false, hasDoubleSpace: false }
      ],
      headingDoubleSpaceCount: 0,
      textDoubleSpaceCount: 1,
      doubleSpaceSectionCount: 1
    });
  });
  it("normalizes locale case and whitespace", () => {
    const out = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro  Notes", text: "Hi" }]
    });
    expect(out.locale).toBe("en-us");
    expect(out.flags).toEqual([
      { index: 0, headingHasDoubleSpace: true, textHasDoubleSpace: false, hasDoubleSpace: true }
    ]);
    expect(out.headingDoubleSpaceCount).toBe(1);
    expect(out.textDoubleSpaceCount).toBe(0);
    expect(out.doubleSpaceSectionCount).toBe(1);
  });
  it("trims headings so outer double spaces do not count", () => {
    const out = runFeature({
      locale: "es",
      sections: [{ heading: "  Hola  ", text: "ok" }]
    });
    expect(out.flags[0].headingHasDoubleSpace).toBe(false);
    expect(out.flags[0].hasDoubleSpace).toBe(false);
  });
  it("treats three spaces as true and ignores TAB LF CR", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "a   b", text: "ok" },
        { heading: "ok", text: "a\tb\nc\rd" },
        { heading: "ok", text: "a\t  b" }
      ]
    });
    expect(out.flags[0].headingHasDoubleSpace).toBe(true);
    expect(out.flags[1].textHasDoubleSpace).toBe(false);
    expect(out.flags[2].textHasDoubleSpace).toBe(true);
  });
  it("empty and single-space text yield false", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "A", text: "" },
        { heading: "B", text: " " },
        { heading: "C", text: "a b" }
      ]
    });
    expect(out.flags.map((f) => f.textHasDoubleSpace)).toEqual([false, false, false]);
    expect(out.textDoubleSpaceCount).toBe(0);
    expect(out.doubleSpaceSectionCount).toBe(0);
  });
  it("preserves order with index and totals equal sums", () => {
    const out = runFeature({
      locale: "en-us",
      sections: [
        { heading: "A  B", text: "x" },
        { heading: "C", text: "y  z" },
        { heading: "D  E", text: "f  g" },
        { heading: "H", text: "i" }
      ]
    });
    expect(out.flags.map((f) => f.index)).toEqual([0, 1, 2, 3]);
    expect(out.headingDoubleSpaceCount).toBe(2);
    expect(out.textDoubleSpaceCount).toBe(2);
    expect(out.doubleSpaceSectionCount).toBe(3);
  });
  it("output contains only locale and flag booleans", () => {
    const out = runFeature({
      locale: "pt-br",
      extra: "ignore-me",
      sections: [{ heading: "Hi", text: "Hello  World", extra2: 1 }]
    });
    expect(Object.keys(out).sort()).toEqual(["doubleSpaceSectionCount", "flags", "headingDoubleSpaceCount", "locale", "textDoubleSpaceCount"]);
    expect(Object.keys(out.flags[0]).sort()).toEqual(["hasDoubleSpace", "headingHasDoubleSpace", "index", "textHasDoubleSpace"]);
    const serialized = JSON.stringify(out);
    expect(serialized.includes("Hello")).toBe(false);
    expect(serialized.includes("ignore-me")).toBe(false);
  });
  it("is deterministic and does not mutate input", () => {
    const payload = {
      locale: "  ES ",
      sections: [{ heading: "A  B", text: "x  y" }]
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(JSON.stringify(payload)).toBe(before);
    expect(first.locale).toBe("es");
  });
  it("throws DOCUMENT_OBJECT_REQUIRED for non-object input", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      try {
        runFeature(bad);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });
  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    for (const badLocale of ["fr", "", "  ", 42, null]) {
      try {
        runFeature({ locale: badLocale, sections: [{ heading: "A", text: "B" }] });
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });
  it("throws DOCUMENT_SECTIONS_INVALID for bad array", () => {
    try {
      runFeature({ locale: "pt-br", sections: [] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: "nope" });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });
  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "ok" }] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 42 }] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "x".repeat(201), text: "ok" }] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });
  it("throws DOCUMENT_TOO_LARGE for overflow", () => {
    const big = "a".repeat(180000);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "H", text: big }] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
});
