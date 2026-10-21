import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_word_count_map.mjs";

describe("document word count map", () => {
  it("matches pt-br example with ordered counts and totals", () => {
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    };
    const snapshot = JSON.stringify(payload);
    const result = runFeature(payload);
    expect(result).toEqual({
      locale: "pt-br",
      counts: [
        { index: 0, headingWordCount: 1, textWordCount: 1, wordCount: 2 },
        { index: 1, headingWordCount: 1, textWordCount: 2, wordCount: 3 }
      ],
      totalHeadingWords: 2,
      totalTextWords: 3,
      totalWords: 5
    });
    expect(JSON.stringify(payload)).toBe(snapshot);
  });

  it("normalizes locale case and whitespace while preserving input", () => {
    const payload = {
      locale: " EN-US ",
      sections: [{ heading: "  Case Notes  ", text: "hello   world wide" }]
    };
    const result = runFeature(payload);
    expect(result.locale).toBe("en-us");
    expect(result.counts).toEqual([
      { index: 0, headingWordCount: 2, textWordCount: 3, wordCount: 5 }
    ]);
    expect(result.totalHeadingWords).toBe(2);
    expect(result.totalTextWords).toBe(3);
    expect(result.totalWords).toBe(5);
    expect(payload.locale).toBe(" EN-US ");
  });

  it("counts maximal runs split only by SPACE LF CR TAB", () => {
    const payload = {
      locale: "es",
      sections: [
        { heading: "Hola", text: "a\tb\nc\rd e" },
        { heading: "  hello   world  ", text: "one  two" }
      ]
    };
    const result = runFeature(payload);
    expect(result.counts[0].textWordCount).toBe(5);
    expect(result.counts[1].headingWordCount).toBe(2);
    expect(result.counts[1].textWordCount).toBe(2);
    const nbsp = runFeature({ locale: "es", sections: [{ heading: "Hola", text: "a\u00A0b" }] });
    expect(nbsp.counts[0].textWordCount).toBe(1);
    const vt = runFeature({ locale: "es", sections: [{ heading: "Hola", text: "a\u000Bb" }] });
    expect(vt.counts[0].textWordCount).toBe(1);
    const blank = runFeature({ locale: "es", sections: [{ heading: "Hi", text: "  \t\n\r   " }] });
    expect(blank.counts[0].textWordCount).toBe(0);
    expect(blank.counts[0].wordCount).toBe(1);
    const emptyText = runFeature({ locale: "es", sections: [{ heading: "Hi", text: "" }] });
    expect(emptyText.counts[0].textWordCount).toBe(0);
  });

  it("returns only locale and numbers in order with column sums", () => {
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "SecretHeadingXYZ", text: "SecretTextABC def", extra: "ignore-me", id: "999" },
        { heading: "Outro", text: "x" }
      ]
    };
    const result = runFeature(payload);
    expect(Object.keys(result).sort()).toEqual(["counts", "locale", "totalHeadingWords", "totalTextWords", "totalWords"]);
    expect(result.counts.length).toBe(2);
    for (const entry of result.counts) {
      expect(Object.keys(entry).sort()).toEqual(["headingWordCount", "index", "textWordCount", "wordCount"]);
    }
    expect(result.counts[0].index).toBe(0);
    expect(result.counts[1].index).toBe(1);
    let sh = 0;
    let st = 0;
    let sw = 0;
    for (const entry of result.counts) {
      expect(entry.wordCount).toBe(entry.headingWordCount + entry.textWordCount);
      sh = sh + entry.headingWordCount;
      st = st + entry.textWordCount;
      sw = sw + entry.wordCount;
    }
    expect(result.totalHeadingWords).toBe(sh);
    expect(result.totalTextWords).toBe(st);
    expect(result.totalWords).toBe(sw);
    const dumped = JSON.stringify(result);
    expect(dumped.includes("SecretHeadingXYZ")).toBe(false);
    expect(dumped.includes("SecretTextABC")).toBe(false);
    expect(dumped.includes("ignore-me")).toBe(false);
  });

  it("rejects malformed payloads with exact codes without mutating input", () => {
    expect(() => runFeature(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature("x")).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature([])).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature(undefined)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    try {
      runFeature(null);
    } catch (err) {
      expect(err instanceof TypeError).toBe(true);
    }
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "Hi", text: "hello" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: 123, sections: [{ heading: "Hi", text: "hello" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "nope" })).toThrow("DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i = i + 1) {
      many.push({ heading: "Hi", text: "hello" });
    }
    expect(() => runFeature({ locale: "pt-br", sections: many })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "hello" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: 123, text: "hello" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "Hi", text: 123 }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "x".repeat(201), text: "hello" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "Hi" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [null] })).toThrow("DOCUMENT_SECTION_INVALID");
    const good = { locale: "pt-br", sections: [{ heading: "Hi", text: "hello" }] };
    const snap = JSON.stringify(good);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "hi" }] });
    } catch {
    }
    expect(JSON.stringify(good)).toBe(snap);
  });

  it("rejects cumulative overflow with RangeError", () => {
    const bigText = "x".repeat(180000);
    const payload = { locale: "en-us", sections: [{ heading: "a", text: bigText }] };
    let caught = null;
    try {
      runFeature(payload);
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof RangeError).toBe(true);
    expect(String(caught && caught.message).includes("DOCUMENT_TOO_LARGE")).toBe(true);
  });

  it("is deterministic and pure", () => {
    const payload = { locale: "es", sections: [{ heading: " Hola mundo ", text: "foo  bar\nbaz" }] };
    const snap = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(second === first).toBe(false);
    expect(JSON.stringify(payload)).toBe(snap);
    expect(first.totalWords).toBe(first.totalHeadingWords + first.totalTextWords);
  });
});
