import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_line_break_audit_map.mjs";

describe("document line-break audit map", () => {
  it("audits pt-br example with per-section LF counts and sum", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Exemplo", text: "Linha1\nLinha2\nLinha3" },
        { heading: "Notas", text: "Sem quebra" }
      ]
    });
    expect(result).toEqual({
      locale: "pt-br",
      breaks: [
        { index: 0, lineBreaks: 2 },
        { index: 1, lineBreaks: 0 }
      ],
      totalLineBreaks: 2
    });
  });

  it("normalizes locale case and whitespace", () => {
    const result = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "Hi\r\nHo\nHey" }]
    });
    expect(result).toEqual({
      locale: "en-us",
      breaks: [{ index: 0, lineBreaks: 2 }],
      totalLineBreaks: 2
    });
  });

  it("counts CRLF as one and lone CR as zero", () => {
    const result = runFeature({
      locale: "es",
      sections: [{ heading: "H", text: "a\r\nb\rc\nd" }]
    });
    expect(result.breaks).toEqual([{ index: 0, lineBreaks: 2 }]);
    expect(result.totalLineBreaks).toBe(2);
    const onlyCr = runFeature({
      locale: "es",
      sections: [{ heading: "H", text: "a\rb\rc" }]
    });
    expect(onlyCr.totalLineBreaks).toBe(0);
  });

  it("ignores heading line breaks", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "A\nB\nC", text: "x" }]
    });
    expect(result.breaks).toEqual([{ index: 0, lineBreaks: 0 }]);
    expect(result.totalLineBreaks).toBe(0);
  });

  it("returns only locale, breaks and totalLineBreaks with integers", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "Secret", text: "a\nb", extra: "nope" }],
      extraTop: "nope"
    });
    expect(Object.keys(result).sort()).toEqual(["breaks", "locale", "totalLineBreaks"]);
    expect(Object.keys(result.breaks[0]).sort()).toEqual(["index", "lineBreaks"]);
    expect(Number.isInteger(result.totalLineBreaks)).toBe(true);
    expect(Number.isInteger(result.breaks[0].index)).toBe(true);
    expect(Number.isInteger(result.breaks[0].lineBreaks)).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Secret");
    expect(serialized).not.toContain("a\nb");
    expect(serialized).not.toContain("extraTop");
  });

  it("is pure deterministic and preserves input", () => {
    const payload = {
      locale: " es ",
      sections: [{ heading: "H", text: "a\nb\n" }]
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(JSON.stringify(payload)).toBe(before);
    expect(first.locale).toBe("es");
    expect(first.totalLineBreaks).toBe(2);
  });

  it("rejects non-object input with DOCUMENT_OBJECT_REQUIRED", () => {
    for (const bad of [null, undefined, "x", 42, []]) {
      try {
        runFeature(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toContain("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });

  it("rejects bad locale with DOCUMENT_LOCALE_INVALID", () => {
    for (const locale of ["fr", "", "   ", 42, null]) {
      try {
        runFeature({ locale, sections: [{ heading: "H", text: "t" }] });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toContain("DOCUMENT_LOCALE_INVALID");
      }
    }
  });

  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    try {
      runFeature({ locale: "pt-br", sections: "nope" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toContain("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toContain("DOCUMENT_SECTIONS_INVALID");
    }
  });

  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    const cases = [
      { heading: "", text: "t" },
      { heading: "   ", text: "t" },
      { heading: "H", text: 42 },
      { heading: 42, text: "t" },
      { heading: "x".repeat(201), text: "t" }
    ];
    for (const section of cases) {
      try {
        runFeature({ locale: "pt-br", sections: [section] });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toContain("DOCUMENT_SECTION_INVALID");
      }
    }
  });

  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(180000);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "H", text: big }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toContain("DOCUMENT_TOO_LARGE");
    }
  });
});
