import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_text_length_tier_map.mjs";

describe("document text length tier map", () => {
  it("rejects non-plain-object payload without mutation", () => {
    const badValues = [null, undefined, 42, "pt-br", [], [{ locale: "pt-br" }]];
    for (const value of badValues) {
      let thrown = null;
      try {
        runFeature(value);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown.message).toBe("DOCUMENT_OBJECT_REQUIRED");
    }
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "hi" }] };
    const snapshot = JSON.stringify(payload);
    runFeature(payload);
    expect(JSON.stringify(payload)).toBe(snapshot);
  });

  it("rejects unknown or non-string locale", () => {
    for (const locale of ["fr-fr", "", "   ", "pt", 123, null, undefined]) {
      let thrown = null;
      try {
        runFeature({ locale: locale, sections: [{ heading: "A", text: "hi" }] });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
  });

  it("normalizes locale with trim and lowercase", () => {
    expect(runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] })).toEqual({
      locale: "en-us",
      entries: [{ index: 0, textLength: 2, tier: "short" }],
      tierCounts: { short: 1, medium: 0, large: 0 }
    });
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "A", text: "x" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "  Es ", sections: [{ heading: "A", text: "x" }] }).locale).toBe("es");
  });

  it("rejects bad sections array shape", () => {
    const cases = [
      { locale: "pt-br", sections: "nope" },
      { locale: "pt-br", sections: [] },
      { locale: "pt-br" }
    ];
    for (const payload of cases) {
      let thrown = null;
      try {
        runFeature(payload);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    const many = [];
    for (let n = 0; n < 101; n = n + 1) {
      many.push({ heading: "A", text: "x" });
    }
    let thrownMany = null;
    try {
      runFeature({ locale: "pt-br", sections: many });
    } catch (err) {
      thrownMany = err;
    }
    expect(thrownMany).toBeInstanceOf(TypeError);
    expect(thrownMany.message).toBe("DOCUMENT_SECTIONS_INVALID");
  });

  it("rejects bad heading or text", () => {
    const badSections = [
      [{ heading: "   ", text: "hi" }],
      [{ heading: "", text: "hi" }],
      [{ heading: 42, text: "hi" }],
      [{ heading: "A", text: 42 }],
      [{ heading: "A", text: null }],
      [["oops"]],
      [null]
    ];
    for (const sections of badSections) {
      let thrown = null;
      try {
        runFeature({ locale: "pt-br", sections: sections });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    let longHeading = "";
    for (let n = 0; n < 201; n = n + 1) {
      longHeading = longHeading + "a";
    }
    let thrownLong = null;
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: longHeading, text: "hi" }] });
    } catch (err) {
      thrownLong = err;
    }
    expect(thrownLong).toBeInstanceOf(TypeError);
    expect(thrownLong.message).toBe("DOCUMENT_SECTION_INVALID");
  });

  it("rejects cumulative length over 180000", () => {
    let big = "";
    for (let n = 0; n < 90000; n = n + 1) {
      big = big + "a";
    }
    let thrown = null;
    try {
      runFeature({
        locale: "pt-br",
        sections: [
          { heading: "a", text: big },
          { heading: "b", text: big }
        ]
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(RangeError);
    expect(thrown.message).toBe("DOCUMENT_TOO_LARGE");
  });

  it("maps example payload", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "  Exemplo  ", text: "Texto." }, { heading: "Notas", text: "Mais texto" }]
    });
    expect(result).toEqual({
      locale: "pt-br",
      entries: [
        { index: 0, textLength: 6, tier: "short" },
        { index: 1, textLength: 10, tier: "short" }
      ],
      tierCounts: { short: 2, medium: 0, large: 0 }
    });
  });

  it("applies tier boundaries and counts", () => {
    const make = (len) => {
      let s = "";
      for (let n = 0; n < len; n = n + 1) {
        s = s + "x";
      }
      return s;
    };
    const result = runFeature({
      locale: "en-us",
      sections: [
        { heading: "A", text: make(499) },
        { heading: "B", text: make(500) },
        { heading: "C", text: make(1999) },
        { heading: "D", text: make(2000) }
      ]
    });
    expect(result.entries).toEqual([
      { index: 0, textLength: 499, tier: "short" },
      { index: 1, textLength: 500, tier: "medium" },
      { index: 2, textLength: 1999, tier: "medium" },
      { index: 3, textLength: 2000, tier: "large" }
    ]);
    expect(result.tierCounts).toEqual({ short: 1, medium: 2, large: 1 });
    expect(result.tierCounts.short + result.tierCounts.medium + result.tierCounts.large).toBe(result.entries.length);
  });

  it("exposes only lengths and tiers and stays deterministic", () => {
    const payload = {
      locale: "es",
      sections: [{ heading: "Secreto", text: "hello", extra: "nope" }],
      extraTop: 123
    };
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(first).toEqual(second);
    expect(Object.keys(first).sort()).toEqual(["entries", "locale", "tierCounts"]);
    expect(Object.keys(first.entries[0]).sort()).toEqual(["index", "textLength", "tier"]);
    expect(JSON.stringify(first)).not.toContain("Secreto");
    expect(JSON.stringify(first)).not.toContain("hello");
    expect(JSON.stringify(first)).not.toContain("extraTop");
  });
});
