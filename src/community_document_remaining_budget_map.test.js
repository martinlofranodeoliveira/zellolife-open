import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_remaining_budget_map.mjs";

describe("document remaining budget map", () => {
  it("rejects non-object payload without mutating", () => {
    const bad = [null, [], "x", 42, undefined, 7];
    for (const v of bad) {
      try {
        runFeature(v);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_OBJECT_REQUIRED");
      }
    }
  });

  it("checks locale before sections shape", () => {
    try {
      runFeature({ locale: "xx", sections: "bad" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
    try {
      runFeature({ locale: 123, sections: [] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
    }
  });

  it("accepts only pt-br en-us es after trim and lowercase", () => {
    expect(runFeature({ locale: "pt-br", sections: [{ heading: "A", text: "b" }] }).locale).toBe("pt-br");
    expect(runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] }).locale).toBe("en-us");
    expect(runFeature({ locale: "  Es ", sections: [{ heading: "H", text: "T" }] }).locale).toBe("es");
    expect(runFeature({ locale: "PT-BR", sections: [{ heading: "H", text: "T" }] }).locale).toBe("pt-br");
    for (const loc of ["fr", "", "   ", "pt", "en", "pt-brx"]) {
      try {
        runFeature({ locale: loc, sections: [{ heading: "H", text: "T" }] });
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_LOCALE_INVALID");
      }
    }
  });

  it("validates sections array shape 1 to 100", () => {
    for (const s of ["x", {}, null, [], Array.from({ length: 101 }, () => ({ heading: "H", text: "T" }))] ) {
      try {
        runFeature({ locale: "es", sections: s });
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toBe("DOCUMENT_SECTIONS_INVALID");
      }
    }
  });

  it("validates heading and text per section", () => {
    try {
      runFeature({ locale: "es", sections: [{ heading: "   ", text: "ok" }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "A".repeat(201), text: "ok" }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [{ heading: "Ok", text: 5 }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
    try {
      runFeature({ locale: "es", sections: [null] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError);
      expect(e.message).toBe("DOCUMENT_SECTION_INVALID");
    }
  });

  it("matches first contract example with original heading length", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }, { heading: "Notas", text: "Mais texto" }] });
    expect(out).toEqual({ locale: "pt-br", sectionCount: 2, totalChars: 32, remainingChars: 179968, sections: [{ index: 0, sectionChars: 17, cumulativeChars: 17, remainingChars: 179983 }, { index: 1, sectionChars: 15, cumulativeChars: 32, remainingChars: 179968 }] });
  });

  it("matches second contract example and normalizes locale", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", sectionCount: 1, totalChars: 7, remainingChars: 179993, sections: [{ index: 0, sectionChars: 7, cumulativeChars: 7, remainingChars: 179993 }] });
  });

  it("returns only allowed keys with no headings text or unknown fields", () => {
    const out = runFeature({ locale: "es", extra: "no", sections: [{ heading: "H", text: "T", extra2: 1 }] });
    expect(Object.keys(out).sort()).toEqual(["locale", "remainingChars", "sectionCount", "sections", "totalChars"]);
    expect(Object.keys(out.sections[0]).sort()).toEqual(["cumulativeChars", "index", "remainingChars", "sectionChars"]);
    expect(JSON.stringify(out)).not.toContain("H");
    expect("extra" in out).toBe(false);
  });

  it("is deterministic and preserves input", () => {
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "bc" }, { heading: "DE", text: "f" }] };
    const before = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature(payload);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(JSON.stringify(payload)).toBe(before);
    expect(a.totalChars).toBe(6);
    expect(a.remainingChars).toBe(179994);
    expect(a.sections[1].cumulativeChars).toBe(a.totalChars);
    expect(a.sections[1].remainingChars).toBe(a.remainingChars);
  });

  it("accepts exactly 180000 and rejects 180001", () => {
    const heading = "H".repeat(200);
    const fill = 180000 - 200;
    const okPayload = { locale: "es", sections: [{ heading, text: "x".repeat(fill) }] };
    const before = JSON.stringify(okPayload);
    const ok = runFeature(okPayload);
    expect(ok.totalChars).toBe(180000);
    expect(ok.remainingChars).toBe(0);
    expect(ok.sections[0].remainingChars).toBe(0);
    expect(JSON.stringify(okPayload)).toBe(before);
    const badPayload = { locale: "es", sections: [{ heading, text: "x".repeat(fill + 1) }] };
    const badBefore = JSON.stringify(badPayload);
    try {
      runFeature(badPayload);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e.message).toBe("DOCUMENT_TOO_LARGE");
    }
    expect(JSON.stringify(badPayload)).toBe(badBefore);
  });

  it("counts UTF-16 units and accumulates across sections", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "ab", text: "c" }, { heading: "d", text: "ef" }] });
    expect(out.sections[0]).toEqual({ index: 0, sectionChars: 3, cumulativeChars: 3, remainingChars: 179997 });
    expect(out.sections[1]).toEqual({ index: 1, sectionChars: 3, cumulativeChars: 6, remainingChars: 179994 });
  });
});
