import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_parenthesis_count_map.mjs";

function expectTypeMessage(fn, Type, message) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(Type);
    expect(err.message).toBe(message);
    return;
  }
  expect.unreachable("expected throw " + message);
}

describe("document parenthesis count map", () => {
  it("matches pt-br contract example", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Valor (alto) e (baixo)." },
        { heading: "Notas", text: "Sem marcas" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      entries: [
        { closeCount: 2, hasParenthesis: true, index: 0, isBalanced: true, openCount: 2 },
        { closeCount: 0, hasParenthesis: false, index: 1, isBalanced: true, openCount: 0 }
      ],
      parenthesisSectionCount: 1,
      totalCloseCount: 2,
      totalOpenCount: 2,
      unbalancedSectionCount: 0
    });
  });

  it("normalizes locale and reports unbalanced aside", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi (oops" }] });
    expect(out).toEqual({
      locale: "en-us",
      entries: [{ closeCount: 0, hasParenthesis: true, index: 0, isBalanced: false, openCount: 1 }],
      parenthesisSectionCount: 1,
      totalCloseCount: 0,
      totalOpenCount: 1,
      unbalancedSectionCount: 1
    });
  });

  it("throws DOCUMENT_OBJECT_REQUIRED without mutating", () => {
    expectTypeMessage(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature(undefined), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature("x"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
  });

  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    expectTypeMessage(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectTypeMessage(() => runFeature({ locale: "", sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectTypeMessage(() => runFeature({ locale: 7, sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectTypeMessage(() => runFeature({ sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });

  it("throws DOCUMENT_SECTIONS_INVALID for bad array", () => {
    expectTypeMessage(() => runFeature({ locale: "es", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: "no" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i++) many.push({ heading: "H", text: "T" });
    expectTypeMessage(() => runFeature({ locale: "es", sections: many }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });

  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "ok" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: 1, text: "ok" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: "A", text: 1 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: "a".repeat(201), text: "ok" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });

  it("throws DOCUMENT_TOO_LARGE on cumulative overflow", () => {
    const big = "a".repeat(180000);
    expectTypeMessage(() => runFeature({ locale: "pt-br", sections: [{ heading: "H", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });

  it("counts trimmed heading plus text and sums totals in order", () => {
    const out = runFeature({
      locale: "Es",
      sections: [
        { heading: "  (A) ", text: "x) (y" },
        { heading: "Plain", text: "none" },
        { heading: "Only close", text: "))" }
      ]
    });
    expect(out.locale).toBe("es");
    expect(out.entries.length).toBe(3);
    expect(out.entries[0]).toEqual({ index: 0, openCount: 2, closeCount: 2, hasParenthesis: true, isBalanced: true });
    expect(out.entries[1]).toEqual({ index: 1, openCount: 0, closeCount: 0, hasParenthesis: false, isBalanced: true });
    expect(out.entries[2]).toEqual({ index: 2, openCount: 0, closeCount: 2, hasParenthesis: true, isBalanced: false });
    expect(out.parenthesisSectionCount).toBe(2);
    expect(out.totalOpenCount).toBe(2);
    expect(out.totalCloseCount).toBe(4);
    expect(out.unbalancedSectionCount).toBe(1);
  });

  it("returns only locale and counts and stays deterministic without mutation", () => {
    const input = { locale: "  PT-BR ", sections: [{ heading: "H (1)", text: "T (2)" }], extra: "drop" };
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(a).toEqual(b);
    expect(Object.keys(a).sort()).toEqual(["entries", "locale", "parenthesisSectionCount", "totalCloseCount", "totalOpenCount", "unbalancedSectionCount"].sort());
    expect(Object.keys(a.entries[0]).sort()).toEqual(["closeCount", "hasParenthesis", "index", "isBalanced", "openCount"].sort());
    expect(JSON.stringify(a)).not.toContain("H (1)");
    expect(JSON.stringify(a)).not.toContain("drop");
  });
});
