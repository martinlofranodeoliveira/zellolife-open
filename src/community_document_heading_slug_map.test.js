import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_heading_slug_map.mjs";

function expectTypeMessage(fn, Ctor, msg) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(Ctor);
    expect(e.message).toBe(msg);
    return;
  }
  expect.unreachable();
}

describe("document heading slug map", () => {
  it("matches first contract example", () => {
    const out = runFeature({ locale: "pt-br", sections: [{ heading: "  Exemplo  ", text: "Texto." }, { heading: "Notas", text: "Mais texto" }] });
    expect(out).toEqual({ locale: "pt-br", slugs: [{ heading: "Exemplo", index: 0, slug: "exemplo" }, { heading: "Notas", index: 1, slug: "notas" }] });
  });
  it("matches duplicate example with padded mixed-case locale", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro!", text: "Hi" }, { heading: "Intro", text: "Hey" }] });
    expect(out).toEqual({ locale: "en-us", slugs: [{ heading: "Intro!", index: 0, slug: "intro" }, { heading: "Intro", index: 1, slug: "intro-1" }] });
  });
  it("maps punctuation-only heading to section", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "!!!", text: "Hola" }] });
    expect(out).toEqual({ locale: "es", slugs: [{ heading: "!!!", index: 0, slug: "section" }] });
  });
  it("rejects non-object payload without mutating", () => {
    expectTypeMessage(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature([]), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature("x"), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expectTypeMessage(() => runFeature(42), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    const p = { locale: "es", sections: [{ heading: "A", text: "B" }] };
    const snap = JSON.stringify(p);
    expectTypeMessage(() => runFeature(null), TypeError, "DOCUMENT_OBJECT_REQUIRED");
    expect(JSON.stringify(p)).toBe(snap);
    const r = runFeature(p);
    expect(JSON.stringify(p)).toBe(snap);
    expect(r.slugs.length).toBe(1);
  });
  it("rejects bad locale and bad sections shape in order", () => {
    expectTypeMessage(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectTypeMessage(() => runFeature({ locale: 1, sections: [{ heading: "A", text: "B" }] }), TypeError, "DOCUMENT_LOCALE_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: "no" }), TypeError, "DOCUMENT_SECTIONS_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [] }), TypeError, "DOCUMENT_SECTIONS_INVALID");
  });
  it("rejects bad heading or text", () => {
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: "   ", text: "B" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: 1, text: "B" }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: "A", text: 2 }] }), TypeError, "DOCUMENT_SECTION_INVALID");
    expectTypeMessage(() => runFeature({ locale: "es", sections: [null] }), TypeError, "DOCUMENT_SECTION_INVALID");
  });
  it("rejects cumulative overflow with RangeError", () => {
    const big = "x".repeat(90000);
    expectTypeMessage(() => runFeature({ locale: "es", sections: [{ heading: "A", text: big }, { heading: "B", text: big }] }), RangeError, "DOCUMENT_TOO_LARGE");
  });
  it("normalizes locale and preserves trimmed heading", () => {
    const out = runFeature({ locale: "  PT-BR  ", sections: [{ heading: "  Olá Mundo  ", text: "t" }] });
    expect(out.locale).toBe("pt-br");
    expect(out.slugs[0].heading).toBe("Olá Mundo");
  });
  it("derives slugs with underscore hyphen collapse and trim", () => {
    const out = runFeature({ locale: "en-us", sections: [{ heading: "A__B  -- C", text: "t" }] });
    expect(out.slugs[0].slug).toBe("a-b-c");
    const out2 = runFeature({ locale: "en-us", sections: [{ heading: "--Hello--", text: "t" }] });
    expect(out2.slugs[0].slug).toBe("hello");
  });
  it("truncates to 60 units and re-trims trailing hyphen", () => {
    const long = "a".repeat(70);
    const out = runFeature({ locale: "es", sections: [{ heading: long, text: "t" }] });
    expect(out.slugs[0].slug).toBe("a".repeat(60));
    expect(out.slugs[0].slug.length).toBe(60);
  });
  it("guarantees unique stable slugs with suffixes", () => {
    const out = runFeature({ locale: "es", sections: [{ heading: "Dup", text: "1" }, { heading: "Dup", text: "2" }, { heading: "Dup", text: "3" }] });
    expect(out.slugs.map((s) => s.slug)).toEqual(["dup", "dup-1", "dup-2"]);
    expect(out.slugs.map((s) => s.index)).toEqual([0, 1, 2]);
  });
  it("returns only locale and slugs and is deterministic", () => {
    const payload = { locale: "es", sections: [{ heading: "Hi!", text: "secret-full-text", extra: 1 }], extraTop: 2 };
    const a = runFeature(payload);
    const b = runFeature(payload);
    expect(Object.keys(a).sort()).toEqual(["locale", "slugs"]);
    expect(Object.keys(a.slugs[0]).sort()).toEqual(["heading", "index", "slug"]);
    expect(JSON.stringify(a)).not.toContain("secret-full-text");
    expect(a).toEqual(b);
  });
});
