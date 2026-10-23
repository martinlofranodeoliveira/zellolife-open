import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_trailing_punct_flag_map.mjs";

describe("document heading trailing punct flag map", () => {
  it("maps pt-br example without copying text", () => {
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "Introducao.", text: "Texto simples." },
        { heading: "Notas", text: "Mais texto" }
      ]
    };
    const result = runFeature(payload);
    expect(result).toEqual({
      locale: "pt-br",
      entries: [
        { index: 0, hasTrailingPunct: true },
        { index: 1, hasTrailingPunct: false }
      ],
      trailingPunctSectionCount: 1
    });
  });

  it("normalizes locale whitespace and case", () => {
    const result = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "  Review:  ", text: "Hi" }]
    });
    expect(result.locale).toBe("en-us");
    expect(result.entries).toEqual([{ index: 0, hasTrailingPunct: true }]);
    expect(result.trailingPunctSectionCount).toBe(1);
  });

  it("supports es locale", () => {
    const result = runFeature({
      locale: "ES",
      sections: [{ heading: "Hola", text: "Mundo" }]
    });
    expect(result.locale).toBe("es");
    expect(result.entries).toEqual([{ index: 0, hasTrailingPunct: false }]);
    expect(result.trailingPunctSectionCount).toBe(0);
  });

  it("detects each supported trailing mark", () => {
    const payload = {
      locale: "en-us",
      sections: [
        { heading: "A.", text: "t" },
        { heading: "B?", text: "t" },
        { heading: "C!", text: "t" },
        { heading: "D:", text: "t" },
        { heading: "E;", text: "t" },
        { heading: "F,", text: "t" }
      ]
    };
    const result = runFeature(payload);
    expect(result.entries.length).toBe(6);
    for (const entry of result.entries) {
      expect(entry.hasTrailingPunct).toBe(true);
    }
    expect(result.trailingPunctSectionCount).toBe(6);
    expect(result.entries[0].index).toBe(0);
    expect(result.entries[5].index).toBe(5);
  });

  it("returns false for non-punct endings", () => {
    const payload = {
      locale: "pt-br",
      sections: [
        { heading: "Notas", text: "t" },
        { heading: "Version 2", text: "t" },
        { heading: "End-", text: "t" },
        { heading: "Close)", text: "t" }
      ]
    };
    const result = runFeature(payload);
    expect(result.trailingPunctSectionCount).toBe(0);
    expect(result.entries).toEqual([
      { index: 0, hasTrailingPunct: false },
      { index: 1, hasTrailingPunct: false },
      { index: 2, hasTrailingPunct: false },
      { index: 3, hasTrailingPunct: false }
    ]);
  });

  it("trims heading before checking last character", () => {
    const result = runFeature({
      locale: "en-us",
      sections: [
        { heading: "Hello.   ", text: "t" },
        { heading: "  Hello   ", text: "t" },
        { heading: "\tHi?\n", text: "t" }
      ]
    });
    expect(result.entries).toEqual([
      { index: 0, hasTrailingPunct: true },
      { index: 1, hasTrailingPunct: false },
      { index: 2, hasTrailingPunct: true }
    ]);
    expect(result.trailingPunctSectionCount).toBe(2);
  });

  it("output contains only locale flags and count", () => {
    const result = runFeature({
      locale: "pt-br",
      sections: [{ heading: "Ola.", text: "Corpo secreto", extra: "nope" }]
    });
    expect(Object.keys(result).sort()).toEqual(["entries", "locale", "trailingPunctSectionCount"]);
    expect(Object.keys(result.entries[0]).sort()).toEqual(["hasTrailingPunct", "index"]);
    expect(JSON.stringify(result)).not.toContain("Ola");
    expect(JSON.stringify(result)).not.toContain("Corpo");
    expect(JSON.stringify(result)).not.toContain("extra");
    expect(typeof result.entries[0].index).toBe("number");
    expect(typeof result.entries[0].hasTrailingPunct).toBe("boolean");
  });

  it("is pure and deterministic without mutating input", () => {
    const payload = {
      locale: "  Pt-Br  ",
      sections: [
        { heading: "A.", text: "one" },
        { heading: "B", text: "two" }
      ]
    };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    expect(second).toEqual(first);
    expect(JSON.stringify(payload)).toBe(before);
    expect(first.trailingPunctSectionCount).toBe(1);
    expect(first.entries.length).toBe(payload.sections.length);
  });

  it("throws DOCUMENT_OBJECT_REQUIRED for non-object", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      let caught = null;
      try {
        runFeature(bad);
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof TypeError).toBe(true);
      expect(caught.message).toBe("DOCUMENT_OBJECT_REQUIRED");
    }
  });

  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    const cases = [
      { locale: "xx", sections: [{ heading: "A", text: "t" }] },
      { locale: "", sections: [{ heading: "A", text: "t" }] },
      { locale: 42, sections: [{ heading: "A", text: "t" }] },
      { sections: [{ heading: "A", text: "t" }] }
    ];
    for (const payload of cases) {
      let caught = null;
      try {
        runFeature(payload);
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof TypeError).toBe(true);
      expect(caught.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
  });

  it("throws DOCUMENT_SECTIONS_INVALID for bad array shape", () => {
    const cases = [
      { locale: "pt-br", sections: [] },
      { locale: "pt-br", sections: "nope" },
      { locale: "pt-br" }
    ];
    for (const payload of cases) {
      let caught = null;
      try {
        runFeature(payload);
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof TypeError).toBe(true);
      expect(caught.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });

  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    const cases = [
      { locale: "pt-br", sections: [{ heading: "   ", text: "t" }] },
      { locale: "pt-br", sections: [{ heading: 42, text: "t" }] },
      { locale: "pt-br", sections: [{ heading: "A", text: 42 }] },
      { locale: "pt-br", sections: [null] },
      { locale: "pt-br", sections: [{ heading: "A" }] }
    ];
    for (const payload of cases) {
      let caught = null;
      try {
        runFeature(payload);
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof TypeError).toBe(true);
      expect(caught.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });

  it("throws DOCUMENT_SECTION_INVALID for heading longer than 200", () => {
    const longHeading = "a".repeat(201);
    let caught = null;
    try {
      runFeature({ locale: "en-us", sections: [{ heading: longHeading, text: "t" }] });
    } catch (e) {
      caught = e;
    }
    expect(caught instanceof TypeError).toBe(true);
    expect(caught.message).toBe("DOCUMENT_SECTION_INVALID");
  });

  it("throws DOCUMENT_TOO_LARGE for cumulative overflow", () => {
    const big = "a".repeat(180001);
    let caught = null;
    try {
      runFeature({ locale: "pt-br", sections: [{ heading: "Hi", text: big }] });
    } catch (e) {
      caught = e;
    }
    expect(caught instanceof RangeError).toBe(true);
    expect(caught.message).toBe("DOCUMENT_TOO_LARGE");
  });

  it("respects validation order", () => {
    let caught = null;
    try {
      runFeature({ locale: "bad", sections: "bad" });
    } catch (e) {
      caught = e;
    }
    expect(caught.message).toBe("DOCUMENT_LOCALE_INVALID");
    caught = null;
    try {
      runFeature({ locale: "pt-br", sections: [] });
    } catch (e) {
      caught = e;
    }
    expect(caught.message).toBe("DOCUMENT_SECTIONS_INVALID");
    caught = null;
    try {
      runFeature(null);
    } catch (e) {
      caught = e;
    }
    expect(caught.message).toBe("DOCUMENT_OBJECT_REQUIRED");
  });
});
