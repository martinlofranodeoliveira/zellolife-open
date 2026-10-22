import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_bullet_marker_flag_map.mjs";

function checkThrow(fn, Ctor, code) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(Ctor);
    expect(err.message).toBe(code);
    return;
  }
  throw new Error("expected throw " + code);
}

describe("document bullet marker flag map", () => {
  it("maps pt-br example with two bullets", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Exemplo", text: "Intro\n- item um\n- item dois\nFim" },
        { heading: "Notas", text: "Sem lista" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      entries: [
        { index: 0, hasBullet: true, bulletLineCount: 2 },
        { index: 1, hasBullet: false, bulletLineCount: 0 }
      ],
      bulletSectionCount: 1,
      totalBulletLineCount: 2
    });
  });

  it("normalizes locale case and whitespace", () => {
    const out = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "* item\nplain" }]
    });
    expect(out).toEqual({
      locale: "en-us",
      entries: [{ index: 0, hasBullet: true, bulletLineCount: 1 }],
      bulletSectionCount: 1,
      totalBulletLineCount: 1
    });
  });

  it("normalizes es locale", () => {
    const out = runFeature({
      locale: "  ES ",
      sections: [{ heading: "H", text: "+ uno" }]
    });
    expect(out.locale).toBe("es");
    expect(out.entries).toEqual([{ index: 0, hasBullet: true, bulletLineCount: 1 }]);
    expect(out.bulletSectionCount).toBe(1);
    expect(out.totalBulletLineCount).toBe(1);
  });

  it("rejects non-object payloads", () => {
    checkThrow(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature("x"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    checkThrow(() => runFeature(undefined), TypeError, "DOCUMENT_OBJECT_REQUIRED");
  });

  it("rejects bad locales", () => {
    checkThrow(() => runFeature({ locale: "fr", sections: [{ heading: "H", text: "T" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ locale: 1, sections: [{ heading: "H", text: "T" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ sections: [{ heading: "H", text: "T" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    checkThrow(() => runFeature({ locale: "", sections: [{ heading: "H", text: "T" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
  });

  it("rejects bad section arrays", () => {
    checkThrow(() => runFeature({ locale: "pt-br", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    checkThrow(() => runFeature({ locale: "pt-br", sections: "x" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    checkThrow(() => runFeature({ locale: "pt-br" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });

  it("rejects bad heading or text", () => {
    checkThrow(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "pt-br", sections: [{ heading: 1, text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "pt-br", sections: [{ heading: "H", text: 1 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "pt-br", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
    checkThrow(() => runFeature({ locale: "pt-br", sections: [{ heading: "a".repeat(201), text: "T" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });

  it("rejects overflow with RangeError", () => {
    checkThrow(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: "x".repeat(180000) }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });

  it("does not mutate input", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "Exemplo", text: "- a\nplain" }] };
    const before = JSON.stringify(payload);
    runFeature(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("counts only column-zero dash/star/plus followed by space", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [{ heading: "H", text: "- a\n* b\n+ c\n - d\n-e\n-  e\n\t- f" }]
    });
    expect(out.entries[0].bulletLineCount).toBe(4);
    expect(out.entries[0].hasBullet).toBe(true);
  });

  it("does not count indented bullets and handles CR resets", () => {
    const indented = runFeature({
      locale: "pt-br",
      sections: [{ heading: "H", text: "  - a\n   * b" }]
    });
    expect(indented.entries[0].bulletLineCount).toBe(0);
    expect(indented.entries[0].hasBullet).toBe(false);
    const cr = runFeature({
      locale: "pt-br",
      sections: [{ heading: "H", text: "plain\r- via cr\r* second" }]
    });
    expect(cr.entries[0].bulletLineCount).toBe(2);
    const crlf = runFeature({
      locale: "pt-br",
      sections: [{ heading: "H", text: "a\r\n- b" }]
    });
    expect(crlf.entries[0].bulletLineCount).toBe(1);
  });

  it("scans trimmed heading plus virtual newline", () => {
    const fromHeading = runFeature({
      locale: "pt-br",
      sections: [{ heading: "- list", text: "plain" }]
    });
    expect(fromHeading.entries[0].bulletLineCount).toBe(1);
    const acrossBoundary = runFeature({
      locale: "pt-br",
      sections: [{ heading: "Intro", text: "- first" }]
    });
    expect(acrossBoundary.entries[0].bulletLineCount).toBe(1);
    const noBullet = runFeature({
      locale: "pt-br",
      sections: [{ heading: "Intro", text: "plain" }]
    });
    expect(noBullet.entries[0]).toEqual({ index: 0, hasBullet: false, bulletLineCount: 0 });
  });

  it("preserves order and sums totals", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "A", text: "- one" },
        { heading: "B", text: "plain" },
        { heading: "C", text: "* x\n* y\n+ z" }
      ]
    });
    expect(out.entries.map((e) => e.index)).toEqual([0, 1, 2]);
    expect(out.entries[0].hasBullet).toBe(true);
    expect(out.entries[1].hasBullet).toBe(false);
    expect(out.entries[2].bulletLineCount).toBe(3);
    expect(out.bulletSectionCount).toBe(2);
    expect(out.totalBulletLineCount).toBe(4);
    for (const e of out.entries) {
      expect(e.hasBullet).toBe(e.bulletLineCount > 0);
    }
  });

  it("returns only locale entries and totals and is deterministic", () => {
    const payload = { locale: "pt-br", extra: "no", sections: [{ heading: "H", text: "- a", id: "x" }] };
    const first = runFeature(payload);
    const second = runFeature({ locale: "pt-br", sections: [{ heading: "H", text: "- a" }] });
    expect(Object.keys(first).sort()).toEqual(["bulletSectionCount", "entries", "locale", "totalBulletLineCount"]);
    expect(Object.keys(first.entries[0]).sort()).toEqual(["bulletLineCount", "hasBullet", "index"]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(JSON.stringify(first).includes("- a")).toBe(false);
  });
});
