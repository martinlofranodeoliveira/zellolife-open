import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_delivery_checksum_map.mjs";

describe("document delivery checksum map", () => {
  it("matches first worked receipt", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo  ", text: "Texto." },
        { heading: "Notas", text: "Mais texto" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      totalChecksum: 2815,
      sections: [
        { index: 0, checksum: 1308 },
        { index: 1, checksum: 1507 }
      ]
    });
  });
  it("normalizes locale and matches second worked receipt", () => {
    const out = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "Hi" }]
    });
    expect(out).toEqual({
      locale: "en-us",
      totalChecksum: 701,
      sections: [{ index: 0, checksum: 701 }]
    });
  });
  it("rejects non-objects without mutating", () => {
    for (const bad of [null, [], {}, 0, 1, "x", true]) {
      if (bad !== null && typeof bad === "object" && Array.isArray(bad) === false) {
        continue;
      }
      let before = "";
      if (Array.isArray(bad) === true) {
        before = JSON.stringify(bad);
      }
      try {
        runFeature(bad);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
      if (Array.isArray(bad) === true) {
        expect(JSON.stringify(bad)).toBe(before);
      }
    }
    expect(() => runFeature(null)).toThrowError("DOCUMENT_OBJECT_REQUIRED");
    expect(() => runFeature([])).toThrowError("DOCUMENT_OBJECT_REQUIRED");
  });
  it("validates locale via trim and lowercase map", () => {
    expect(() => runFeature({ locale: "fr-fr", sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: 1, sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(runFeature({ locale: "  PT-BR ", sections: [{ heading: "A", text: "B" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "Es", sections: [{ heading: "A", text: "B" }] }).locale).toBe("es");
  });
  it("validates sections shape and per-section fields in order", () => {
    expect(() => runFeature({ locale: "es", sections: [] })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "es", sections: "x" })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "B" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "es", sections: [{ heading: "A", text: 1 }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    let long = "";
    for (const ch of "abcdefghijklmnopqrstuvwxyz") {
      long = long + ch;
    }
    let over = "A";
    for (const c of long) {
      over = over + c;
    }
    let heading201 = "";
    for (let n = 0; n < 201; n = n + 1) {
      heading201 = heading201 + "a";
    }
    expect(over.length > 0).toBe(true);
    expect(() => runFeature({ locale: "es", sections: [{ heading: heading201, text: "B" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "es", sections: [null] })).toThrowError("DOCUMENT_SECTION_INVALID");
  });
  it("throws too large on cumulative overflow", () => {
    let big = "";
    for (let n = 0; n < 90000; n = n + 1) {
      big = big + "ab";
    }
    expect(big.length).toBe(180000);
    expect(() => runFeature({ locale: "en-us", sections: [{ heading: "A", text: big }] })).toThrowError("DOCUMENT_TOO_LARGE");
    try {
      runFeature({ locale: "en-us", sections: [{ heading: "A", text: big }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
  it("counts astral points as two UTF-16 units", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "A", text: "\uD83D\uDE00" }] });
    expect(out.sections[0].checksum).toBe(46718);
    expect(out.totalChecksum).toBe(46718);
    const lone = runFeature({ locale: "es", sections: [{ heading: "A", text: "\uD83D" }] });
    expect(lone.sections[0].checksum).toBe(55422);
  });
  it("returns only index-checksum pairs and preserves input", () => {
    const payload = {
      locale: "pt-br",
      extra: "ignore-me",
      sections: [{ heading: "  Hi  ", text: "Yo", extra2: 1 }]
    };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
    expect(Object.keys(out).sort()).toEqual(["locale", "sections", "totalChecksum"]);
    expect(out.sections.length).toBe(1);
    expect(Object.keys(out.sections[0]).sort()).toEqual(["checksum", "index"]);
    expect(JSON.stringify(out).length < 65536).toBe(true);
    const again = runFeature(JSON.parse(before));
    expect(again).toEqual(out);
  });
  it("handles boundaries and stays safe-integer serializable", () => {
    const single = runFeature({ locale: "es", sections: [{ heading: "x", text: "y" }] });
    expect(single.sections[0]).toEqual({ index: 0, checksum: 241 });
    const many = [];
    for (let n = 0; n < 100; n = n + 1) {
      many.push({ heading: "H", text: "T" });
    }
    const out100 = runFeature({ locale: "en-us", sections: many });
    expect(out100.sections.length).toBe(100);
    expect(out100.sections[0].index).toBe(0);
    expect(out100.sections[99].index).toBe(99);
    expect(Number.isSafeInteger(out100.totalChecksum)).toBe(true);
    for (const s of out100.sections) {
      expect(Number.isSafeInteger(s.checksum)).toBe(true);
      expect(Number.isSafeInteger(s.index)).toBe(true);
    }
    let fill = "";
    for (let n = 0; n < 89999; n = n + 1) {
      fill = fill + "ab";
    }
    const exact = runFeature({ locale: "es", sections: [{ heading: "AB", text: fill }] });
    expect(exact.totalChecksum >= 0).toBe(true);
    expect(JSON.stringify(exact).length < 65536).toBe(true);
  });
});
