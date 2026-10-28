import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_plaintext_budget_split.mjs";

function renderPlain(sections) {
  const parts = [];
  for (const s of sections) {
    parts.push(s.heading.trim() + "\n" + s.text);
  }
  return parts.join("\n\n");
}

function expectCode(fn, Ctor, code) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(Ctor);
    expect(err.message).toBe(code);
    return;
  }
  throw new Error("expected throw " + code);
}

describe("document plaintext budget split", () => {
  it("handles first example exactly", () => {
    const input = { locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }, { heading: "Notas", text: "Mais texto" }] };
    expect(runFeature(input)).toEqual({ headingTotal: 12, locale: "pt-br", sectionCount: 2, separatorTotal: 4, textTotal: 16, totalLength: 32 });
  });
  it("handles second example exactly", () => {
    const input = { locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] };
    expect(runFeature(input)).toEqual({ headingTotal: 5, locale: "en-us", sectionCount: 1, separatorTotal: 1, textTotal: 2, totalLength: 8 });
  });
  it("normalizes locale case and whitespace", () => {
    expect(runFeature({ locale: "  PT-BR ", sections: [{ heading: "A", text: "b" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "Es", sections: [{ heading: "A", text: "b" }] }).locale).toBe("es");
    expect(runFeature({ locale: "en-us", sections: [{ heading: "A", text: "b" }] }).locale).toBe("en-us");
  });
  it("rejects non-object payloads with DOCUMENT_OBJECT_REQUIRED", () => {
    expectCode(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectCode(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectCode(() => runFeature("x"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectCode(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectCode(() => runFeature(undefined), TypeError, "DOCUMENT_OBJECT_REQUIRED");
  });
  it("rejects bad locale with DOCUMENT_LOCALE_INVALID", () => {
    expectCode(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectCode(() => runFeature({ locale: "", sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectCode(() => runFeature({ locale: 1, sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectCode(() => runFeature({ sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });
  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    expectCode(() => runFeature({ locale: "es", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: "no" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectCode(() => runFeature({ locale: "es" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i = i + 1) many.push({ heading: "H", text: "t" });
    expectCode(() => runFeature({ locale: "es", sections: many }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });
  it("rejects bad heading and text with DOCUMENT_SECTION_INVALID", () => {
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: "", text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: 1, text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: "A", text: 1 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: "A" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: "x".repeat(201), text: "b" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });
  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(90001);
    expectCode(() => runFeature({ locale: "es", sections: [{ heading: "H", text: big }, { heading: "H", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });
  it("computes split totals and separator formula", () => {
    const r1 = runFeature({ locale: "es", sections: [{ heading: "AB", text: "cde" }] });
    expect(r1).toEqual({ headingTotal: 2, locale: "es", sectionCount: 1, separatorTotal: 1, textTotal: 3, totalLength: 6 });
    const r3 = runFeature({ locale: "es", sections: [{ heading: "A", text: "" }, { heading: "BB", text: "c" }, { heading: "  DDD  ", text: "ef" }] });
    expect(r3.headingTotal).toBe(6);
    expect(r3.textTotal).toBe(3);
    expect(r3.separatorTotal).toBe(7);
    expect(r3.totalLength).toBe(16);
    expect(r3.sectionCount).toBe(3);
  });
  it("matches renderPlainTextDocument length including edge whitespace and empty texts", () => {
    const cases = [
      [{ heading: "  Hi  ", text: "" }],
      [{ heading: "A", text: "x" }, { heading: "  B  ", text: "" }],
      [{ heading: "H1", text: "t1" }, { heading: "H2", text: "t2" }, { heading: "H3", text: "t3" }]
    ];
    for (const sections of cases) {
      const out = runFeature({ locale: "pt-br", sections });
      expect(out.totalLength).toBe(renderPlain(sections).length);
    }
    const sections100 = [];
    for (let i = 0; i < 100; i = i + 1) sections100.push({ heading: "H", text: "t" });
    const out100 = runFeature({ locale: "en-us", sections: sections100 });
    expect(out100.separatorTotal).toBe(298);
    expect(out100.totalLength).toBe(renderPlain(sections100).length);
  });
  it("returns only budgets and stays deterministic without mutating input", () => {
    const input = { locale: " EN-us ", extra: 1, sections: [{ heading: "  AB  ", text: "cd", extra2: true }] };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.keys(out).sort()).toEqual(["headingTotal", "locale", "sectionCount", "separatorTotal", "textTotal", "totalLength"]);
    expect(JSON.stringify(out).length).toBeLessThan(64 * 1024);
    for (const v of Object.values(out)) {
      if (typeof v === "number") expect(Number.isSafeInteger(v)).toBe(true);
    }
    const again = runFeature({ locale: " EN-us ", extra: 1, sections: [{ heading: "  AB  ", text: "cd", extra2: true }] });
    expect(again).toEqual(out);
  });
});
