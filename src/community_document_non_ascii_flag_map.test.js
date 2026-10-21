import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_non_ascii_flag_map.mjs";

describe("document non-ascii flag map", () => {
  it("rejects non-object input with DOCUMENT_OBJECT_REQUIRED", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      try {
        runFeature(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });

  it("validates locale, sections, section and size limits", () => {
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] })).toThrowError("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "no" })).toThrowError("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "B" }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 1 }] })).toThrowError("DOCUMENT_SECTION_INVALID");
    const big = "a".repeat(90001);
    expect(() => runFeature({ locale: "es", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] })).toThrowError("DOCUMENT_TOO_LARGE");
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
    }
  });

  it("does not mutate input", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "  Ola  ", text: "abc" }] };
    const before = JSON.stringify(payload);
    runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("flags ascii-only sections as false", () => {
    const out = runFeature({ locale: "en-us", sections: [{ heading: "Hello", text: "Plain 123 ~ here" }] });
    expect(out.flags).toEqual([{ hasNonAscii: false, headingHasNonAscii: false, index: 0, textHasNonAscii: false }]);
    expect(out.headingNonAsciiCount).toBe(0);
    expect(out.textNonAsciiCount).toBe(0);
    expect(out.nonAsciiSectionCount).toBe(0);
  });

  it("treats LF CR TAB as ascii but DEL and accented as non-ascii", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "A\n\r\tB", text: "x\n\ty" }] });
    expect(out.flags[0].hasNonAscii).toBe(false);
    const del = runFeature({ locale: "es", sections: [{ heading: "A\u007FB", text: "ok" }] });
    expect(del.flags[0].headingHasNonAscii).toBe(true);
    expect(del.flags[0].hasNonAscii).toBe(true);
    const tildeOnly = runFeature({ locale: "es", sections: [{ heading: "~", text: "~" }] });
    expect(tildeOnly.flags[0].hasNonAscii).toBe(false);
  });

  it("flags accented, unicode and emoji characters", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Café", text: "Hi" },
        { heading: "Notas", text: "áudio \u{1F600}" },
        { heading: "Plain", text: "plain" }
      ]
    });
    expect(out.flags[0]).toMatchObject({ index: 0, headingHasNonAscii: true, textHasNonAscii: false, hasNonAscii: true });
    expect(out.flags[1]).toMatchObject({ index: 1, headingHasNonAscii: false, textHasNonAscii: true, hasNonAscii: true });
    expect(out.flags[2]).toMatchObject({ index: 2, hasNonAscii: false });
    expect(out.headingNonAsciiCount).toBe(1);
    expect(out.textNonAsciiCount).toBe(1);
    expect(out.nonAsciiSectionCount).toBe(2);
  });

  it("matches contract examples with order and totals", () => {
    const a = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }, { heading: "Notas", text: "Mais texto com áudio" }] });
    expect(a.locale).toBe("pt-br");
    expect(a.flags.length).toBe(2);
    expect(a.flags[0]).toEqual({ hasNonAscii: false, headingHasNonAscii: false, index: 0, textHasNonAscii: false });
    expect(a.flags[1]).toEqual({ hasNonAscii: true, headingHasNonAscii: false, index: 1, textHasNonAscii: true });
    expect(a.headingNonAsciiCount).toBe(0);
    expect(a.textNonAsciiCount).toBe(1);
    expect(a.nonAsciiSectionCount).toBe(1);
    const b = runFeature({ locale: " EN-US ", sections: [{ heading: "Café", text: "Hi" }] });
    expect(b).toEqual({
      flags: [{ hasNonAscii: true, headingHasNonAscii: true, index: 0, textHasNonAscii: false }],
      headingNonAsciiCount: 1,
      locale: "en-us",
      nonAsciiSectionCount: 1,
      textNonAsciiCount: 0
    });
  });

  it("normalizes locale trimming and lowercasing", () => {
    expect(runFeature({ locale: " PT-BR ", sections: [{ heading: "A", text: "B" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: "Es", sections: [{ heading: "A", text: "B" }] }).locale).toBe("es");
  });

  it("outputs only locale, flags and totals without headings or text", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "Café secreto", text: "texto secreto áudio" }] });
    expect(Object.keys(out).sort()).toEqual(["flags", "headingNonAsciiCount", "locale", "nonAsciiSectionCount", "textNonAsciiCount"]);
    for (const entry of out.flags) {
      expect(Object.keys(entry).sort()).toEqual(["hasNonAscii", "headingHasNonAscii", "index", "textHasNonAscii"]);
    }
    expect(JSON.stringify(out)).not.toContain("secreto");
    expect(JSON.stringify(out)).not.toContain("Café");
  });

  it("is pure deterministic across repeated calls", () => {
    const payload = { locale: "en-us", sections: [{ heading: "Café", text: "a" }, { heading: "B", text: "b" }] };
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.flags).not.toBe(first.flags);
  });
});
