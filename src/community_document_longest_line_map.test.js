import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_longest_line_map.mjs";

function expectThrow(fn, ErrorClass, code) {
  let caught = null;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).not.toBe(null);
  expect(caught instanceof ErrorClass).toBe(true);
  expect(caught.message).toBe(code);
}

describe("document longest-line map", () => {
  it("matches first contract example", () => {
    const input = {
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    const result = runFeature(input);
    expect(result).toEqual({
      locale: "pt-br",
      sectionCount: 2,
      longestOverall: 10,
      lines: [
        { index: 0, longestLine: 7, lineCount: 2 },
        { index: 1, longestLine: 10, lineCount: 2 }
      ]
    });
    expect(input).toEqual(snapshot);
  });

  it("matches CRLF example with locale normalization", () => {
    const input = { locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi\r\nHello" }] };
    const result = runFeature(input);
    expect(result).toEqual({
      locale: "en-us",
      sectionCount: 1,
      longestOverall: 5,
      lines: [{ index: 0, longestLine: 5, lineCount: 3 }]
    });
    expect(input.locale).toBe(" EN-US ");
  });

  it("rejects non-object payloads without mutating input", () => {
    expectThrow(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectThrow(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectThrow(() => runFeature("pt-br"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectThrow(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectThrow(() => runFeature(undefined), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    const input = { locale: "pt-br", sections: [{ heading: "A", text: "B" }] };
    const snapshot = JSON.parse(JSON.stringify(input));
    runFeature(input);
    expect(input).toEqual(snapshot);
  });

  it("normalizes locale case and whitespace", () => {
    expect(runFeature({ locale: "  PT-BR  ", sections: [{ heading: "A", text: "B" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "Es", sections: [{ heading: "A", text: "B" }] }).locale).toBe("es");
    expect(runFeature({ locale: "en-us", sections: [{ heading: "A", text: "B" }] }).locale).toBe("en-us");
  });

  it("rejects bad locale and preserves input", () => {
    const input = { locale: "fr", sections: [{ heading: "A", text: "B" }] };
    const snapshot = JSON.parse(JSON.stringify(input));
    expectThrow(() => runFeature(input), TypeError, "DOCUMENT_LOCALE_INVALID");
    expect(input).toEqual(snapshot);
    expectThrow(() => runFeature({ locale: 42, sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectThrow(() => runFeature({ sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });

  it("rejects bad sections array shape", () => {
    expectThrow(() => runFeature({ locale: "es", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectThrow(() => runFeature({ locale: "es", sections: "nope" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectThrow(() => runFeature({ locale: "es" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i += 1) {
      many.push({ heading: "H", text: "T" });
    }
    expectThrow(() => runFeature({ locale: "es", sections: many }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });

  it("rejects bad heading and text", () => {
    expectThrow(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectThrow(() => runFeature({ locale: "es", sections: [{ heading: "H", text: 42 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectThrow(() => runFeature({ locale: "es", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectThrow(() => runFeature({ locale: "es", sections: [{ heading: "H" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    let longHeading = "";
    for (let i = 0; i < 201; i += 1) {
      longHeading += "a";
    }
    expectThrow(() => runFeature({ locale: "es", sections: [{ heading: longHeading, text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });

  it("rejects cumulative overflow with RangeError", () => {
    let big = "";
    for (let i = 0; i < 180000; i += 1) {
      big += "x";
    }
    expectThrow(() => runFeature({ locale: "pt-br", sections: [{ heading: "H", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });

  it("trims headings for measurement and splits on LF", () => {
    const result = runFeature({ locale: "pt-br", sections: [{ heading: "  Hi  ", text: "a\nb" }] });
    expect(result.lines).toEqual([{ index: 0, longestLine: 2, lineCount: 3 }]);
    expect(result.longestOverall).toBe(2);
  });

  it("strips one trailing CR per line and counts raw split length", () => {
    const result = runFeature({ locale: "es", sections: [{ heading: "A", text: "Hi\r\nHello\r" }] });
    expect(result.lines[0].lineCount).toBe(3);
    expect(result.lines[0].longestLine).toBe(5);
    const lone = runFeature({ locale: "es", sections: [{ heading: "H", text: "ab\rc" }] });
    expect(lone.lines[0].lineCount).toBe(2);
    expect(lone.lines[0].longestLine).toBe(4);
  });

  it("returns only allowed keys and never copies text", () => {
    const input = {
      locale: "pt-br",
      extra: "secret",
      sections: [{ heading: "SecretHeading", text: "SecretBodyText", extraField: "nope", id: "123" }]
    };
    const result = runFeature(input);
    expect(Object.keys(result).sort()).toEqual(["lines", "locale", "longestOverall", "sectionCount"]);
    expect(Object.keys(result.lines[0]).sort()).toEqual(["index", "lineCount", "longestLine"]);
    expect(result.sectionCount).toBe(1);
    expect(result.lines[0].index).toBe(0);
    const dumped = JSON.stringify(result);
    expect(dumped.includes("SecretHeading")).toBe(false);
    expect(dumped.includes("SecretBodyText")).toBe(false);
    expect(dumped.includes("secret")).toBe(false);
    expect(dumped.includes("123")).toBe(false);
  });

  it("is deterministic and longestOverall equals max", () => {
    const input = {
      locale: "es",
      sections: [
        { heading: "Short", text: "x" },
        { heading: "LongerHeading", text: "y\nzzzz" }
      ]
    };
    const first = runFeature(input);
    const second = runFeature(input);
    expect(second).toEqual(first);
    let expectedMax = 0;
    for (const entry of first.lines) {
      if (entry.longestLine > expectedMax) {
        expectedMax = entry.longestLine;
      }
    }
    expect(first.longestOverall).toBe(expectedMax);
    expect(first.lines.length).toBe(2);
    expect(first.lines[0].index).toBe(0);
    expect(first.lines[1].index).toBe(1);
  });
});
