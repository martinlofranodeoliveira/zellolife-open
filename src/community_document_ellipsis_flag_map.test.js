import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_ellipsis_flag_map.mjs";

describe("document ellipsis flag map", () => {
  it("maps pt-br example with one ellipsis section", () => {
    const input = { locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto com ... truncado" }, { heading: "Notas", text: "Sem marcas" }] };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    expect(out).toEqual({
      locale: "pt-br",
      entries: [
        { index: 0, ellipsisCount: 1, hasEllipsis: true },
        { index: 1, ellipsisCount: 0, hasEllipsis: false }
      ],
      ellipsisSectionCount: 1,
      totalEllipsisCount: 1
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it("normalizes locale case and whitespace", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi … there... end" }] });
    expect(out.locale).toBe("en-us");
    expect(out.entries).toEqual([{ index: 0, ellipsisCount: 2, hasEllipsis: true }]);
    expect(out.ellipsisSectionCount).toBe(1);
    expect(out.totalEllipsisCount).toBe(2);
  });

  it("counts non-overlapping triples: 3 -> 1, 4 -> 1, 6 -> 2", () => {
    expect(runFeature({ locale: "es", sections: [{ heading: "A", text: "..." }] }).entries[0].ellipsisCount).toBe(1);
    expect(runFeature({ locale: "es", sections: [{ heading: "A", text: "...." }] }).entries[0].ellipsisCount).toBe(1);
    expect(runFeature({ locale: "es", sections: [{ heading: "A", text: "......" }] }).entries[0].ellipsisCount).toBe(2);
    expect(runFeature({ locale: "es", sections: [{ heading: "A", text: ".." }] }).entries[0].ellipsisCount).toBe(0);
    expect(runFeature({ locale: "es", sections: [{ heading: "A", text: "......." }] }).entries[0].ellipsisCount).toBe(2);
  });

  it("resets triple runs on non-period and between heading and text", () => {
    const split = runFeature({ locale: "es", sections: [{ heading: "ab..", text: ".cd" }] });
    expect(split.entries[0].ellipsisCount).toBe(0);
    expect(split.entries[0].hasEllipsis).toBe(false);
    const spaced = runFeature({ locale: "es", sections: [{ heading: "A", text: "... ..." }] });
    expect(spaced.entries[0].ellipsisCount).toBe(2);
    const twoTriples = runFeature({ locale: "es", sections: [{ heading: "A", text: "a...b..." }] });
    expect(twoTriples.entries[0].ellipsisCount).toBe(2);
  });

  it("counts each horizontal ellipsis and combines with triple dots", () => {
    const single = runFeature({ locale: "pt-br", sections: [{ heading: "A", text: "…" }] });
    expect(single.entries[0]).toEqual({ index: 0, ellipsisCount: 1, hasEllipsis: true });
    const double = runFeature({ locale: "pt-br", sections: [{ heading: "…", text: "…… wait" }] });
    expect(double.entries[0].ellipsisCount).toBe(3);
    const mixed = runFeature({ locale: "pt-br", sections: [{ heading: "A", text: "…..." }] });
    expect(mixed.entries[0].ellipsisCount).toBe(2);
  });

  it("preserves order and derives totals", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "A", text: "hi..." }, { heading: "B", text: "no" }, { heading: "C", text: "… plus ..." }] });
    expect(out.entries.map((e) => e.index)).toEqual([0, 1, 2]);
    expect(out.entries[0].ellipsisCount).toBe(1);
    expect(out.entries[1].ellipsisCount).toBe(0);
    expect(out.entries[2].ellipsisCount).toBe(2);
    expect(out.ellipsisSectionCount).toBe(2);
    expect(out.totalEllipsisCount).toBe(3);
  });

  it("exposes only allowed keys and is deterministic", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "Secret Heading", text: "body ... here" }], extra: "ignore" };
    const out = runFeature(payload);
    expect(Object.keys(out).sort()).toEqual(["ellipsisSectionCount", "entries", "locale", "totalEllipsisCount"]);
    for (const e of out.entries) {
      expect(Object.keys(e).sort()).toEqual(["ellipsisCount", "hasEllipsis", "index"]);
    }
    expect(JSON.stringify(out)).not.toContain("Secret Heading");
    expect(JSON.stringify(out)).not.toContain("body");
    expect(JSON.stringify(out)).not.toContain("extra");
    const first = runFeature({ locale: "pt-br", sections: [{ heading: "H", text: "a..." }] });
    const second = runFeature({ locale: "pt-br", sections: [{ heading: "H", text: "a..." }] });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("rejects non-object payload", () => {
    const badValues = [null, undefined, 42, "x", []];
    for (const bad of badValues) {
      let threw = false;
      try {
        runFeature(bad);
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
      expect(threw).toBe(true);
    }
  });

  it("rejects bad locale", () => {
    const badValues = ["fr", "", "   ", 42, null];
    for (const bad of badValues) {
      let threw = false;
      try {
        runFeature({ locale: bad, sections: [{ heading: "H", text: "T" }] });
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
      expect(threw).toBe(true);
    }
  });

  it("rejects bad sections array", () => {
    const many = [];
    for (let i = 0; i < 101; i++) {
      many.push({ heading: "H", text: "T" });
    }
    const badValues = ["x", {}, null, [], many];
    for (const bad of badValues) {
      let threw = false;
      try {
        runFeature({ locale: "es", sections: bad });
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
      expect(threw).toBe(true);
    }
  });

  it("rejects bad heading or text", () => {
    const cases = [
      { heading: "   ", text: "ok" },
      { heading: "", text: "ok" },
      { heading: "H".repeat(201), text: "ok" },
      { heading: "H", text: 42 },
      { heading: 42, text: "T" },
      { heading: "H", text: null }
    ];
    for (const c of cases) {
      let threw = false;
      try {
        runFeature({ locale: "es", sections: [c] });
      } catch (e) {
        threw = true;
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
      }
      expect(threw).toBe(true);
    }
    let threwNull = false;
    try {
      runFeature({ locale: "es", sections: [null] });
    } catch (e) {
      threwNull = true;
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    expect(threwNull).toBe(true);
  });

  it("rejects oversized total", () => {
    const big = "a".repeat(180000);
    let threw = false;
    try {
      runFeature({ locale: "es", sections: [{ heading: "Hi", text: big }] });
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
    expect(threw).toBe(true);
  });
});
