import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_echo_flag_map.mjs";

describe("document heading echo flag map", () => {
  it("maps example pt-br with trimmed heading echo", () => {
    const input = { locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto com Exemplo dentro." }, { heading: "Notas", text: "Mais texto" }] };
    const out = runFeature(input);
    expect(out).toEqual({ locale: "pt-br", echoCount: 1, sections: [{ index: 0, hasEcho: true }, { index: 1, hasEcho: false }] });
  });
  it("normalizes locale case and whitespace", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", echoCount: 0, sections: [{ index: 0, hasEcho: false }] });
  });
  it("supports es and is case sensitive", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "Hola", text: "hola mundo" }] });
    expect(out.sections[0].hasEcho).toBe(false);
    expect(out.echoCount).toBe(0);
    const out2 = runFeature({ locale: "es", sections: [{ heading: "Hola", text: "Saludo Hola!" }] });
    expect(out2.sections[0].hasEcho).toBe(true);
    expect(out2.echoCount).toBe(1);
  });
  it("trims heading only and keeps text unchanged", () => {
    const yes = runFeature({ locale: "pt-br", sections: [{ heading: "  Hi  ", text: "Say Hi here" }] });
    expect(yes.sections[0].hasEcho).toBe(true);
    const no = runFeature({ locale: "pt-br", sections: [{ heading: "Hi", text: "hi lower" }] });
    expect(no.sections[0].hasEcho).toBe(false);
  });
  it("empty text never echoes and preserves order with counts", () => {
    const out = runFeature({ locale: "en-us", sections: [{ heading: "A", text: "" }, { heading: "B", text: "B here" }, { heading: "C", text: "other" }] });
    expect(out.sections).toEqual([{ index: 0, hasEcho: false }, { index: 1, hasEcho: true }, { index: 2, hasEcho: false }]);
    expect(out.echoCount).toBe(1);
  });
  it("matches interior spaces and punctuation verbatim", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "a b, c!", text: "xx a b, c! yy" }] });
    expect(out.sections[0].hasEcho).toBe(true);
    const out2 = runFeature({ locale: "pt-br", sections: [{ heading: "a b, c!", text: "xx a b c yy" }] });
    expect(out2.sections[0].hasEcho).toBe(false);
  });
  it("output contains only locale echoCount and index-flag pairs", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "H", text: "H", extra: "x" }], extraTop: 1 });
    expect(Object.keys(out).sort()).toEqual(["echoCount", "locale", "sections"]);
    expect(Object.keys(out.sections[0]).sort()).toEqual(["hasEcho", "index"]);
    expect(typeof out.locale).toBe("string");
    expect(typeof out.echoCount).toBe("number");
    expect(typeof out.sections[0].index).toBe("number");
    expect(typeof out.sections[0].hasEcho).toBe("boolean");
    expect(JSON.stringify(out)).not.toContain("extraTop");
  });
  it("is pure deterministic and preserves input", () => {
    const input = { locale: "  PT-BR ", sections: [{ heading: "  X  ", text: "has X" }] };
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(JSON.parse(before));
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("throws DOCUMENT_OBJECT_REQUIRED for non-objects", () => {
    const badList = [null, undefined, [], "x", 5];
    for (const bad of badList) {
      try {
        runFeature(bad);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });
  it("throws DOCUMENT_LOCALE_INVALID and respects order before sections", () => {
    try {
      runFeature({ locale: "fr", sections: [] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
    try {
      runFeature({ locale: 5, sections: [{ heading: "H", text: "H" }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
  });
  it("throws DOCUMENT_SECTIONS_INVALID for bad shape", () => {
    const tooMany = [];
    for (let n = 0; n < 101; n = n + 1) {
      tooMany.push({ heading: "H", text: "H" });
    }
    const badList = ["x", {}, []];
    for (const bad of badList) {
      try {
        runFeature({ locale: "pt-br", sections: bad });
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
    }
    try {
      runFeature({ locale: "pt-br", sections: tooMany });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });
  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    const longHeading = "y".repeat(201);
    const cases = [{ heading: "   ", text: "x" }, { heading: longHeading, text: "x" }, { heading: 5, text: "x" }, { heading: "H", text: 5 }, { heading: "H" }, null, []];
    for (const s of cases) {
      try {
        runFeature({ locale: "pt-br", sections: [s] });
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
      }
    }
  });
  it("throws DOCUMENT_TOO_LARGE on cumulative overflow", () => {
    const big = "x".repeat(90000);
    try {
      runFeature({ locale: "en-us", sections: [{ heading: "a", text: big }, { heading: "b", text: big }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
});
