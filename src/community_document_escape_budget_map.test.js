import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_escape_budget_map.mjs";

function assertThrowsWithCode(fn, ErrorClass, code) {
  let err = null;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).not.toBe(null);
  expect(err instanceof ErrorClass).toBe(true);
  expect(err.message).toBe(code);
}

describe("document_escape_budget_map", () => {
  it("rejects non-object payload with DOCUMENT_OBJECT_REQUIRED and preserves input", () => {
    const badValues = [null, undefined, 42, "doc", true, []];
    for (const v of badValues) {
      assertThrowsWithCode(() => runFeature(v), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    }
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "b" }] };
    const snapshot = JSON.parse(JSON.stringify(payload));
    assertThrowsWithCode(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expect(payload).toEqual(snapshot);
    const out = runFeature(payload);
    expect(payload).toEqual(snapshot);
    expect(out.locale).toBe("pt-br");
  });

  it("normalizes locale case and whitespace and rejects unknown locales", () => {
    const ok = [
      ["pt-br", "pt-br"],
      [" PT-BR ", "pt-br"],
      ["En-Us", "en-us"],
      [" EN-US ", "en-us"],
      ["  es  ", "es"],
      ["ES", "es"]
    ];
    for (const pair of ok) {
      const out = runFeature({ locale: pair[0], sections: [{ heading: "A", text: "b" }] });
      expect(out.locale).toBe(pair[1]);
    }
    assertThrowsWithCode(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "", sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: 42, sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    assertThrowsWithCode(() => runFeature({ sections: [{ heading: "A", text: "b" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });

  it("rejects bad sections, heading, text and cumulative overflow", () => {
    assertThrowsWithCode(() => runFeature({ locale: "pt-br" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: "no" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i++) {
      many.push({ heading: "h", text: "t" });
    }
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: many }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "t" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [{ heading: 42, text: "t" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 42 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    let longHeading = "";
    for (let i = 0; i < 201; i++) {
      longHeading = longHeading + "a";
    }
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [{ heading: longHeading, text: "t" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    let big = "";
    for (let i = 0; i < 180000; i++) {
      big = big + "x";
    }
    assertThrowsWithCode(() => runFeature({ locale: "pt-br", sections: [{ heading: "a", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });

  it("counts trimmed A&B plus x<y>z as 3 and 10 with matching totals", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "  A&B  ", text: "x<y>z" }] };
    const snapshot = JSON.parse(JSON.stringify(payload));
    const out = runFeature(payload);
    expect(payload).toEqual(snapshot);
    expect(out).toEqual({
      locale: "pt-br",
      budgets: [{ index: 0, escapeCount: 3, escapedExtraChars: 10 }],
      totalEscapeCount: 3,
      totalEscapedExtraChars: 10
    });
  });

  it("counts quoted ampersand text as 5 and 22 with normalized en-us", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi \"there\" & 'you'" }] });
    expect(out).toEqual({
      locale: "en-us",
      budgets: [{ index: 0, escapeCount: 5, escapedExtraChars: 22 }],
      totalEscapeCount: 5,
      totalEscapedExtraChars: 22
    });
  });

  it("exposes only locale, budgets and totals with ordered indexes and sums", () => {
    const out = runFeature({
      locale: "es",
      extra: "ignore-me",
      sections: [
        { heading: "A&B", text: "x" },
        { heading: "plain", text: "<>\"'&\nend" }
      ]
    });
    expect(Object.keys(out).sort()).toEqual(["budgets", "locale", "totalEscapeCount", "totalEscapedExtraChars"].sort());
    expect(out.locale).toBe("es");
    expect(out.budgets.length).toBe(2);
    expect(out.budgets[0].index).toBe(0);
    expect(out.budgets[1].index).toBe(1);
    for (const entry of out.budgets) {
      expect(Object.keys(entry).sort()).toEqual(["escapeCount", "escapedExtraChars", "index"].sort());
    }
    let sumCount = 0;
    let sumExtra = 0;
    for (const entry of out.budgets) {
      sumCount = sumCount + entry.escapeCount;
      sumExtra = sumExtra + entry.escapedExtraChars;
    }
    expect(out.totalEscapeCount).toBe(sumCount);
    expect(out.totalEscapedExtraChars).toBe(sumExtra);
    expect(out.totalEscapeCount).toBe(6);
    expect(out.totalEscapedExtraChars).toBe(23);
    const asJson = JSON.stringify(out);
    expect(asJson.includes("A&B")).toBe(false);
    expect(asJson.includes("ignore-me")).toBe(false);
  });
});
