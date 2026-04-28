import { describe, it, expect } from "vitest";
import {
  gapCellKey,
  computeCanonicalGapSet,
  compareReaderObservations,
  detectReaderEquivalenceDrift,
  buildPerfectObservation,
} from "./driftDetector.js";

const ontology = {
  entities: {
    Task: {
      fields: {
        title: { type: "string" },
        priority: { type: "string" },
        status: { type: "enum", values: ["open", "done"] },
        assignee: { type: "ref", entity: "User" },
      },
    },
    User: { fields: { name: { type: "string" } } },
  },
};

// ─── gapCellKey ──────────────────────────────────────────────────────────────

describe("gapCellKey", () => {
  it("formats stable key", () => {
    expect(gapCellKey("Task", "t1", "priority")).toBe("Task:t1:priority");
  });

  it("coerces numeric ids", () => {
    expect(gapCellKey("Task", 42, "title")).toBe("Task:42:title");
  });
});

// ─── computeCanonicalGapSet ──────────────────────────────────────────────────

describe("computeCanonicalGapSet", () => {
  it("returns empty for fully-populated world", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", priority: "high", status: "open", assignee: "u1" }],
      User: [{ id: "u1", name: "Alice" }],
    };
    const result = computeCanonicalGapSet(world, ontology);
    expect(result.cells).toEqual([]);
    expect(result.byKey.size).toBe(0);
  });

  it("detects missingField gap", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", status: "open", assignee: "u1" }],
      User: [{ id: "u1", name: "Alice" }],
    };
    const result = computeCanonicalGapSet(world, ontology);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toMatchObject({ entity: "Task", entityId: "t1", field: "priority", kind: "missingField" });
  });

  it("detects unknownEnumValue gap", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", priority: "low", status: "archived", assignee: "u1" }],
      User: [{ id: "u1", name: "Alice" }],
    };
    const result = computeCanonicalGapSet(world, ontology);
    const enumGap = result.cells.find(c => c.field === "status");
    expect(enumGap?.kind).toBe("unknownEnumValue");
  });

  it("detects removedEntityRef gap", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", priority: "low", status: "open", assignee: "u-missing" }],
      User: [],
    };
    const result = computeCanonicalGapSet(world, ontology);
    const refGap = result.cells.find(c => c.field === "assignee");
    expect(refGap?.kind).toBe("removedEntityRef");
  });

  it("collects gaps across multiple rows and entities", () => {
    const world = {
      Task: [
        { id: "t1", title: "T1", status: "open", assignee: "u1" }, // missing priority
        { id: "t2", title: "T2", priority: "high", assignee: "u-missing" }, // missing status + bad ref
      ],
      User: [{ id: "u1" }], // missing name
    };
    const result = computeCanonicalGapSet(world, ontology);
    const keys = result.cells.map(c => gapCellKey(c.entity, c.entityId, c.field)).sort();
    expect(keys).toContain("Task:t1:priority");
    expect(keys).toContain("Task:t2:status");
    expect(keys).toContain("Task:t2:assignee");
    expect(keys).toContain("User:u1:name");
    expect(result.byKey.size).toBe(4);
  });

  it("handles missing collections gracefully", () => {
    const world = {}; // no Task, no User
    const result = computeCanonicalGapSet(world, ontology);
    expect(result.cells).toEqual([]);
  });

  it("resolves collections via PascalCase / lowercase / typeMap", () => {
    const world = { tasks: [{ id: "t1", title: "Hi", priority: "low", status: "open", assignee: "u1" }] };
    // No User collection at all
    const result = computeCanonicalGapSet(world, ontology, { typeMap: { task: "tasks" } });
    // Task is found via typeMap; no missing/enum gaps. assignee ref → missing because User collection absent.
    const refGap = result.cells.find(c => c.field === "assignee");
    expect(refGap?.kind).toBe("removedEntityRef");
  });

  it("skips rows without id", () => {
    const world = { Task: [{ title: "no-id" }] };
    const result = computeCanonicalGapSet(world, ontology);
    expect(result.cells).toEqual([]);
  });

  it("dedupes byKey (same cell scanned twice should not duplicate)", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", status: "open", assignee: "u1" }],
      User: [{ id: "u1", name: "Alice" }],
    };
    const result = computeCanonicalGapSet(world, ontology);
    expect(result.byKey.size).toBe(result.cells.length);
  });
});

// ─── compareReaderObservations ───────────────────────────────────────────────

describe("compareReaderObservations", () => {
  function buildCanonical() {
    const world = {
      Task: [{ id: "t1", title: "Hi", status: "open", assignee: "u1" }], // missing priority
      User: [{ id: "u1", name: "Alice" }],
    };
    return computeCanonicalGapSet(world, ontology);
  }

  it("equivalent=true when all observations agree", () => {
    const canonical = buildCanonical();
    const obs1 = buildPerfectObservation("pixels", canonical);
    const obs2 = buildPerfectObservation("voice", canonical);
    const report = compareReaderObservations(canonical, [obs1, obs2]);
    expect(report.equivalent).toBe(true);
    expect(report.events).toEqual([]);
    expect(report.summary.totalCells).toBe(1);
    expect(report.summary.perReaderGapCount).toEqual({ pixels: 1, voice: 1 });
  });

  it("emits drift event when readers disagree", () => {
    const canonical = buildCanonical();
    const obs1 = buildPerfectObservation("pixels", canonical);
    const obs2 = { reader: "voice", gapCells: [] }; // voice silently missed the gap
    const report = compareReaderObservations(canonical, [obs1, obs2]);
    expect(report.equivalent).toBe(false);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].agreeing).toEqual(["pixels"]);
    expect(report.events[0].disagreeing).toEqual(["voice"]);
    expect(report.events[0].cell.field).toBe("priority");
  });

  it("ignores cells outside scope of all but one reader", () => {
    const canonical = buildCanonical();
    const cell = canonical.cells[0];
    const key = gapCellKey(cell.entity, cell.entityId, cell.field);
    const obs1 = { reader: "pixels", gapCells: [cell], scope: [key] };
    const obs2 = { reader: "voice", gapCells: [], scope: [] }; // voice has no scope on this cell
    const report = compareReaderObservations(canonical, [obs1, obs2]);
    expect(report.equivalent).toBe(true);
    expect(report.events).toEqual([]);
  });

  it("scope=null means «reader sees all» (full equivalence required)", () => {
    const canonical = buildCanonical();
    const cell = canonical.cells[0];
    const obs1 = { reader: "pixels", gapCells: [cell] }; // no scope → all in scope
    const obs2 = { reader: "voice", gapCells: [] };       // no scope → all in scope
    const report = compareReaderObservations(canonical, [obs1, obs2]);
    expect(report.equivalent).toBe(false);
    expect(report.events).toHaveLength(1);
  });

  it("considers cells found by observations but not in canonical (extraneous gaps)", () => {
    const canonical = buildCanonical();
    const phantom = { entity: "Task", entityId: "t1", field: "phantomField", kind: "missingField" };
    const obs1 = { reader: "pixels", gapCells: [...canonical.cells, phantom] };
    const obs2 = buildPerfectObservation("voice", canonical);
    const report = compareReaderObservations(canonical, [obs1, obs2]);
    expect(report.equivalent).toBe(false);
    const phantomEvent = report.events.find(e => e.cell.field === "phantomField");
    expect(phantomEvent?.agreeing).toEqual(["pixels"]);
    expect(phantomEvent?.disagreeing).toEqual(["voice"]);
  });

  it("equivalent=true for empty canonical and empty observations", () => {
    const empty = { cells: [], byKey: new Map() };
    const report = compareReaderObservations(empty, []);
    expect(report.equivalent).toBe(true);
    expect(report.summary.totalCells).toBe(0);
  });

  it("does not flag drift when only 1 reader is in scope", () => {
    const canonical = buildCanonical();
    const cell = canonical.cells[0];
    const obs1 = buildPerfectObservation("pixels", canonical);
    const report = compareReaderObservations(canonical, [obs1]);
    expect(report.equivalent).toBe(true);
  });

  it("throws on missing canonical/observations", () => {
    expect(() => compareReaderObservations(null, [])).toThrow(/canonical gap-set/);
    expect(() => compareReaderObservations({ cells: [], byKey: new Map() }, null)).toThrow(/observations\[\]/);
  });
});

// ─── detectReaderEquivalenceDrift (composition) ──────────────────────────────

describe("detectReaderEquivalenceDrift", () => {
  it("composes computeCanonicalGapSet + compareReaderObservations", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", status: "open", assignee: "u1" }],
      User: [{ id: "u1", name: "Alice" }],
    };
    const canonical = computeCanonicalGapSet(world, ontology);
    const obs1 = buildPerfectObservation("pixels", canonical);
    const obs2 = buildPerfectObservation("voice", canonical);
    const report = detectReaderEquivalenceDrift(world, ontology, [obs1, obs2]);
    expect(report.equivalent).toBe(true);
    expect(report.summary.totalCells).toBe(1);
  });

  it("detects drift when one reader silently passes through legacy gap", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", status: "open", assignee: "u1" }], // missing priority
      User: [{ id: "u1", name: "Alice" }],
    };
    const canonical = computeCanonicalGapSet(world, ontology);
    const pixelsObs = buildPerfectObservation("pixels", canonical);
    const buggyVoiceObs = { reader: "voice", gapCells: [] }; // bug: voice doesn't acknowledge gap
    const report = detectReaderEquivalenceDrift(world, ontology, [pixelsObs, buggyVoiceObs]);
    expect(report.equivalent).toBe(false);
    expect(report.events[0].cell.field).toBe("priority");
  });

  it("supports 4-way comparison (pixels / voice / agent / document)", () => {
    const world = {
      Task: [{ id: "t1", title: "Hi", status: "open", assignee: "u1" }],
      User: [{ id: "u1", name: "Alice" }],
    };
    const canonical = computeCanonicalGapSet(world, ontology);
    const allFour = ["pixels", "voice", "agent", "document"].map(r => buildPerfectObservation(r, canonical));
    const report = detectReaderEquivalenceDrift(world, ontology, allFour);
    expect(report.equivalent).toBe(true);
    expect(Object.keys(report.summary.perReaderGapCount).sort()).toEqual(["agent", "document", "pixels", "voice"]);
  });
});

// ─── buildPerfectObservation ─────────────────────────────────────────────────

describe("buildPerfectObservation", () => {
  it("clones canonical cells", () => {
    const canonical = { cells: [{ entity: "Task", entityId: "t1", field: "priority", kind: "missingField" }], byKey: new Map() };
    const obs = buildPerfectObservation("pixels", canonical);
    expect(obs.reader).toBe("pixels");
    expect(obs.gapCells).toEqual(canonical.cells);
    expect(obs.gapCells).not.toBe(canonical.cells);
  });
});
