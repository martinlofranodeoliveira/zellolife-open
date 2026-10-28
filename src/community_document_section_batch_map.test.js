import { describe, it, expect } from "vitest";
import { runFeature } from "./community/document_section_batch_map.mjs";

describe("document section batch map", () => {
  it("throws DOCUMENT_OBJECT_REQUIRED for null, array, or non-object without mutating", () => {
    const badInputs = [null, [], [1], "x", 42, undefined];
    for (const bad of badInputs) {
      let name = "";
      try {
        runFeature(bad);
      } catch (e) {
        name = e.message;
        expect(e).toBeInstanceOf(TypeError);
      }
      expect(name).toBe("DOCUMENT_OBJECT_REQUIRED");
    }
    const payload = { locale: "pt-br", sections: [{ heading: "A", text: "B" }] };
    const before = JSON.stringify(payload);
    try {
      runFeature(null);
    } catch {}
    expect(JSON.stringify(payload)).toBe(before);
  });
  it("throws DOCUMENT_BATCH_SIZE_INVALID for non-default sizes before locale checks", () => {
    const badSizes = [0, 101, 1.5, NaN, "2", true, null, {}, [], 2.2];
    for (const batchSize of badSizes) {
      let err = null;
      try {
        runFeature({ locale: "pt-br", sections: [{ heading: "A", text: "B" }], batchSize });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(RangeError);
      expect(err.message).toBe("DOCUMENT_BATCH_SIZE_INVALID");
    }
    let precedence = null;
    try {
      runFeature({ locale: "bad-locale", sections: "nope", batchSize: 0 });
    } catch (e) {
      precedence = e;
    }
    expect(precedence).toBeInstanceOf(RangeError);
    expect(precedence.message).toBe("DOCUMENT_BATCH_SIZE_INVALID");
  });
  it("validates locale and sections shape", () => {
    expect(() => runFeature({ locale: "fr", sections: [{ heading: "A", text: "B" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ sections: [{ heading: "A", text: "B" }] })).toThrow("DOCUMENT_LOCALE_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [] })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: "x" })).toThrow("DOCUMENT_SECTIONS_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "   ", text: "B" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "A".repeat(201), text: "B" }] })).toThrow("DOCUMENT_SECTION_INVALID");
    expect(() => runFeature({ locale: "pt-br", sections: [{ heading: "A", text: 1 }] })).toThrow("DOCUMENT_SECTION_INVALID");
    const big = "x".repeat(90001);
    expect(() => runFeature({ locale: "es", batchSize: 10, sections: [{ heading: "A", text: big }, { heading: "B", text: big }] })).toThrow("DOCUMENT_TOO_LARGE");
  });
  it("partitions 3 sections with batchSize 2", () => {
    const out = runFeature({ locale: "pt-br", batchSize: 2, sections: [{ heading: "Exemplo", text: "Texto." }, { heading: "Notas", text: "Mais texto" }, { heading: "Fim", text: "Ok" }] });
    expect(out).toEqual({ locale: "pt-br", batchSize: 2, sectionCount: 3, batchCount: 2, batches: [[0, 1], [2]] });
    const flat = out.batches.flat();
    expect(flat).toEqual([0, 1, 2]);
    for (const b of out.batches) {
      expect(b.length).toBeGreaterThan(0);
      expect(b.length).toBeLessThanOrEqual(2);
    }
  });
  it("defaults batchSize to 10 and normalizes EN-US", () => {
    const out = runFeature({ locale: " EN-US ", sections: [{ heading: "Intro", text: "Hi" }] });
    expect(out).toEqual({ locale: "en-us", batchSize: 10, sectionCount: 1, batchCount: 1, batches: [[0]] });
    const out2 = runFeature({ locale: "es", batchSize: undefined, sections: [{ heading: "H", text: "T" }] });
    expect(out2.batchSize).toBe(10);
    expect(out2.batches).toEqual([[0]]);
  });
  it("returns only expected keys and preserves input", () => {
    const payload = { locale: " es ", batchSize: 1, sections: [{ heading: "A", text: "B" }, { heading: "C", text: "D" }], extra: "ignore" };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    expect(Object.keys(out).sort()).toEqual(["batchCount", "batchSize", "batches", "locale", "sectionCount"]);
    expect(JSON.stringify(payload)).toBe(before);
    expect(JSON.stringify(out)).not.toContain("extra");
    expect(JSON.stringify(out)).not.toContain("\"heading\"");
  });
});
