import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_blank_section_index.mjs";

function checkThrow(fn, ErrorClass, code) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ErrorClass);
    expect(err.message).toBe(code);
    return;
  }
  throw new Error("expected throw " + code);
}

describe("document blank section index", () => {
  it("matches first contract example", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Exemplo", text: "Texto." },
        { heading: "Notas", text: "   " },
        { heading: "Fim", text: "" }
      ]
    });
    expect(out).toEqual({ locale: "pt-br", blankIndexes: [1, 2], blankCount: 2 });
  });

  it("matches second contract example with locale normalization", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", blankIndexes: [], blankCount: 0 });
  });

  it("normalizes case and whitespace for all locales", () => {
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "A", text: "x" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "  es\t", sections: [{ heading: "A", text: "x" }] }).locale).toBe("es");
    expect(runFeature({ locale: "En-Us", sections: [{ heading: "A", text: "x" }] }).locale).toBe("en-us");
  });

  it("throws DOCUMENT_OBJECT_REQUIRED for non-object input", () => {
    checkThrow(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature(undefined), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature("pt-br"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
  });

  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    checkThrow(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "x" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ locale: "", sections: [{ heading: "A", text: "x" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ locale: 123, sections: [{ heading: "A", text: "x" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ sections: [{ heading: "A", text: "x" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });

  it("throws DOCUMENT_SECTIONS_INVALID for bad array", () => {
    checkThrow(() => runFeature({ locale: "es", sections: "no" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i += 1) {
      many.push({ heading: "H", text: "x" });
    }
    checkThrow(() => runFeature({ locale: "es", sections: many }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });

  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    checkThrow(() => runFeature({ locale: "es", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "x" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "", text: "x" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: 5, text: "x" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "H", text: 5 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "es", sections: [{ heading: "H".repeat(201), text: "x" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });

  it("throws DOCUMENT_TOO_LARGE for cumulative overflow", () => {
    const big = "x".repeat(90000);
    checkThrow(() => runFeature({
      locale: "en-us",
      sections: [
        { heading: "A", text: big },
        { heading: "B", text: big },
        { heading: "C", text: big }
      ]
    }), RangeError, "DOCUMENT_TOO_LARGE");
  });

  it("marks blank exactly when trim length is zero and keeps ascending order", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "A", text: "" },
        { heading: "B", text: "hello" },
        { heading: "C", text: "   " },
        { heading: "D", text: " \t\n " },
        { heading: "E", text: " x " }
      ]
    });
    expect(out.blankIndexes).toEqual([0, 2, 3]);
    expect(out.blankCount).toBe(3);
    expect(out.blankCount).toBe(out.blankIndexes.length);
  });

  it("returns only locale, blankIndexes and blankCount without copying text", () => {
    const out = runFeature({
      locale: "es",
      sections: [{ heading: "SecretHeading", text: "SecretBody <b>&\"hi\"</b>" }]
    });
    expect(Object.keys(out).sort()).toEqual(["blankCount", "blankIndexes", "locale"]);
    const json = JSON.stringify(out);
    expect(json.includes("SecretHeading")).toBe(false);
    expect(json.includes("SecretBody")).toBe(false);
    expect(json.includes("<b>")).toBe(false);
  });

  it("does not mutate input and stays deterministic", () => {
    const input = {
      locale: " EN-US ",
      sections: [
        { heading: "A", text: "hi" },
        { heading: "B", text: "  " }
      ]
    };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.blankIndexes).not.toBe(first.blankIndexes);
  });
});
