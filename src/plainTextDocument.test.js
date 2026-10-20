import { describe, it, expect } from "vitest";
import { renderPlainTextDocument } from "./plainTextDocument.js";
import * as publicIndex from "./index.js";
import { validateDocument } from "./document.js";

describe("renderPlainTextDocument", () => {
  it("is exported from the public index", () => {
    expect(typeof publicIndex.renderPlainTextDocument).toBe("function");
    expect(publicIndex.renderPlainTextDocument).toBe(renderPlainTextDocument);
  });

  it("renders one synthetic section as heading LF text", () => {
    const result = renderPlainTextDocument({
      locale: "pt-br",
      sections: [{ heading: "Exemplo sintético", text: "Texto fornecido pela pessoa usuária." }],
    });
    expect(result).toEqual({
      locale: "pt-br",
      text: "Exemplo sintético\nTexto fornecido pela pessoa usuária.",
    });
  });

  it("returns exactly locale and text keys", () => {
    const result = renderPlainTextDocument({
      locale: "es",
      sections: [{ heading: "Ejemplo sintético", text: "Texto aportado." }],
    });
    expect(Object.keys(result).sort()).toEqual(["locale", "text"]);
  });

  it("trims headings and joins sections with two LFs", () => {
    const result = renderPlainTextDocument({
      locale: "en-us",
      sections: [
        { heading: "  First synthetic example  ", text: "First user text." },
        { heading: "Second synthetic example", text: "Second user text." },
      ],
    });
    expect(result.locale).toBe("en-us");
    expect(result.text).toBe("First synthetic example\nFirst user text.\n\nSecond synthetic example\nSecond user text.");
  });

  it("normalizes locale with case and surrounding whitespace", () => {
    const result = renderPlainTextDocument({
      locale: "  PT-BR  ",
      sections: [{ heading: "Exemplo sintético", text: "Texto." }],
    });
    expect(result.locale).toBe("pt-br");
  });

  it("does not interpret or escape HTML markup", () => {
    const result = renderPlainTextDocument({
      locale: "pt-br",
      sections: [{ heading: "<b>Exemplo sintético</b>", text: "<p>Texto & mais</p>" }],
    });
    expect(result.text).toBe("<b>Exemplo sintético</b>\n<p>Texto & mais</p>");
  });

  it("preserves original line breaks inside section text", () => {
    const result = renderPlainTextDocument({
      locale: "pt-br",
      sections: [{ heading: "Exemplo sintético", text: "linha um\nlinha dois\r\nlinha três" }],
    });
    expect(result.text).toBe("Exemplo sintético\nlinha um\nlinha dois\r\nlinha três");
  });

  it("does not modify the input object", () => {
    const input = {
      locale: "pt-br",
      sections: [{ heading: "  Exemplo sintético  ", text: "Texto original." }],
    };
    const snapshot = JSON.stringify(input);
    renderPlainTextDocument(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("rejects non-object input like validateDocument", () => {
    expect(() => renderPlainTextDocument(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
    expect(() => validateDocument(null)).toThrow("DOCUMENT_OBJECT_REQUIRED");
  });

  it("rejects invalid locale", () => {
    expect(() => renderPlainTextDocument({
      locale: "fr",
      sections: [{ heading: "Exemplo sintético", text: "Texto." }],
    })).toThrow("DOCUMENT_LOCALE_INVALID");
  });

  it("rejects empty sections and invalid sections", () => {
    expect(() => renderPlainTextDocument({ locale: "pt-br", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => renderPlainTextDocument({ locale: "pt-br", sections: [{ heading: "   ", text: "Texto." }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => renderPlainTextDocument({ locale: "pt-br", sections: [{ heading: "Exemplo sintético", text: 42 }] })).toThrow("DOCUMENT_SECTION_INVALID");
  });

  it("rejects heading longer than 200 chars and more than 100 sections", () => {
    expect(() => renderPlainTextDocument({
      locale: "pt-br",
      sections: [{ heading: "a".repeat(201), text: "Texto." }],
    })).toThrow("DOCUMENT_SECTION_INVALID");
    const many = Array.from({ length: 101 }, (_, i) => ({ heading: `Exemplo sintético ${i}`, text: "Texto." }));
    expect(() => renderPlainTextDocument({ locale: "pt-br", sections: many })).toThrow("DOCUMENT_SECTIONS_INVALID");
  });

  it("rejects documents larger than the shared HTML limit", () => {
    const big = "x".repeat(180001);
    expect(() => renderPlainTextDocument({
      locale: "pt-br",
      sections: [{ heading: "Exemplo sintético", text: big }],
    })).toThrow("DOCUMENT_TOO_LARGE");
  });
});
