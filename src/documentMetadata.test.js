import { describe, it, expect } from "vitest";
import { summarizeDocumentMetadata } from "./documentMetadata.js";
import * as publicIndex from "./index.js";
import { validateDocument } from "./document.js";

describe("summarizeDocumentMetadata", () => {
  it("is exported from the public index", () => {
    expect(typeof publicIndex.summarizeDocumentMetadata).toBe("function");
    expect(publicIndex.summarizeDocumentMetadata).toBe(summarizeDocumentMetadata);
  });

  it("returns only locale, sectionCount and characterCount with Object.prototype", () => {
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: "Texto." }],
    });
    expect(Object.keys(result).sort()).toEqual(["characterCount", "locale", "sectionCount"]);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result).toEqual({ locale: "pt-br", sectionCount: 1, characterCount: 13 });
  });

  it("normalizes locale with case and surrounding whitespace", () => {
    expect(summarizeDocumentMetadata({
      locale: "  PT-BR  ",
      sections: [{ heading: "Exemplo", text: "Texto." }],
    }).locale).toBe("pt-br");
    expect(summarizeDocumentMetadata({
      locale: "EN-US",
      sections: [{ heading: "Example", text: "Text." }],
    }).locale).toBe("en-us");
    expect(summarizeDocumentMetadata({
      locale: "Es",
      sections: [{ heading: "Ejemplo", text: "Texto." }],
    }).locale).toBe("es");
  });

  it("counts trimmed heading plus original text in UTF-16 units", () => {
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "  Exemplo  ", text: "Texto." }],
    });
    expect(result.characterCount).toBe(13);
    expect(result.sectionCount).toBe(1);
  });

  it("does not count locale or presentation separators", () => {
    const one = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "ab", text: "cd" }],
    });
    expect(one.characterCount).toBe(4);
    const two = summarizeDocumentMetadata({
      locale: "en-us",
      sections: [
        { heading: "ab", text: "cd" },
        { heading: "ef", text: "gh" },
      ],
    });
    expect(two.sectionCount).toBe(2);
    expect(two.characterCount).toBe(8);
  });

  it("counts markup literally without rendering or escaping", () => {
    const heading = "<b>Exemplo</b>";
    const text = "<p>Texto & mais</p>";
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading, text }],
    });
    expect(result.characterCount).toBe(heading.length + text.length);
  });

  it("counts line breaks literally", () => {
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: "a\nb\r\nc" }],
    });
    expect("a\nb\r\nc".length).toBe(6);
    expect(result.characterCount).toBe(7 + 6);
  });

  it("counts Unicode in UTF-16 units", () => {
    const heading = "a\uD83D\uDE00b";
    const text = "c\uD83D\uDE00";
    expect(heading.length).toBe(4);
    expect(text.length).toBe(3);
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading, text }],
    });
    expect(result.characterCount).toBe(7);
    const accented = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "Ol\u00E1", text: "\u00E7" }],
    });
    expect(accented.characterCount).toBe(4);
  });

  it("supports empty text", () => {
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: "" }],
    });
    expect(result).toEqual({ locale: "pt-br", sectionCount: 1, characterCount: 7 });
  });

  it("does not expose titles, texts, ids or unknown fields", () => {
    const result = summarizeDocumentMetadata({
      locale: "pt-br",
      extra: "ignorado",
      id: "doc-123",
      sections: [{ heading: "TituloSecreto", text: "TextoSecreto", extra: "x", id: "s-1" }],
    });
    expect(Object.keys(result).sort()).toEqual(["characterCount", "locale", "sectionCount"]);
    expect(JSON.stringify(result)).not.toContain("TituloSecreto");
    expect(JSON.stringify(result)).not.toContain("TextoSecreto");
    expect(JSON.stringify(result)).not.toContain("doc-123");
  });

  it("does not modify the input and works with deeply frozen input", () => {
    const input = {
      locale: "pt-br",
      sections: [{ heading: "  Exemplo  ", text: "Texto." }],
    };
    const snapshot = JSON.stringify(input);
    const result = summarizeDocumentMetadata(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(result).toEqual({ locale: "pt-br", sectionCount: 1, characterCount: 13 });
    const frozen = {
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: "Texto." }],
    };
    Object.freeze(frozen.sections[0]);
    Object.freeze(frozen.sections);
    Object.freeze(frozen);
    expect(() => summarizeDocumentMetadata(frozen)).not.toThrow();
    expect(summarizeDocumentMetadata(frozen).characterCount).toBe(13);
  });

  it("returns independent objects on successive calls", () => {
    const input = { locale: "pt-br", sections: [{ heading: "Exemplo", text: "Texto." }] };
    const first = summarizeDocumentMetadata(input);
    const second = summarizeDocumentMetadata(input);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    first.locale = "en-us";
    first.characterCount = 0;
    expect(second.locale).toBe("pt-br");
    expect(second.characterCount).toBe(13);
  });

  it("rejects non-object input like validateDocument", () => {
    expect(() => summarizeDocumentMetadata(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => validateDocument(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => summarizeDocumentMetadata(null)).toThrow(TypeError);
  });

  it("rejects invalid locale", () => {
    expect(() => summarizeDocumentMetadata({
      locale: "fr",
      sections: [{ heading: "Exemplo", text: "Texto." }],
    })).toThrow("DOCUMENT_LOCALE_INVALID");
  });

  it("rejects empty sections and invalid section fields", () => {
    expect(() => summarizeDocumentMetadata({ locale: "pt-br", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => summarizeDocumentMetadata({ locale: "pt-br", sections: [{ heading: "   ", text: "Texto." }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => summarizeDocumentMetadata({ locale: "pt-br", sections: [{ heading: "Exemplo", text: 42 }] })).toThrow("DOCUMENT_SECTION_INVALID");
  });

  it("rejects heading longer than 200 UTF-16 units and more than 100 sections", () => {
    expect(() => summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "a".repeat(201), text: "Texto." }],
    })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "a".repeat(200), text: "Texto." }],
    }).characterCount).toBe(200 + 6);
    const hundred = Array.from({ length: 100 }, (_, i) => ({ heading: `Exemplo ${i}`, text: "Texto." }));
    expect(summarizeDocumentMetadata({ locale: "pt-br", sections: hundred }).sectionCount).toBe(100);
    const many = Array.from({ length: 101 }, (_, i) => ({ heading: `Exemplo ${i}`, text: "Texto." }));
    expect(() => summarizeDocumentMetadata({ locale: "pt-br", sections: many })).toThrow("DOCUMENT_SECTIONS_INVALID");
  });

  it("validates heading limit on the original size before trim", () => {
    expect(() => summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: ` ${"a".repeat(200)}`, text: "Texto." }],
    })).toThrow("DOCUMENT_SECTION_INVALID");
  });

  it("rejects documents larger than the shared limit without reducing the budget", () => {
    const big = "x".repeat(180001);
    expect(() => summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: big }],
    })).toThrow("DOCUMENT_TOO_LARGE");
    expect(() => summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: big }],
    })).toThrow(RangeError);
  });

  it("validates total size on the original size before trim", () => {
    const text = "x".repeat(179996);
    expect(() => summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "  a  ", text }],
    })).toThrow("DOCUMENT_TOO_LARGE");
    const ok = summarizeDocumentMetadata({
      locale: "pt-br",
      sections: [{ heading: "a", text: "x".repeat(179999) }],
    });
    expect(ok.characterCount).toBe(180000);
  });
});
