import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_duplicate_map.mjs";

function codeOf(fn) {
  try {
    fn();
  } catch (err) {
    return { name: err.name, message: err.message };
  }
  return null;
}

describe("runFeature heading duplicate map", () => {
  it("maps repeated trimmed headings to first index", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Resumo", text: "Texto um." },
        { heading: "Resumo", text: "Texto dois." },
        { heading: "  Resumo  ", text: "Texto tres." }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      duplicates: [
        { firstIndex: 0, index: 0, isDuplicate: false },
        { firstIndex: 0, index: 1, isDuplicate: true },
        { firstIndex: 0, index: 2, isDuplicate: true }
      ],
      uniqueCount: 1
    });
  });

  it("normalizes locale whitespace and case", () => {
    const out = runFeature({
      locale: " EN-US ",
      sections: [
        { heading: "Intro", text: "Hi" },
        { heading: "Notes", text: "Hello" }
      ]
    });
    expect(out).toEqual({
      locale: "en-us",
      duplicates: [
        { firstIndex: 0, index: 0, isDuplicate: false },
        { firstIndex: 1, index: 1, isDuplicate: false }
      ],
      uniqueCount: 2
    });
  });

  it("treats heading equality as case-sensitive exact match", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "Intro", text: "a" },
        { heading: "intro", text: "b" },
        { heading: "Intro", text: "c" }
      ]
    });
    expect(out.duplicates).toEqual([
      { firstIndex: 0, index: 0, isDuplicate: false },
      { firstIndex: 1, index: 1, isDuplicate: false },
      { firstIndex: 0, index: 2, isDuplicate: true }
    ]);
    expect(out.uniqueCount).toBe(2);
  });

  it("returns only locale, duplicates and uniqueCount without headings", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [{ heading: "A", text: "t" }]
    });
    expect(Object.keys(out).sort()).toEqual(["duplicates", "locale", "uniqueCount"]);
    expect(Object.keys(out.duplicates[0]).sort()).toEqual(["firstIndex", "index", "isDuplicate"]);
    expect(JSON.stringify(out)).not.toContain("A");
  });

  it("is deterministic and does not mutate input", () => {
    const input = {
      locale: "pt-br",
      sections: [
        { heading: "  B  ", text: "x" },
        { heading: "B", text: "y" }
      ]
    };
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(input);
    expect(b).toEqual(a);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("throws DOCUMENT_OBJECT_REQUIRED for non-object", () => {
    const got = codeOf(() => runFeature(null));
    expect(got).toEqual({ name: "TypeError", message: "DOCUMENT_OBJECT_REQUIRED" });
    expect(codeOf(() => runFeature([])).message).toBe("DOCUMENT_OBJECT_REQUIRED");
  });

  it("throws DOCUMENT_LOCALE_INVALID for bad locale", () => {
    expect(codeOf(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "t" }] }))).toEqual({
      name: "TypeError",
      message: "DOCUMENT_LOCALE_INVALID"
    });
  });

  it("throws DOCUMENT_SECTIONS_INVALID for bad array", () => {
    expect(codeOf(() => runFeature({ locale: "pt-br", sections: [] })).message).toBe("DOCUMENT_SECTIONS_INVALID");
  });

  it("throws DOCUMENT_SECTION_INVALID for bad heading or text", () => {
    expect(codeOf(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "t" }] })).message).toBe("DOCUMENT_SECTION_INVALID");
    expect(codeOf(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 1 }] })).message).toBe("DOCUMENT_SECTION_INVALID");
  });

  it("throws DOCUMENT_TOO_LARGE for cumulative overflow", () => {
    const big = "x".repeat(90001);
    const got = codeOf(() =>
      runFeature({
        locale: "pt-br",
        sections: [
          { heading: "A", text: big },
          { heading: "B", text: big }
        ]
      })
    );
    expect(got).toEqual({ name: "RangeError", message: "DOCUMENT_TOO_LARGE" });
  });
});
