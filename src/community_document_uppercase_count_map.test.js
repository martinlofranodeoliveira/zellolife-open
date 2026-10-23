import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_uppercase_count_map.mjs";

describe("validation", () => {
  it("rejects non-object with DOCUMENT_OBJECT_REQUIRED", () => {
    const badValues = [null, undefined, 42, "x", true];
    for (const v of badValues) {
      try {
        runFeature(v);
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
    try {
      runFeature([]);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
    }
  });
  it("rejects bad locale with DOCUMENT_LOCALE_INVALID", () => {
    const bases = [{ heading: "Ok", text: "ok" }];
    const badLocales = ["fr", "", "  ", "pt", 123, null, undefined];
    for (const locale of badLocales) {
      try {
        runFeature({ locale, sections: bases });
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });
  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    try {
      runFeature({ locale: "es", sections: [] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: "nope" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    const many = [];
    for (let i = 0; i < 101; i = i + 1) {
      many.push({ heading: "H", text: "t" });
    }
    try {
      runFeature({ locale: "es", sections: many });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });
  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    try {
      runFeature({ locale: "es", sections: [{ heading: "   ", text: "ok" }] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: 123, text: "ok" }] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "Ok", text: 5 }] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [null] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    let longHeading = "";
    for (let i = 0; i < 201; i = i + 1) {
      longHeading = longHeading + "a";
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: longHeading, text: "ok" }] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });
  it("rejects overflow with DOCUMENT_TOO_LARGE and does not mutate input", () => {
    let big = "";
    for (let i = 0; i < 180000; i = i + 1) {
      big = big + "a";
    }
    const payload = { locale: "es", sections: [{ heading: "A", text: big }] };
    const before = JSON.stringify(payload);
    try {
      runFeature(payload);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
    expect(JSON.stringify(payload)).toBe(before);
  });
});

describe("locale normalization and order", () => {
  it("trims and lowercases locale", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out.locale).toBe("en-us");
    expect(out.entries).toEqual([{ index: 0, uppercaseCount: 2, hasUppercase: true }]);
  });
  it("preserves section order with zero-based index", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto ABC." },
        { heading: "Notas", text: "sem caixa alta" }
      ]
    });
    expect(out.locale).toBe("pt-br");
    expect(out.entries.length).toBe(2);
    expect(out.entries[0].index).toBe(0);
    expect(out.entries[1].index).toBe(1);
    expect(out.entries[0].uppercaseCount).toBe(5);
    expect(out.entries[1].uppercaseCount).toBe(1);
  });
});

describe("uppercase counts and totals", () => {
  it("counts A-Z in trimmed heading plus text", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "abc", text: "def" }] });
    expect(out.entries[0]).toEqual({ index: 0, uppercaseCount: 0, hasUppercase: false });
    expect(out.uppercaseSectionCount).toBe(0);
    expect(out.totalUppercaseCount).toBe(0);
  });
  it("sets hasUppercase true iff count greater than zero and sums totals", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "ABC", text: "aB cD" },
        { heading: "lower", text: "lower" },
        { heading: "Z", text: "" }
      ]
    });
    expect(out.entries[0].uppercaseCount).toBe(5);
    expect(out.entries[0].hasUppercase).toBe(true);
    expect(out.entries[1].hasUppercase).toBe(false);
    expect(out.entries[2].uppercaseCount).toBe(1);
    expect(out.uppercaseSectionCount).toBe(2);
    expect(out.totalUppercaseCount).toBe(6);
  });
  it("ignores non A-Z characters", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "Ol\u00e1 ABC", text: "\u00c7\u00c3O 123!?" }] });
    expect(out.entries[0].uppercaseCount).toBe(5);
    expect(out.entries[0].hasUppercase).toBe(true);
  });
});

describe("output shape and purity", () => {
  it("contains only allowed keys", () => {
    const out = runFeature({
      locale: "es",
      sections: [{ heading: "Hi", text: "There", extra: "nope" }],
      extraTop: 1
    });
    expect(Object.keys(out).sort()).toEqual(["entries", "locale", "totalUppercaseCount", "uppercaseSectionCount"].sort());
    for (const e of out.entries) {
      expect(Object.keys(e).sort()).toEqual(["hasUppercase", "index", "uppercaseCount"].sort());
    }
    expect(JSON.stringify(out)).not.toContain("There");
    expect(JSON.stringify(out)).not.toContain("Hi");
  });
  it("is deterministic and preserves input", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "Nota", text: "ABC abc" }] };
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    expect(a).toEqual(b);
    expect(JSON.stringify(payload)).toBe(before);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
