import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_text_edge_whitespace_flag_map.mjs";

describe("document text edge whitespace flag map", () => {
  it("maps pt-br example with leading, trailing and clean entries", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Exemplo", text: " hello" },
        { heading: "Notas", text: "mundo " },
        { heading: "Limpo", text: "ok" }
      ]
    });
    expect(result).toEqual({
      locale: "pt-br",
      entries: [
        { index: 0, hasLeadingWhitespace: true, hasTrailingWhitespace: false, hasEdgeWhitespace: true },
        { index: 1, hasLeadingWhitespace: false, hasTrailingWhitespace: true, hasEdgeWhitespace: true },
        { index: 2, hasLeadingWhitespace: false, hasTrailingWhitespace: false, hasEdgeWhitespace: false }
      ],
      leadingWhitespaceSectionCount: 1,
      trailingWhitespaceSectionCount: 1,
      edgeWhitespaceSectionCount: 2
    });
  });
  it("normalizes locale trim and case", () => {
    const result = runFeature({
      locale: " EN-US ",
      sections: [
        { heading: "Intro", text: "\tHi" },
        { heading: "Body", text: "Bye\n" }
      ]
    });
    expect(result.locale).toBe("en-us");
    expect(result.entries).toEqual([
      { index: 0, hasLeadingWhitespace: true, hasTrailingWhitespace: false, hasEdgeWhitespace: true },
      { index: 1, hasLeadingWhitespace: false, hasTrailingWhitespace: true, hasEdgeWhitespace: true }
    ]);
    expect(result.leadingWhitespaceSectionCount).toBe(1);
    expect(result.trailingWhitespaceSectionCount).toBe(1);
    expect(result.edgeWhitespaceSectionCount).toBe(2);
  });
  it("detects only SPACE TAB LF CR on both edges", () => {
    const result = runFeature({
      locale: "es",
      sections: [
        { heading: "A", text: "" },
        { heading: "B", text: " " },
        { heading: "C", text: "\t" },
        { heading: "D", text: "\n" },
        { heading: "E", text: "\r" },
        { heading: "F", text: "x" },
        { heading: "G", text: "\u00A0hi" },
        { heading: "H", text: "hi\u00A0" },
        { heading: "I", text: "\u000Bhi\u000B" },
        { heading: "J", text: " \t\n\r " }
      ]
    });
    expect(result.entries[0]).toEqual({ index: 0, hasLeadingWhitespace: false, hasTrailingWhitespace: false, hasEdgeWhitespace: false });
    expect(result.entries[1]).toEqual({ index: 1, hasLeadingWhitespace: true, hasTrailingWhitespace: true, hasEdgeWhitespace: true });
    expect(result.entries[2]).toEqual({ index: 2, hasLeadingWhitespace: true, hasTrailingWhitespace: true, hasEdgeWhitespace: true });
    expect(result.entries[5]).toEqual({ index: 5, hasLeadingWhitespace: false, hasTrailingWhitespace: false, hasEdgeWhitespace: false });
    expect(result.entries[6].hasLeadingWhitespace).toBe(false);
    expect(result.entries[7].hasTrailingWhitespace).toBe(false);
    expect(result.entries[8]).toEqual({ index: 8, hasLeadingWhitespace: false, hasTrailingWhitespace: false, hasEdgeWhitespace: false });
    expect(result.entries[9]).toEqual({ index: 9, hasLeadingWhitespace: true, hasTrailingWhitespace: true, hasEdgeWhitespace: true });
    let leading = 0;
    let trailing = 0;
    let edge = 0;
    for (const entry of result.entries) {
      if (entry.hasLeadingWhitespace === true) {
        leading = leading + 1;
      }
      if (entry.hasTrailingWhitespace === true) {
        trailing = trailing + 1;
      }
      if (entry.hasEdgeWhitespace === true) {
        edge = edge + 1;
      }
    }
    expect(result.leadingWhitespaceSectionCount).toBe(leading);
    expect(result.trailingWhitespaceSectionCount).toBe(trailing);
    expect(result.edgeWhitespaceSectionCount).toBe(edge);
  });
  it("rejects non-object payloads with DOCUMENT_OBJECT_REQUIRED", () => {
    expect(() => runFeature(null)).toThrowError("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature("x")).toThrowError("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature([])).toThrowError("DOCUMENT_OBJECT_REQUIRED");
    try {
      runFeature(null);
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
    }
  });
  it("rejects bad locale, sections and section shapes with documented codes", () => {
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "x" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: 42, sections: [{ heading: "A", text: "x" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "nope" })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "x" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 7 }] })).toThrowError("DOCUMENT_SECTION_INVALID");
  });
  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(90000);
    expect(() => runFeature({
      locale: "pt-br",
      sections: [
        { heading: "A", text: big },
        { heading: "B", text: big }
      ]
    })).toThrowError("DOCUMENT_TOO_LARGE");
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] });
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError);
    }
  });
  it("preserves input and exposes only flags and counts", () => {
    const payload = {
      locale: "  PT-BR  ",
      sections: [{ heading: "Exemplo", text: " hello ", extra: "keep" }],
      extraTop: 1
    };
    const before = JSON.stringify(payload);
    const result = runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
    expect(result.locale).toBe("pt-br");
    expect(Object.keys(result).sort()).toEqual(["edgeWhitespaceSectionCount", "entries", "leadingWhitespaceSectionCount", "locale", "trailingWhitespaceSectionCount"]);
    expect(result.entries.length).toBe(1);
    expect(JSON.stringify(result)).not.toContain("hello");
    expect(JSON.stringify(result)).not.toContain("Exemplo");
  });
  it("is deterministic for mixed whitespace corpus", () => {
    const payload = {
      locale: "en-us",
      sections: [
        { heading: "One", text: "\rstart" },
        { heading: "Two", text: "end\t" },
        { heading: "Three", text: "mid" }
      ]
    };
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(first.entries.map((entry) => entry.index)).toEqual([0, 1, 2]);
  });
});
