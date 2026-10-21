import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_digit_count_map.mjs";

describe("document digit count map", () => {
  it("matches first contract example", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Exame 2024", text: "Pressao 120 por 80." },
        { heading: "Notas", text: "Sem digitos aqui" }
      ]
    });
    expect(result).toEqual({
      locale: "pt-br",
      counts: [
        { index: 0, headingDigitCount: 4, textDigitCount: 5, digitCount: 9 },
        { index: 1, headingDigitCount: 0, textDigitCount: 0, digitCount: 0 }
      ],
      totalHeadingDigits: 4,
      totalTextDigits: 5,
      totalDigits: 9
    });
  });

  it("normalizes locale whitespace and case", () => {
    const result = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "Hi 7" }]
    });
    expect(result).toEqual({
      locale: "en-us",
      counts: [{ index: 0, headingDigitCount: 0, textDigitCount: 1, digitCount: 1 }],
      totalHeadingDigits: 0,
      totalTextDigits: 1,
      totalDigits: 1
    });
  });

  it("rejects non-object payload without mutating", () => {
    const badValues = [null, undefined, 42, "x", true, [{ locale: "es", sections: [{ heading: "A", text: "1" }] }]];
    for (const value of badValues) {
      try {
        runFeature(value);
        expect.unreachable("should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });

  it("rejects bad locale", () => {
    const badLocales = ["fr", "", "  ", "pt", "en", "pt-BR-x", 123, null, undefined];
    for (const locale of badLocales) {
      try {
        runFeature({ locale, sections: [{ heading: "Ok", text: "1" }] });
        expect.unreachable("should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
    expect(runFeature({ locale: "\tEs\n", sections: [{ heading: "H", text: "x" }] }).locale).toBe("es");
    expect(runFeature({ locale: " PT-BR ", sections: [{ heading: "H", text: "x" }] }).locale).toBe("pt-br");
  });

  it("rejects bad sections array", () => {
    try {
      runFeature({ locale: "es", sections: "nope" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    const tooMany = [];
    for (let i = 0; i < 101; i++) {
      tooMany.push({ heading: "H", text: "x" });
    }
    try {
      runFeature({ locale: "es", sections: tooMany });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });

  it("rejects bad heading or text", () => {
    try {
      runFeature({ locale: "es", sections: [{ heading: "   ", text: "1" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: 42, text: "1" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "Ok", text: 7 }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [null] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    let longHeading = "";
    for (let i = 0; i < 201; i++) {
      longHeading = longHeading + "a";
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: longHeading, text: "x" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });

  it("rejects cumulative overflow with RangeError", () => {
    let big = "";
    for (let i = 0; i < 90001; i++) {
      big = big + "x";
    }
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "A", text: big },
        { heading: "B", text: big }
      ]
    };
    const before = JSON.stringify(payload);
    try {
      runFeature(payload);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("counts only ASCII digits and uses trimmed heading", () => {
    const result = runFeature({
      locale: "es",
      sections: [
        { heading: "  a1b22  ", text: "abc" },
        { heading: "Nota", text: "\u0660\u0661\u0662" },
        { heading: "Full", text: "\uFF11\uFF12" },
        { heading: "Empty", text: "" }
      ]
    });
    expect(result.counts[0]).toEqual({ index: 0, headingDigitCount: 3, textDigitCount: 0, digitCount: 3 });
    expect(result.counts[1]).toEqual({ index: 1, headingDigitCount: 0, textDigitCount: 0, digitCount: 0 });
    expect(result.counts[2].textDigitCount).toBe(0);
    expect(result.counts[3]).toEqual({ index: 3, headingDigitCount: 0, textDigitCount: 0, digitCount: 0 });
    expect(result.totalHeadingDigits).toBe(3);
    expect(result.totalTextDigits).toBe(0);
    expect(result.totalDigits).toBe(3);
  });

  it("returns ordered counts plus column-sum totals with no leaked text", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "A1", text: "22", extra: "secret" },
        { heading: "B333", text: "4", unknown: 9 }
      ],
      unknownTop: "nope"
    });
    expect(Object.keys(result).sort()).toEqual(["counts", "locale", "totalDigits", "totalHeadingDigits", "totalTextDigits"]);
    expect(result.counts.length).toBe(2);
    expect(Object.keys(result.counts[0]).sort()).toEqual(["digitCount", "headingDigitCount", "index", "textDigitCount"]);
    expect(result.counts[0]).toEqual({ index: 0, headingDigitCount: 1, textDigitCount: 2, digitCount: 3 });
    expect(result.counts[1]).toEqual({ index: 1, headingDigitCount: 3, textDigitCount: 1, digitCount: 4 });
    expect(result.totalHeadingDigits).toBe(4);
    expect(result.totalTextDigits).toBe(3);
    expect(result.totalDigits).toBe(7);
    const serialized = JSON.stringify(result);
    expect(serialized.includes("secret")).toBe(false);
    expect(serialized.includes("unknownTop")).toBe(false);
    expect(serialized.includes("A1")).toBe(false);
  });

  it("is deterministic and preserves input", () => {
    const payload = {
      locale: " EN-us ",
      sections: [
        { heading: "Room 101", text: "Call 555-0100!" },
        { heading: "Notes", text: "none" }
      ]
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(JSON.parse(before));
    expect(second).toEqual(first);
    expect(JSON.stringify(payload)).toBe(before);
    expect(first.locale).toBe("en-us");
    expect(first.counts[0]).toEqual({ index: 0, headingDigitCount: 3, textDigitCount: 7, digitCount: 10 });
  });
});
