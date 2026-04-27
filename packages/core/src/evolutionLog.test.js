import { describe, it, expect } from "vitest";
import {
  getEvolutionLog,
  getCurrentVersionHash,
  findVersionByHash,
  getAncestry,
  validateEvolutionEntry,
  addEvolutionEntry,
  createEvolutionEntry,
  emptyDiff,
} from "./evolutionLog.js";

const validEntry = (overrides = {}) => ({
  hash: "h1",
  parentHash: null,
  timestamp: "2026-04-26T00:00:00.000Z",
  authorId: "alice",
  diff: emptyDiff(),
  ...overrides,
});

describe("getEvolutionLog", () => {
  it("returns [] for ontology without evolution field", () => {
    expect(getEvolutionLog({ entities: {} })).toEqual([]);
  });

  it("returns [] for null/undefined ontology", () => {
    expect(getEvolutionLog(null)).toEqual([]);
    expect(getEvolutionLog(undefined)).toEqual([]);
  });

  it("returns [] when evolution is not an array (defensive)", () => {
    expect(getEvolutionLog({ evolution: "bogus" })).toEqual([]);
    expect(getEvolutionLog({ evolution: { wrong: "shape" } })).toEqual([]);
  });

  it("returns the log when properly shaped", () => {
    const ont = { evolution: [validEntry()] };
    expect(getEvolutionLog(ont)).toHaveLength(1);
  });
});

describe("getCurrentVersionHash", () => {
  it("returns null for empty log", () => {
    expect(getCurrentVersionHash({})).toBeNull();
  });

  it("returns the last entry's hash", () => {
    const ont = {
      evolution: [
        validEntry({ hash: "h1", parentHash: null }),
        validEntry({ hash: "h2", parentHash: "h1" }),
      ],
    };
    expect(getCurrentVersionHash(ont)).toBe("h2");
  });

  it("returns null when last entry has no hash (defensive)", () => {
    expect(getCurrentVersionHash({ evolution: [{ noHash: true }] })).toBeNull();
  });
});

describe("findVersionByHash", () => {
  it("locates entry by hash", () => {
    const ont = { evolution: [validEntry({ hash: "h1" }), validEntry({ hash: "h2", parentHash: "h1" })] };
    expect(findVersionByHash(ont, "h1")?.hash).toBe("h1");
    expect(findVersionByHash(ont, "h2")?.hash).toBe("h2");
  });

  it("returns null when hash not found", () => {
    const ont = { evolution: [validEntry({ hash: "h1" })] };
    expect(findVersionByHash(ont, "missing")).toBeNull();
  });

  it("returns null for empty/non-string hash", () => {
    const ont = { evolution: [validEntry({ hash: "h1" })] };
    expect(findVersionByHash(ont, "")).toBeNull();
    expect(findVersionByHash(ont, null)).toBeNull();
  });
});

describe("getAncestry", () => {
  it("returns root → target chain", () => {
    const ont = {
      evolution: [
        validEntry({ hash: "h1", parentHash: null }),
        validEntry({ hash: "h2", parentHash: "h1" }),
        validEntry({ hash: "h3", parentHash: "h2" }),
      ],
    };
    const chain = getAncestry(ont, "h3");
    expect(chain.map(e => e.hash)).toEqual(["h1", "h2", "h3"]);
  });

  it("returns just root for hash === root", () => {
    const ont = { evolution: [validEntry({ hash: "h1", parentHash: null })] };
    expect(getAncestry(ont, "h1").map(e => e.hash)).toEqual(["h1"]);
  });

  it("returns [] when target hash not found", () => {
    const ont = { evolution: [validEntry({ hash: "h1" })] };
    expect(getAncestry(ont, "missing")).toEqual([]);
  });

  it("returns [] when chain is broken (parent not found)", () => {
    // h2 references h1 which is missing
    const ont = { evolution: [validEntry({ hash: "h2", parentHash: "h1" })] };
    expect(getAncestry(ont, "h2")).toEqual([]);
  });

  it("safety-stops on cyclic chain", () => {
    // h1 → h2 → h1 (synthetic cycle)
    const ont = {
      evolution: [
        validEntry({ hash: "h1", parentHash: "h2" }),
        validEntry({ hash: "h2", parentHash: "h1" }),
      ],
    };
    // Не валидная цепочка (нет root) — должна вернуть []
    const chain = getAncestry(ont, "h2");
    expect(chain).toEqual([]);
  });
});

describe("validateEvolutionEntry", () => {
  it("returns [] for valid entry", () => {
    expect(validateEvolutionEntry(validEntry())).toEqual([]);
  });

  it("flags non-object", () => {
    expect(validateEvolutionEntry(null)).toContain("entry must be an object");
    expect(validateEvolutionEntry("string")).toContain("entry must be an object");
  });

  it("flags missing/empty hash", () => {
    expect(validateEvolutionEntry(validEntry({ hash: "" }))).toContain("hash must be a non-empty string");
    expect(validateEvolutionEntry(validEntry({ hash: undefined }))).toContain("hash must be a non-empty string");
  });

  it("flags non-(string|null) parentHash", () => {
    expect(validateEvolutionEntry(validEntry({ parentHash: undefined }))).toContain("parentHash must be string or null");
    expect(validateEvolutionEntry(validEntry({ parentHash: 42 }))).toContain("parentHash must be string or null");
  });

  it("flags missing/empty timestamp", () => {
    expect(validateEvolutionEntry(validEntry({ timestamp: "" }))).toContain("timestamp must be a non-empty ISO-8601 string");
  });

  it("flags missing authorId", () => {
    expect(validateEvolutionEntry(validEntry({ authorId: "" }))).toContain("authorId must be a non-empty string");
  });

  it("flags non-object diff", () => {
    expect(validateEvolutionEntry(validEntry({ diff: null }))).toContain("diff must be an object");
    expect(validateEvolutionEntry(validEntry({ diff: [] }))).toContain("diff must be an object");
  });

  it("flags non-array diff field", () => {
    const errs = validateEvolutionEntry(validEntry({ diff: { addedFields: "not-array" } }));
    expect(errs).toContain("diff.addedFields must be an array if present");
  });

  it("flags non-array upcasters", () => {
    expect(validateEvolutionEntry(validEntry({ upcasters: "bogus" }))).toContain("upcasters must be an array if present");
  });

  it("accepts upcasters as empty array", () => {
    expect(validateEvolutionEntry(validEntry({ upcasters: [] }))).toEqual([]);
  });
});

describe("addEvolutionEntry", () => {
  it("appends entry to empty log", () => {
    const ontology = { entities: {} };
    const entry = createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "alice" });
    const next = addEvolutionEntry(ontology, entry);
    expect(getEvolutionLog(next)).toHaveLength(1);
    expect(getCurrentVersionHash(next)).toBe("h1");
  });

  it("appends entry chained to current", () => {
    const ontology = addEvolutionEntry(
      { entities: {} },
      createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "alice" }),
    );
    const next = addEvolutionEntry(
      ontology,
      createEvolutionEntry({ hash: "h2", parentHash: "h1", authorId: "alice" }),
    );
    expect(getCurrentVersionHash(next)).toBe("h2");
    expect(getAncestry(next, "h2").map(e => e.hash)).toEqual(["h1", "h2"]);
  });

  it("does not mutate the input ontology", () => {
    const ontology = { entities: {} };
    const before = JSON.stringify(ontology);
    addEvolutionEntry(ontology, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    expect(JSON.stringify(ontology)).toBe(before);
  });

  it("throws when entry is invalid", () => {
    expect(() => addEvolutionEntry({}, { invalid: true })).toThrow(/invalid entry/);
  });

  it("throws when parentHash != current", () => {
    const ontology = addEvolutionEntry(
      {},
      createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }),
    );
    expect(() =>
      addEvolutionEntry(
        ontology,
        createEvolutionEntry({ hash: "h2", parentHash: "wrong", authorId: "a" }),
      ),
    ).toThrow(/parentHash mismatch/);
  });

  it("throws when first entry has non-null parentHash", () => {
    expect(() =>
      addEvolutionEntry({}, createEvolutionEntry({ hash: "h1", parentHash: "ghost", authorId: "a" })),
    ).toThrow(/parentHash mismatch/);
  });

  it("throws on duplicate hash", () => {
    const ontology = addEvolutionEntry(
      {},
      createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }),
    );
    expect(() =>
      addEvolutionEntry(
        ontology,
        createEvolutionEntry({ hash: "h1", parentHash: "h1", authorId: "a" }),
      ),
    ).toThrow(/already present/);
  });
});

describe("createEvolutionEntry", () => {
  it("fills defaults (timestamp, empty diff)", () => {
    const e = createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" });
    expect(e.hash).toBe("h1");
    expect(e.parentHash).toBeNull();
    expect(e.authorId).toBe("a");
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(e.diff).toEqual(emptyDiff());
    expect(e).not.toHaveProperty("upcasters");
  });

  it("merges custom diff fields with defaults", () => {
    const e = createEvolutionEntry({
      hash: "h2",
      parentHash: "h1",
      authorId: "a",
      diff: { addedFields: [{ entity: "Task", field: "priority" }] },
    });
    expect(e.diff.addedFields).toHaveLength(1);
    expect(e.diff.removedFields).toEqual([]);
    expect(e.diff.invariantsRemoved).toEqual([]);
  });

  it("preserves explicit timestamp", () => {
    const e = createEvolutionEntry({
      hash: "h1",
      parentHash: null,
      authorId: "a",
      timestamp: "2025-01-01T00:00:00.000Z",
    });
    expect(e.timestamp).toBe("2025-01-01T00:00:00.000Z");
  });

  it("includes upcasters only when provided", () => {
    const withUp = createEvolutionEntry({
      hash: "h1",
      parentHash: null,
      authorId: "a",
      upcasters: [{ fromHash: "h0", toHash: "h1", declarative: {} }],
    });
    expect(withUp.upcasters).toHaveLength(1);

    const withoutUp = createEvolutionEntry({ hash: "h2", parentHash: "h1", authorId: "a" });
    expect(withoutUp).not.toHaveProperty("upcasters");
  });

  it("output passes validateEvolutionEntry", () => {
    const e = createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" });
    expect(validateEvolutionEntry(e)).toEqual([]);
  });
});

describe("integration: chain a full evolution", () => {
  it("simulates 3-step evolution and walks ancestry", () => {
    let ontology = { entities: { Task: { fields: { title: { type: "string" } } } } };

    ontology = addEvolutionEntry(
      ontology,
      createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "alice" }),
    );

    ontology = addEvolutionEntry(
      ontology,
      createEvolutionEntry({
        hash: "h2",
        parentHash: "h1",
        authorId: "alice",
        diff: {
          addedFields: [{ entity: "Task", field: "priority", default: "low" }],
        },
      }),
    );

    ontology = addEvolutionEntry(
      ontology,
      createEvolutionEntry({
        hash: "h3",
        parentHash: "h2",
        authorId: "bob",
        diff: {
          enumChanges: [
            { entity: "Task", field: "status", mapping: { open: "active" } },
          ],
        },
      }),
    );

    expect(getEvolutionLog(ontology)).toHaveLength(3);
    expect(getCurrentVersionHash(ontology)).toBe("h3");
    expect(getAncestry(ontology, "h3").map(e => e.hash)).toEqual(["h1", "h2", "h3"]);
    expect(findVersionByHash(ontology, "h2")?.diff.addedFields).toHaveLength(1);
  });
});
