import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_trim_delta_map.mjs";

describe("document trim delta map", () => {
  it("rejects non-object payload with DOCUMENT_OBJECT_REQUIRED without mutation", () => {
    const badValues = [null, undefined, 42, "doc", []];
    for (const value of badValues) {
      try {
        runFeature(value);
        expect.unreachable("should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
    const frozen = { locale: "pt-br", sections: [{ heading: "A", text: "B" }] };
    const before = JSON.stringify(frozen);
    try {
      runFeature(null);
    } catch {
      // ignore
    }
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it("normalizes locale with trim and lowercase and accepts EN-US with spaces", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi\n" }] });
    expect(out.locale).toBe("en-us");
    const out2 = runFeature({ locale: "PT-BR", sections: [{ heading: "A", text: "B" }] });
    expect(out2.locale).toBe("pt-br");
    const out3 = runFeature({ locale: "  es  ", sections: [{ heading: "A", text: "B" }] });
    expect(out3.locale).toBe("es");
  });

  it("rejects unknown locales with DOCUMENT_LOCALE_INVALID", () => {
    for (const locale of ["fr", "", "   ", "en", 42, null]) {
      try {
        runFeature({ locale: locale, sections: [{ heading: "A", text: "B" }] });
        expect.unreachable("should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });

  it("validates sections array length with DOCUMENT_SECTIONS_INVALID", () => {
    try {
      runFeature({ locale: "pt-br", sections: [] });
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: "nope" });
      expect.unreachable("should throw");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    const many = [];
    for (let i = 0; i < 101; i = i + 1) {
      many.push({ heading: "H", text: "T" });
    }
    try {
      runFeature({ locale: "pt-br", sections: many });
      expect.unreachable("should throw");
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });

  it("validates heading and text with DOCUMENT_SECTION_INVALID", () => {
    const cases = [
      { heading: "   ", text: "ok" },
      { heading: "", text: "ok" },
      { heading: 42, text: "ok" },
      { heading: "ok", text: 42 },
      { heading: "x".repeat(201), text: "ok" },
      null,
      []
    ];
    for (const section of cases) {
      try {
        runFeature({ locale: "pt-br", sections: [section] });
        expect.unreachable("should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
      }
    }
  });

  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(180000);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "H", text: big }] });
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });

  it("reports trim deltas for heading Exemplo and text Texto.", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }] });
    expect(out.trims.length).toBe(1);
    expect(out.trims[0].index).toBe(0);
    expect(out.trims[0].headingTrimmedLength).toBe(7);
    expect(out.trims[0].headingTrimDelta).toBe(4);
    expect(out.trims[0].textLength).toBe(6);
    expect(out.trims[0].textEdgeTrimDelta).toBe(0);
    expect(out.totalHeadingTrimDelta).toBe(4);
    expect(out.totalTextEdgeTrimDelta).toBe(0);
  });

  it("reports edge whitespace for Mais texto and totals equal sums", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "  Mais texto  " }
      ]
    });
    expect(out.locale).toBe("pt-br");
    expect(out.totalHeadingTrimDelta).toBe(4);
    expect(out.totalTextEdgeTrimDelta).toBe(4);
    expect(out.trims[1].textLength).toBe(14);
    expect(out.trims[1].textEdgeTrimDelta).toBe(4);
    expect(out.trims[1].headingTrimDelta).toBe(0);
    expect(out.trims[1].headingTrimmedLength).toBe(5);
    expect(out.trims[1].index).toBe(1);
    let sumH = 0;
    let sumT = 0;
    for (const entry of out.trims) {
      sumH = sumH + entry.headingTrimDelta;
      sumT = sumT + entry.textEdgeTrimDelta;
    }
    expect(out.totalHeadingTrimDelta).toBe(sumH);
    expect(out.totalTextEdgeTrimDelta).toBe(sumT);
  });

  it("normalizes EN-US example with trailing newline", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi\n" }] });
    expect(out).toEqual({
      locale: "en-us",
      totalHeadingTrimDelta: 0,
      totalTextEdgeTrimDelta: 1,
      trims: [{ headingTrimDelta: 0, headingTrimmedLength: 5, index: 0, textEdgeTrimDelta: 1, textLength: 3 }]
    });
  });

  it("returns only allowed keys deterministically without mutation or I/O", () => {
    const input = {
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "  Mais texto  " }
      ],
      extra: "ignore-me"
    };
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(JSON.parse(before));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.keys(a).sort()).toEqual(["locale", "totalHeadingTrimDelta", "totalTextEdgeTrimDelta", "trims"]);
    for (const entry of a.trims) {
      expect(Object.keys(entry).sort()).toEqual(["headingTrimDelta", "headingTrimmedLength", "index", "textEdgeTrimDelta", "textLength"]);
    }
    const flat = JSON.stringify(a);
    expect(flat.includes("Exemplo")).toBe(false);
    expect(flat.includes("Mais texto")).toBe(false);
    expect(flat.includes("ignore-me")).toBe(false);
  });
});
