import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_capital_flag_map.mjs";

describe("document heading capital flag map", () => {
  it("maps pt-br example with trimmed headings", () => {
    const out = runFeature({
      locale: "pt-br",
      sections: [
        { heading: "  Exemplo", text: "Texto." },
        { heading: "exemplo menor", text: "Mais texto" }
      ]
    });
    expect(out).toEqual({
      locale: "pt-br",
      flags: [
        { index: 0, capitalized: true },
        { index: 1, capitalized: false }
      ],
      capitalizedCount: 1,
      nonCapitalizedCount: 1
    });
  });

  it("normalizes locale with trim and lowercase", () => {
    const out = runFeature({
      locale: " EN-US ",
      sections: [{ heading: "  Áudio  ", text: "Hi" }]
    });
    expect(out).toEqual({
      locale: "en-us",
      flags: [{ index: 0, capitalized: true }],
      capitalizedCount: 1,
      nonCapitalizedCount: 0
    });
  });

  it("rejects non-object payload with DOCUMENT_OBJECT_REQUIRED", () => {
    const bad = [null, undefined, 42, "x", [], true];
    for (const value of bad) {
      try {
        runFeature(value);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });

  it("rejects bad locale with DOCUMENT_LOCALE_INVALID without mutating input", () => {
    const payload = { locale: " fr ", sections: [{ heading: "Hola", text: "x" }] };
    const before = JSON.stringify(payload);
    try {
      runFeature(payload);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
    expect(JSON.stringify(payload)).toBe(before);
    expect(payload.locale).toBe(" fr ");
  });

  it("rejects bad sections array with DOCUMENT_SECTIONS_INVALID", () => {
    try {
      runFeature({ locale: "es", sections: [] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: "no" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTIONS_INVALID");
    }
  });

  it("rejects bad heading or text with DOCUMENT_SECTION_INVALID", () => {
    try {
      runFeature({ locale: "es", sections: [{ heading: "   ", text: "ok" }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: 5, text: "ok" }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "ok", text: 7 }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect(err.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });

  it("rejects cumulative overflow with DOCUMENT_TOO_LARGE using original lengths", () => {
    const big = "a".repeat(90000);
    try {
      runFeature({
        locale: "pt-br",
        sections: [
          { heading: "Ab", text: big },
          { heading: "Cd", text: big }
        ]
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_TOO_LARGE");
    }
  });

  it("computes capital flags for ascii, accented, lower, digit, symbol and uncased script", () => {
    const out = runFeature({
      locale: "es",
      sections: [
        { heading: "Hola", text: "t" },
        { heading: "Éxito", text: "t" },
        { heading: "hola", text: "t" },
        { heading: "9 lives", text: "t" },
        { heading: "-dash", text: "t" },
        { heading: "日本語", text: "t" }
      ]
    });
    expect(out.flags).toEqual([
      { index: 0, capitalized: true },
      { index: 1, capitalized: true },
      { index: 2, capitalized: false },
      { index: 3, capitalized: false },
      { index: 4, capitalized: false },
      { index: 5, capitalized: false }
    ]);
    expect(out.capitalizedCount).toBe(2);
    expect(out.nonCapitalizedCount).toBe(4);
    expect(out.capitalizedCount + out.nonCapitalizedCount).toBe(out.flags.length);
  });

  it("returns only locale, flags and counts and stays deterministic", () => {
    const payload = {
      locale: "pt-br",
      sections: [{ heading: "Exemplo", text: "secret body", extra: 1 }],
      other: "drop"
    };
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature({ locale: "pt-br", sections: [{ heading: "Exemplo", text: "secret body" }] });
    expect(a).toEqual(b);
    expect(Object.keys(a).sort()).toEqual(["capitalizedCount", "flags", "locale", "nonCapitalizedCount"]);
    expect(JSON.stringify(a)).not.toContain("secret");
    expect(JSON.stringify(a)).not.toContain("Exemplo");
    expect(JSON.stringify(payload)).toBe(before);
  });
});
