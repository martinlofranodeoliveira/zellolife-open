import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_outline_index.mjs";

describe("document outline index", () => {
  it("builds ordered outline for pt-br example", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      outline: [
        { index: 0, heading: "Exemplo", textLength: 6 },
        { index: 1, heading: "Notas", textLength: 10 }
      ]
    });
  });

  it("normalizes locale case and whitespace", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", outline: [{ index: 0, heading: "Intro", textLength: 2 }] });
    expect(runFeature({ locale: "  ES ", sections: [{ heading: "Hola", text: "x" }] }).locale).toBe("es");
  });

  it("uses exact UTF-16 text.length and preserves trimmed headings", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "  A  B ", text: "\uD83D\uDE00" }] });
    expect(out.outline[0].heading).toBe("A  B");
    expect(out.outline[0].textLength).toBe(2);
    expect(out.outline[0].index).toBe(0);
  });

  it("returns only locale and outline triples", () => {
    const out = runFeature({
      locale: "pt-br",
      extra: "ignore",
      sections: [{ heading: "H", text: "abc", extraField: 1, id: "secret" }]
    });
    expect(Object.keys(out).sort()).toEqual(["locale", "outline"]);
    expect(Object.keys(out.outline[0]).sort()).toEqual(["heading", "index", "textLength"]);
    expect(JSON.stringify(out)).not.toContain("abc");
    expect(JSON.stringify(out)).not.toContain("secret");
  });

  it("is deterministic and does not mutate input", () => {
    const input = { locale: "pt-br", sections: [{ heading: "  T  ", text: "hello" }] };
    const snapshot = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(JSON.parse(snapshot));
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("throws DOCUMENT_OBJECT_REQUIRED for non-object", () => {
    for (const bad of [null, undefined, 1, "x", []]) {
      try {
        runFeature(bad);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });

  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    for (const bad of [undefined, 1, "", "  ", "fr", "pt-BR-x"]) {
      try {
        runFeature({ locale: bad, sections: [{ heading: "H", text: "t" }] });
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });

  it("throws DOCUMENT_SECTIONS_INVALID for bad array", () => {
    try {
      runFeature({ locale: "es", sections: "no" });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });

  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    const cases = [
      { heading: "   ", text: "t" },
      { heading: "H", text: 1 },
      { heading: 1, text: "t" },
      { heading: "x".repeat(201), text: "t" },
      null,
      "str"
    ];
    for (const badSection of cases) {
      try {
        runFeature({ locale: "es", sections: [badSection] });
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
      }
    }
  });

  it("throws DOCUMENT_TOO_LARGE when cumulative size overflows", () => {
    const big = "a".repeat(180000);
    try {
      runFeature({ locale: "es", sections: [{ heading: "H", text: big }] });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });

  it("accepts cumulative size at exactly 180000", () => {
    const text = "a".repeat(179999);
    const out = runFeature({ locale: "es", sections: [{ heading: "H", text }] });
    expect(out.outline[0].textLength).toBe(179999);
  });
});
