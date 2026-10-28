import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_paragraph_block_count_map.mjs";

describe("document paragraph block count map", () => {
  it("maps three blocks for single pt-br section", () => {
    const input = { locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Para um.\n\nPara dois.\n\nPara tres." }] };
    const out = runFeature(input);
    expect(out).toEqual({ locale: "pt-br", sectionCount: 1, totalBlockCount: 3, sections: [{ index: 0, blockCount: 3 }] });
  });
  it("normalizes locale and counts Hi-there plus empty section", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi\nthere" }, { heading: "Notas", text: "\n\n" }] });
    expect(out).toEqual({ locale: "en-us", sectionCount: 2, totalBlockCount: 1, sections: [{ index: 0, blockCount: 1 }, { index: 1, blockCount: 0 }] });
  });
  it("rejects non-object with DOCUMENT_OBJECT_REQUIRED", () => {
    const bad = [null, undefined, 42, "x", [], [{ locale: "pt-br", sections: [{ heading: "h", text: "t" }] }]];
    for (const v of bad) {
      expect(() => runFeature(v)).toThrow(TypeError);
      expect(() => runFeature(v)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    }
  });
  it("validates locale with trim-lowercase strict equality", () => {
    expect(runFeature({ locale: " PT-BR ", sections: [{ heading: "h", text: "a" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "Es", sections: [{ heading: "h", text: "a" }] }).locale).toBe("es");
    expect(runFeature({ locale: "en-us", sections: [{ heading: "h", text: "a" }] }).locale).toBe("en-us");
    const badLocales = ["pt_br", "en", "", "fr", "pt-brx", 42, null, undefined];
    for (const loc of badLocales) {
      expect(() => runFeature({ locale: loc, sections: [{ heading: "h", text: "a" }] })).toThrow(TypeError);
      expect(() => runFeature({ locale: loc, sections: [{ heading: "h", text: "a" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    }
    expect(() => runFeature({ locale: "xx", sections: "bad" })).toThrow("DOCUMENT_LOCALE_INVALID");
  });
  it("rejects bad sections array shape", () => {
    expect(() => runFeature({ locale: "pt-br", sections: "nope" })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: null })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "nope" })).toThrow(TypeError);
    const many = [];
    for (let k = 0; k < 101; k = k + 1) {
      many.push({ heading: "h", text: "t" });
    }
    expect(() => runFeature({ locale: "pt-br", sections: many })).toThrow("DOCUMENT_SECTIONS_INVALID");
  });
  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "a" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "", text: "a" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: 42, text: "a" }] })).toThrow(TypeError);
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "h", text: 42 }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [null] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "h".repeat(201), text: "a" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    const ok = runFeature({ locale: "pt-br", sections: [{ heading: "h".repeat(200), text: "a" }] });
    expect(ok.sectionCount).toBe(1);
  });
  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(180000);
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "h", text: big }] })).toThrow(RangeError);
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "h", text: big }] })).toThrow("DOCUMENT_TOO_LARGE");
    const t1 = "y".repeat(90000);
    const t2 = "z".repeat(90000);
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "a", text: t1 }, { heading: "b", text: t2 }] })).toThrow("DOCUMENT_TOO_LARGE");
  });
  it("counts LF blocks with blank-line semantics", () => {
    const cases = [
      { text: "", want: 0 },
      { text: "\n\n", want: 0 },
      { text: "Hi\nthere", want: 1 },
      { text: "a\nb\nc", want: 1 },
      { text: "a\n\nb", want: 2 },
      { text: "a\n\n\nb", want: 2 },
      { text: "\n\na\n\n", want: 1 },
      { text: "a\r\nb", want: 1 },
      { text: "a\n\r\nb", want: 1 },
      { text: "a\n \nb", want: 1 },
      { text: "a\n\t\nb", want: 1 },
      { text: "a\n\n b", want: 2 }
    ];
    for (const c of cases) {
      const out = runFeature({ locale: "es", sections: [{ heading: "h", text: c.text }] });
      expect(out.sections[0].blockCount).toBe(c.want);
    }
  });
  it("returns total sum with ordered indices and only allowed keys", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "A", text: "one\n\ntwo" }, { heading: "B", text: "solo" }, { heading: "C", text: "" }] });
    expect(out.sectionCount).toBe(3);
    expect(out.totalBlockCount).toBe(3);
    expect(out.sections).toEqual([{ index: 0, blockCount: 2 }, { index: 1, blockCount: 1 }, { index: 2, blockCount: 0 }]);
    expect(Object.keys(out).sort()).toEqual(["locale", "sectionCount", "sections", "totalBlockCount"]);
    for (const s of out.sections) {
      expect(Object.keys(s).sort()).toEqual(["blockCount", "index"]);
      expect(Number.isInteger(s.index)).toBe(true);
      expect(Number.isInteger(s.blockCount)).toBe(true);
    }
  });
  it("preserves input, is deterministic and copies no text", () => {
    const input = { locale: " EN-us ", extra: "ignore-me", sections: [{ heading: "SecretoUnico123", text: "alpha\n\nbeta", extra2: 1 }, { heading: "B", text: "solo" }] };
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(b).toEqual(a);
    expect(a).not.toBe(b);
    const dumped = JSON.stringify(a);
    expect(dumped.includes("SecretoUnico123")).toBe(false);
    expect(dumped.includes("alpha")).toBe(false);
    expect(dumped.includes("ignore-me")).toBe(false);
  });
});
