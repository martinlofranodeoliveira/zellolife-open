import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_sentence_terminator_map.mjs";

describe("document sentence terminator map", () => {
  it("counts pt-br example", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto. Mais texto! Duvida?" },
        { heading: "Notas", text: "Sem terminador" }
      ]
    });
    expect(result).toEqual({
      locale: "pt-br",
      counts: [
        { index: 0, periodCount: 1, exclamationCount: 1, questionCount: 1, terminatorCount: 3 },
        { index: 1, periodCount: 0, exclamationCount: 0, questionCount: 0, terminatorCount: 0 }
      ],
      totalPeriodCount: 1,
      totalExclamationCount: 1,
      totalQuestionCount: 1,
      totalTerminatorCount: 3
    });
  });
  it("normalizes locale with case and whitespace", () => {
    const result = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "Hi... Really? Yes!" }]
    });
    expect(result.locale).toBe("en-us");
    expect(result.counts).toEqual([
      { index: 0, periodCount: 3, exclamationCount: 1, questionCount: 1, terminatorCount: 5 }
    ]);
    expect(result.totalPeriodCount).toBe(3);
    expect(result.totalExclamationCount).toBe(1);
    expect(result.totalQuestionCount).toBe(1);
    expect(result.totalTerminatorCount).toBe(5);
  });
  it("counts terminators in trimmed heading and text with sums", () => {
    const result = runFeature({
      locale: "es",
      sections: [
        { heading: "  Hola!  ", text: "Que? Si." },
        { heading: "Adios", text: "Fin" }
      ]
    });
    expect(result.counts.length).toBe(2);
    expect(result.counts[0]).toEqual({ index: 0, periodCount: 1, exclamationCount: 1, questionCount: 1, terminatorCount: 3 });
    expect(result.counts[1]).toEqual({ index: 1, periodCount: 0, exclamationCount: 0, questionCount: 0, terminatorCount: 0 });
    expect(result.totalPeriodCount).toBe(1);
    expect(result.totalExclamationCount).toBe(1);
    expect(result.totalQuestionCount).toBe(1);
    expect(result.totalTerminatorCount).toBe(3);
  });
  it("returns only allowed keys with integer numbers", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "A", text: "B. C! D? E" }]
    });
    const topKeys = Object.keys(result).sort();
    expect(topKeys).toEqual(["counts", "locale", "totalExclamationCount", "totalPeriodCount", "totalQuestionCount", "totalTerminatorCount"]);
    for (const entry of result.counts) {
      const entryKeys = Object.keys(entry).sort();
      expect(entryKeys).toEqual(["exclamationCount", "index", "periodCount", "questionCount", "terminatorCount"]);
      expect(Number.isInteger(entry.index)).toBe(true);
      expect(Number.isInteger(entry.periodCount)).toBe(true);
      expect(Number.isInteger(entry.exclamationCount)).toBe(true);
      expect(Number.isInteger(entry.questionCount)).toBe(true);
      expect(Number.isInteger(entry.terminatorCount)).toBe(true);
    }
    const asJson = JSON.stringify(result);
    expect(asJson.includes("A")).toBe(false);
    expect(asJson.includes("B. C!")).toBe(false);
  });
  it("is deterministic and preserves input", () => {
    const payload = {
      locale: "pt-br",
      sections: [{ heading: "Hi.", text: "Hello! How?" }]
    };
    const snapshot = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(JSON.stringify(payload)).toBe(snapshot);
  });
  it("validates document object, locale, sections and section content", () => {
    expect(() => runFeature(null)).toThrow(TypeError);
    expect(() => runFeature(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature([])).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "B" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 123 }] })).toThrow("DOCUMENT_SECTION_INVALID");
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 123 }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err instanceof TypeError).toBe(true);
    }
  });
  it("throws RangeError when cumulative size exceeds limit", () => {
    const big = "x".repeat(180001);
    try {
      runFeature({ locale: "es", sections: [{ heading: "A", text: big }] });
      expect(false).toBe(true);
    } catch (err) {
      expect(err instanceof RangeError).toBe(true);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
});
