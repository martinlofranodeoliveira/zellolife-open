import { describe, it, expect } from "vitest";
import { chunkPlainTextDocument } from "./documentChunks.js";
import { renderPlainTextDocument } from "./plainTextDocument.js";
import * as publicIndex from "./index.js";

function tinyDoc(over = {}) {
  return {
    locale: "pt-br",
    sections: [{ heading: "Exemplo sintético", text: "Texto sintético." }],
    ...over,
  };
}

function isHigh(code) {
  return code >= 0xd800 && code <= 0xdbff;
}
function isLow(code) {
  return code >= 0xdc00 && code <= 0xdfff;
}

function assertNoSplitPair(chunks) {
  for (let i = 0; i < chunks.length - 1; i += 1) {
    const a = chunks[i];
    const b = chunks[i + 1];
    const last = a.charCodeAt(a.length - 1);
    const first = b.charCodeAt(0);
    expect(!(isHigh(last) && isLow(first))).toBe(true);
  }
}

describe("chunkPlainTextDocument", () => {
  it("is exported from the public index", () => {
    expect(typeof publicIndex.chunkPlainTextDocument).toBe("function");
    expect(publicIndex.chunkPlainTextDocument).toBe(chunkPlainTextDocument);
  });

  it("uses 4000 by default and for explicit undefined", () => {
    const input = { locale: "pt-br", sections: [{ heading: "H", text: "y".repeat(5000) }] };
    const expected = renderPlainTextDocument(input).text;
    expect(expected.length).toBe(5002);
    const a = chunkPlainTextDocument(input);
    const b = chunkPlainTextDocument(input, undefined);
    const c = chunkPlainTextDocument(input, 4000);
    for (const r of [a, b, c]) {
      expect(r.locale).toBe("pt-br");
      expect(r.chunks.map((s) => s.length)).toEqual([4000, 1002]);
      expect(r.chunks.join("")).toBe(expected);
    }
    expect(a).toEqual(b);
  });

  it("accepts inclusive boundaries 256 and 16384", () => {
    const input = tinyDoc();
    const expected = renderPlainTextDocument(input).text;
    expect(chunkPlainTextDocument(input, 256).chunks.join("")).toBe(expected);
    expect(chunkPlainTextDocument(input, 16384).chunks.join("")).toBe(expected);
  });

  it("rejects non-integer/coerced/out-of-range sizes with fixed RangeError", () => {
    const input = tinyDoc();
    const bad = [null, true, false, "256", new Number(256), 256n, Symbol("s"), NaN, Infinity, -Infinity, 256.5, 255, 16385, 0, -1, {}, [], undefined === null ? 1 : null];
    for (const size of bad) {
      expect(() => chunkPlainTextDocument(input, size)).toThrow("DOCUMENT_CHUNK_SIZE_INVALID");
    }
    try {
      chunkPlainTextDocument(input, "256");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_CHUNK_SIZE_INVALID");
    }
  });

  it("checks size before document so size wins on double-invalid input", () => {
    expect(() => chunkPlainTextDocument(null, 10)).toThrow("DOCUMENT_CHUNK_SIZE_INVALID");
    expect(() => chunkPlainTextDocument(null, 256)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => chunkPlainTextDocument({ locale: "fr", sections: [{ heading: "H", text: "T" }] }, 100)).toThrow("DOCUMENT_CHUNK_SIZE_INVALID");
  });

  it("normalizes locale and preserves original document errors and limits", () => {
    const r = chunkPlainTextDocument({ locale: "  PT-BR  ", sections: [{ heading: "H", text: "T" }] }, 256);
    expect(r.locale).toBe("pt-br");
    expect(() => chunkPlainTextDocument({ locale: "fr", sections: [{ heading: "H", text: "T" }] }, 256)).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => chunkPlainTextDocument({ locale: "pt-br", sections: [] }, 256)).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => chunkPlainTextDocument({ locale: "pt-br", sections: [{ heading: "   ", text: "T" }] }, 256)).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => chunkPlainTextDocument({ locale: "pt-br", sections: [{ heading: "a".repeat(201), text: "T" }] }, 256)).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => chunkPlainTextDocument({ locale: "pt-br", sections: [{ heading: "H", text: "x".repeat(180001) }] }, 256)).toThrow("DOCUMENT_TOO_LARGE");
  });

  it("cuts greedily at maxCharacters and rejoins exactly", () => {
    const input = { locale: "en-us", sections: [{ heading: "H", text: "x".repeat(600) }] };
    const expected = renderPlainTextDocument(input).text;
    expect(expected.length).toBe(602);
    const { chunks } = chunkPlainTextDocument(input, 256);
    expect(chunks.map((s) => s.length)).toEqual([256, 256, 90]);
    expect(chunks.join("")).toBe(expected);
    assertNoSplitPair(chunks);
  });

  it("never splits a valid surrogate pair at the cut", () => {
    const input = { locale: "pt-br", sections: [{ heading: "H", text: "a".repeat(253) + "\uD83D\uDE00" + "b".repeat(10) }] };
    const expected = renderPlainTextDocument(input).text;
    const { chunks } = chunkPlainTextDocument(input, 256);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(255);
    expect(chunks.join("")).toBe(expected);
    expect(chunks[1].charCodeAt(0)).toBe(0xd83d);
    expect(chunks[1].charCodeAt(1)).toBe(0xde00);
    assertNoSplitPair(chunks);
  });

  it("preserves lone surrogates exactly", () => {
    const input = { locale: "es", sections: [{ heading: "H", text: "a\uD800b\uDC00c" }] };
    const expected = renderPlainTextDocument(input).text;
    const { chunks } = chunkPlainTextDocument(input, 256);
    expect(chunks.join("")).toBe(expected);
    expect(chunks[0].charCodeAt(3)).toBe(0xd800);
    expect(chunks[0].charCodeAt(5)).toBe(0xdc00);
  });

  it("keeps markup, CRLF, whitespace and combining marks literal", () => {
    const input = { locale: "pt-br", sections: [{ heading: "Exemplo sintético", text: "<p>Texto & mais</p>\r\n  espaços  \ne\u0301" }] };
    const expected = renderPlainTextDocument(input).text;
    const { chunks } = chunkPlainTextDocument(input, 256);
    expect(chunks.join("")).toBe(expected);
    expect(chunks.join("")).toContain("<p>Texto & mais</p>\r\n");
  });

  it("returns fresh containers and never mutates frozen input", () => {
    const input = Object.freeze({ locale: "pt-br", sections: Object.freeze([Object.freeze({ heading: "  H  ", text: "T1\nT2" })]) });
    const snapshot = JSON.stringify(input);
    const a = chunkPlainTextDocument(input, 256);
    const b = chunkPlainTextDocument(input, 256);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(Object.keys(a).sort()).toEqual(["chunks", "locale"]);
    expect(Array.isArray(a.chunks)).toBe(true);
    expect(a.chunks.every((s) => typeof s === "string")).toBe(true);
    expect(a).not.toBe(b);
    expect(a.chunks).not.toBe(b.chunks);
    expect(a).toEqual(b);
    a.chunks.push("x");
    expect(b.chunks.length).toBe(1);
    expect(chunkPlainTextDocument(input, 256).chunks.length).toBe(1);
    const names = Object.getOwnPropertyNames(b.chunks);
    expect(names.sort()).toEqual(["0", "length"].sort());
    for (const c of b.chunks) expect(c.length).toBeGreaterThan(0);
  });
});
