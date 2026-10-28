import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_chunk_plan_map.mjs";

describe("document chunk plan map", () => {
  it("matches pt-br example with default size", () => {
    const result = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }] });
    expect(result).toEqual({ locale: "pt-br", maxCharacters: 4000, totalLength: 14, chunkCount: 1, chunkLengths: [14] });
  });
  it("normalizes locale and uses explicit size", () => {
    const result = runFeature({ locale: " EN-US ", maxCharacters: 256, sections: [{ heading: "Intro", text: "Hi" }] });
    expect(result).toEqual({ locale: "en-us", maxCharacters: 256, totalLength: 8, chunkCount: 1, chunkLengths: [8] });
  });
  it("rejects non-object payload", () => {
    const bad = [null, undefined, 42, "x", [], true];
    for (const value of bad) {
      try {
        runFeature(value);
        expect(false).toBe(true);
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });
  it("rejects invalid maxCharacters before locale checks", () => {
    const badSizes = ["4000", 255, 16385, 4000.5, NaN, Infinity, null, {}, true];
    for (const maxCharacters of badSizes) {
      try {
        runFeature({ locale: "bad-locale", sections: [{ heading: "H", text: "T" }], maxCharacters });
        expect(false).toBe(true);
      } catch (err) {
        expect(err).toBeInstanceOf(RangeError);
        expect(err.message).toBe("DOCUMENT_CHUNK_SIZE_INVALID");
      }
    }
  });
  it("accepts omitted or undefined size as 4000", () => {
    const a = runFeature({ locale: "es", sections: [{ heading: "H", text: "T" }] });
    expect(a.maxCharacters).toBe(4000);
    const b = runFeature({ locale: "es", sections: [{ heading: "H", text: "T" }], maxCharacters: undefined });
    expect(b.maxCharacters).toBe(4000);
  });
  it("validates locale with trim and lowercase", () => {
    expect(runFeature({ locale: "  PT-BR  ", sections: [{ heading: "H", text: "T" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "Es", sections: [{ heading: "H", text: "T" }] }).locale).toBe("es");
    try {
      runFeature({ locale: "fr", sections: [{ heading: "H", text: "T" }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
    try {
      runFeature({ locale: 123, sections: [{ heading: "H", text: "T" }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
  });
  it("validates sections array shape", () => {
    for (const sections of [null, {}, "x", []]) {
      try {
        runFeature({ locale: "es", sections });
        expect(false).toBe(true);
      } catch (err) {
        expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
    }
  });
  it("validates heading and text", () => {
    try {
      runFeature({ locale: "es", sections: [{ heading: "   ", text: "T" }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "H", text: 123 }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "x".repeat(201), text: "T" }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });
  it("rejects cumulative overflow", () => {
    const big = "x".repeat(90000);
    try {
      runFeature({ locale: "es", sections: [{ heading: "H", text: big }, { heading: "H", text: big }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
  it("builds plain text with trimmed heading and double LF", () => {
    const result = runFeature({ locale: "es", sections: [{ heading: "  A  ", text: "one" }, { heading: "B", text: "two" }] });
    expect(result.totalLength).toBe(12);
    expect(result.chunkCount).toBe(1);
    expect(result.chunkLengths).toEqual([12]);
  });
  it("partitions greedily and sums to total", () => {
    const longText = "x".repeat(300);
    const result = runFeature({ locale: "es", maxCharacters: 256, sections: [{ heading: "A", text: longText }] });
    expect(result.totalLength).toBe(302);
    expect(result.chunkLengths).toEqual([256, 46]);
    expect(result.chunkCount).toBe(2);
    let sum = 0;
    for (const n of result.chunkLengths) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n >= 1).toBe(true);
      expect(n <= 256).toBe(true);
      sum = sum + n;
    }
    expect(sum).toBe(302);
  });
  it("never splits a surrogate pair", () => {
    const prefixText = "a".repeat(253) + "\uD83D\uDE00" + "b".repeat(10);
    const result = runFeature({ locale: "es", maxCharacters: 256, sections: [{ heading: "H", text: prefixText }] });
    expect(result.totalLength).toBe(267);
    expect(result.chunkLengths).toEqual([255, 12]);
  });
  it("preserves isolated surrogates and returns only allowed keys", () => {
    const input = { locale: "es", sections: [{ heading: "H", text: "a\uD800b" }] };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(result.totalLength).toBe(5);
    expect(Object.keys(result).sort()).toEqual(["chunkCount", "chunkLengths", "locale", "maxCharacters", "totalLength"]);
    const again = runFeature({ locale: "es", sections: [{ heading: "H", text: "a\uD800b" }] });
    expect(again).toEqual(result);
  });
});
