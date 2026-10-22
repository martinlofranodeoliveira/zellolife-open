import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_long_token_flag_map.mjs";

function readCode(fn, ErrorClass) {
  let caught = null;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).not.toBe(null);
  expect(caught instanceof ErrorClass).toBe(true);
  return String(caught.message);
}

describe("document long-token flag map", () => {
  it("matches first public example", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "Exemplo", text: "Texto curto." },
        { heading: "Notas", text: "Supercalifragilisticexpialidocious plus" }
      ]
    });
    expect(out).toEqual({
      entries: [
        { hasLongToken: false, index: 0, maxTokenLength: 7 },
        { hasLongToken: true, index: 1, maxTokenLength: 34 }
      ],
      locale: "pt-br",
      longTokenSectionCount: 1,
      longestTokenLength: 34
    });
  });

  it("normalizes locale with trim and lowercase while preserving input", () => {
    const payload = {
      locale: " EN-US ",
      sections: [{ heading: "Intro", text: "123456789012345678901234567890 end" }]
    };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(out.locale).toBe("en-us");
    expect(out.entries).toEqual([{ hasLongToken: true, index: 0, maxTokenLength: 30 }]);
    expect(out.longTokenSectionCount).toBe(1);
    expect(out.longestTokenLength).toBe(30);
    expect(JSON.stringify(payload)).toBe(before);
    expect(payload.locale).toBe(" EN-US ");
  });

  it("rejects non-object payload with DOCUMENT_OBJECT_REQUIRED", () => {
    expect(readCode(() => runFeature(null), TypeError)).toContain("DOCUMENT_OBJECT_REQUIRED");
    expect(readCode(() => runFeature("pt-br"), TypeError)).toContain("DOCUMENT_OBJECT_REQUIRED");
    expect(readCode(() => runFeature(42), TypeError)).toContain("DOCUMENT_OBJECT_REQUIRED");
    expect(readCode(() => runFeature([]), TypeError)).toContain("DOCUMENT_OBJECT_REQUIRED");
  });

  it("rejects bad locale with DOCUMENT_LOCALE_INVALID", () => {
    expect(readCode(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] }), TypeError)).toContain("DOCUMENT_LOCALE_INVALID");
    expect(readCode(() => runFeature({ locale: 42, sections: [{ heading: "A", text: "B" }] }), TypeError)).toContain("DOCUMENT_LOCALE_INVALID");
    expect(readCode(() => runFeature({ sections: [{ heading: "A", text: "B" }] }), TypeError)).toContain("DOCUMENT_LOCALE_INVALID");
  });

  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    expect(readCode(() => runFeature({ locale: "es", sections: [] }), TypeError)).toContain("DOCUMENT_SECTIONS_INVALID");
    expect(readCode(() => runFeature({ locale: "es", sections: "nope" }), TypeError)).toContain("DOCUMENT_SECTIONS_INVALID");
    const many = [];
    for (let i = 0; i < 101; i = i + 1) {
      many.push({ heading: "H", text: "T" });
    }
    expect(readCode(() => runFeature({ locale: "es", sections: many }), TypeError)).toContain("DOCUMENT_SECTIONS_INVALID");
  });

  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    expect(readCode(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "ok" }] }), TypeError)).toContain("DOCUMENT_SECTION_INVALID");
    expect(readCode(() => runFeature({ locale: "pt-br", sections: [{ heading: "ok", text: 42 }] }), TypeError)).toContain("DOCUMENT_SECTION_INVALID");
    expect(readCode(() => runFeature({ locale: "pt-br", sections: [null] }), TypeError)).toContain("DOCUMENT_SECTION_INVALID");
    expect(readCode(() => runFeature({ locale: "pt-br", sections: [{ heading: "a".repeat(201), text: "ok" }] }), TypeError)).toContain("DOCUMENT_SECTION_INVALID");
  });

  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE", () => {
    const big = "a".repeat(90001);
    const payload = {
      locale: "en-us",
      sections: [
        { heading: "H1", text: big },
        { heading: "H2", text: big }
      ]
    };
    expect(readCode(() => runFeature(payload), RangeError)).toContain("DOCUMENT_TOO_LARGE");
  });

  it("splits tokens on space LF CR TAB and applies 30 threshold", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "a b", text: "c\nd\re\tf" },
        { heading: "Short", text: "12345678901234567890123456789" },
        { heading: "Long", text: "123456789012345678901234567890" }
      ]
    });
    expect(out.entries[0].maxTokenLength).toBe(1);
    expect(out.entries[0].hasLongToken).toBe(false);
    expect(out.entries[1].maxTokenLength).toBe(29);
    expect(out.entries[1].hasLongToken).toBe(false);
    expect(out.entries[2].maxTokenLength).toBe(30);
    expect(out.entries[2].hasLongToken).toBe(true);
    expect(out.longTokenSectionCount).toBe(1);
    expect(out.longestTokenLength).toBe(30);
  });

  it("treats heading-text boundary as separator and empty text as no token", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "123456789012345", text: "678901234567890" },
        { heading: "hello", text: "" }
      ]
    });
    expect(out.entries[0].maxTokenLength).toBe(15);
    expect(out.entries[0].hasLongToken).toBe(false);
    expect(out.entries[1].maxTokenLength).toBe(5);
    expect(out.entries[1].hasLongToken).toBe(false);
    expect(out.longTokenSectionCount).toBe(0);
    expect(out.longestTokenLength).toBe(15);
    expect(out.entries[0].index).toBe(0);
    expect(out.entries[1].index).toBe(1);
  });

  it("measures trimmed heading and returns only allowed keys deterministically", () => {
    const payload = {
      locale: "pt-br",
      extra: "ignore-me",
      sections: [{ heading: "  ab cd  ", text: "e", secret: "x" }]
    };
    const first = runFeature(payload);
    const second = runFeature(JSON.parse(JSON.stringify(payload)));
    expect(first).toEqual(second);
    expect(Object.keys(first).sort()).toEqual(["entries", "locale", "longTokenSectionCount", "longestTokenLength"].sort());
    expect(Object.keys(first.entries[0]).sort()).toEqual(["hasLongToken", "index", "maxTokenLength"].sort());
    expect(first.entries[0].maxTokenLength).toBe(2);
    expect(JSON.stringify(first)).not.toContain("ab cd");
    expect(JSON.stringify(first)).not.toContain("ignore-me");
  });
});
