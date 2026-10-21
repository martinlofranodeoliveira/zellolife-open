import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_at_sign_flag_map.mjs";

describe("document at-sign flag map", () => {
  it("rejects non-object payload with DOCUMENT_OBJECT_REQUIRED and preserves input", () => {
    const bad = [null, undefined, 42, "x", [], true];
    for (const v of bad) {
      try {
        runFeature(v);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "b" }] };
    const before = JSON.stringify(payload);
    runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });
  it("normalizes locale and rejects unknown locales", () => {
    expect(runFeature({ locale: " EN-US ", sections: [{ heading: "Hi", text: "ok" }] }).locale).toBe("en-us");
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "Hi", text: "ok" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: " es ", sections: [{ heading: "Hi", text: "ok" }] }).locale).toBe("es");
    for (const bad of ["fr", "", "  ", 42, null]) {
      try {
        runFeature({ locale: bad, sections: [{ heading: "Hi", text: "ok" }] });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });
  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    for (const bad of [null, {}, "x", []]) {
      try {
        runFeature({ locale: "pt-br", sections: bad });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
    }
  });
  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "ok" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "x".repeat(201), text: "ok" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: 42, text: "ok" }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "ok", text: 42 }] });
      expect.unreachable();
    } catch (err) {
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });
  it("rejects cumulative overflow with RangeError DOCUMENT_TOO_LARGE", () => {
    const big = "x".repeat(90000);
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "a", text: big }, { heading: "b", text: big }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });
  it("flags single at-sign in text with correct totals", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "Exemplo", text: "contato user@example.com" }, { heading: " Notas ", text: "sem marcador" }] });
    expect(out).toEqual({ locale: "pt-br", flags: [{ index: 0, hasAtSign: true, atSignCount: 1 }, { index: 1, hasAtSign: false, atSignCount: 0 }], totalAtSignCount: 1, atSignSectionCount: 1 });
  });
  it("counts at-sign in heading and multiple markers", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro @ home", text: "Hi" }] });
    expect(out.locale).toBe("en-us");
    expect(out.flags).toEqual([{ index: 0, hasAtSign: true, atSignCount: 1 }]);
    expect(out.totalAtSignCount).toBe(1);
    expect(out.atSignSectionCount).toBe(1);
    const multi = runFeature({ locale: "es", sections: [{ heading: "a@b@c", text: "@@" }] });
    expect(multi.flags[0].atSignCount).toBe(4);
    expect(multi.totalAtSignCount).toBe(4);
    expect(multi.atSignSectionCount).toBe(1);
  });
  it("leaves clean sections at zero and keeps totals consistent", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "One", text: "plain" }, { heading: "Two", text: "also plain" }] });
    expect(out.flags).toEqual([{ index: 0, hasAtSign: false, atSignCount: 0 }, { index: 1, hasAtSign: false, atSignCount: 0 }]);
    expect(out.totalAtSignCount).toBe(0);
    expect(out.atSignSectionCount).toBe(0);
  });
  it("exposes only locale, flags and totals without copying text", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "Secret", text: "user@example.com" }], extra: "nope" });
    expect(Object.keys(out).sort()).toEqual(["atSignSectionCount", "flags", "locale", "totalAtSignCount"]);
    expect(Object.keys(out.flags[0]).sort()).toEqual(["atSignCount", "hasAtSign", "index"]);
    expect(JSON.stringify(out)).not.toContain("Secret");
    expect(JSON.stringify(out)).not.toContain("user@example.com");
    expect(JSON.stringify(out)).not.toContain("nope");
    let sum = 0;
    let marked = 0;
    for (const f of out.flags) {
      sum = sum + f.atSignCount;
      if (f.hasAtSign === true) {
        marked = marked + 1;
      }
    }
    expect(out.totalAtSignCount).toBe(sum);
    expect(out.atSignSectionCount).toBe(marked);
  });
  it("is deterministic and does not mutate input", () => {
    const payload = { locale: "  PT-BR ", sections: [{ heading: " A@ ", text: "x@y" }, { heading: "B", text: "plain" }] };
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    expect(a).toEqual(b);
    expect(JSON.stringify(payload)).toBe(before);
  });
});
