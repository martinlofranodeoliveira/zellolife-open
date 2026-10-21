import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_length_map.mjs";

function checkThrows(fn, ErrorType, code) {
  let seen = null;
  try {
    fn();
  } catch (err) {
    seen = err;
  }
  expect(seen).not.toBeNull();
  expect(seen).toBeInstanceOf(ErrorType);
  expect(seen.message).toBe(code);
}

describe("document heading length map", () => {
  it("maps two sections with trimmed lengths and summed total", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      lengths: [
        { index: 0, headingLength: 7 },
        { index: 1, headingLength: 5 }
      ],
      totalHeadingChars: 12
    });
  });

  it("normalizes locale case and whitespace", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", lengths: [{ index: 0, headingLength: 5 }], totalHeadingChars: 5 });
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "A", text: "b" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "  Es ", sections: [{ heading: "A", text: "b" }] }).locale).toBe("es");
  });

  it("rejects invalid locale", () => {
    checkThrows(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrows(() => runFeature({ locale: "", sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrows(() => runFeature({ locale: 42, sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrows(() => runFeature({ sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });

  it("rejects non-object payload", () => {
    checkThrows(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrows(() => runFeature(undefined), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrows(() => runFeature("pt-br"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrows(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrows(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
  });

  it("rejects bad sections array", () => {
    checkThrows(() => runFeature({ locale: "pt-br", sections: "x" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    checkThrows(() => runFeature({ locale: "pt-br", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    checkThrows(() => runFeature({ locale: "pt-br" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i = i + 1) {
      many.push({ heading: "H", text: "t" });
    }
    checkThrows(() => runFeature({ locale: "pt-br", sections: many }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });

  it("rejects bad heading or text", () => {
    checkThrows(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrows(() => runFeature({ locale: "pt-br", sections: [{ heading: 42, text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrows(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 42 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrows(() => runFeature({ locale: "pt-br", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrows(() => runFeature({ locale: "pt-br", sections: [{ heading: "A" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });

  it("enforces original heading length before trim", () => {
    let longPadded = "";
    for (let i = 0; i < 100; i = i + 1) {
      longPadded = longPadded + " ";
    }
    let core = "";
    for (let i = 0; i < 201; i = i + 1) {
      core = core + "a";
    }
    checkThrows(() => runFeature({ locale: "pt-br", sections: [{ heading: core, text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expect(longPadded.length).toBe(100);
  });

  it("rejects cumulative overflow", () => {
    let big = "";
    for (let i = 0; i < 180001; i = i + 1) {
      big = big + "x";
    }
    checkThrows(() => runFeature({ locale: "es", sections: [{ heading: "A", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });

  it("does not mutate input", () => {
    const payload = { locale: " EN-US ", sections: [{ heading: "  Hi  ", text: "hello" }], extra: 1 };
    const before = JSON.stringify(payload);
    runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("measures trimmed UTF-16 units without copying text", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  A\uD83D\uDE00B  ", text: "secret-text-123" }] });
    expect(out.lengths).toEqual([{ index: 0, headingLength: 4 }]);
    expect(out.totalHeadingChars).toBe(4);
    expect(JSON.stringify(out)).not.toContain("secret-text-123");
  });

  it("outputs only allowed keys in input order", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "  Uno  ", text: "a", id: "s1" },
        { heading: "Dos", text: "b" },
        { heading: " Tres ", text: "c" }
      ]
    });
    expect(Object.keys(out).sort()).toEqual(["lengths", "locale", "totalHeadingChars"]);
    expect(out.lengths.length).toBe(3);
    expect(out.lengths.map((e) => e.index)).toEqual([0, 1, 2]);
    expect(out.lengths.map((e) => e.headingLength)).toEqual([3, 3, 4]);
    expect(out.totalHeadingChars).toBe(10);
    for (const entry of out.lengths) {
      expect(Object.keys(entry).sort()).toEqual(["headingLength", "index"]);
    }
    const flat = JSON.stringify(out);
    expect(flat).not.toContain("Uno");
    expect(flat).not.toContain("s1");
  });

  it("does not escape HTML and stays deterministic", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "<b>Hi</b>", text: "t" }] };
    const first = runFeature(payload);
    const second = runFeature({ locale: "pt-br", sections: [{ heading: "<b>Hi</b>", text: "t" }] });
    expect(first.lengths).toEqual([{ index: 0, headingLength: 9 }]);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.lengths).not.toBe(first.lengths);
  });
});
