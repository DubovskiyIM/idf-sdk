import { describe, it, expect } from "vitest";
import {
  DEFAULT_READER_POLICIES,
  DEFAULT_PLACEHOLDER,
  getReaderPolicy,
  detectFieldGap,
  resolveGap,
  resolveFieldGap,
  scanEntityGaps,
} from "./readerGapPolicy.js";

// ─── DEFAULT_READER_POLICIES ─────────────────────────────────────────────────

describe("DEFAULT_READER_POLICIES", () => {
  it("declares all 4 readers", () => {
    expect(Object.keys(DEFAULT_READER_POLICIES).sort()).toEqual(["agent", "document", "pixels", "voice"]);
  });

  it("matches spec §4.5 — pixels", () => {
    expect(DEFAULT_READER_POLICIES.pixels).toEqual({
      missingField: "hidden",
      unknownEnumValue: "passthrough",
      removedEntityRef: "broken-link",
    });
  });

  it("matches spec §4.5 — voice", () => {
    expect(DEFAULT_READER_POLICIES.voice).toEqual({
      missingField: "omit",
      unknownEnumValue: "omit",
      removedEntityRef: "omit",
    });
  });

  it("matches spec §4.5 — agent", () => {
    expect(DEFAULT_READER_POLICIES.agent).toEqual({
      missingField: "omit",
      unknownEnumValue: "passthrough",
      removedEntityRef: "broken-link",
    });
  });

  it("matches spec §4.5 — document", () => {
    expect(DEFAULT_READER_POLICIES.document).toEqual({
      missingField: "placeholder",
      unknownEnumValue: "placeholder",
      removedEntityRef: "broken-link",
    });
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(DEFAULT_READER_POLICIES)).toBe(true);
    expect(Object.isFrozen(DEFAULT_READER_POLICIES.pixels)).toBe(true);
  });
});

// ─── getReaderPolicy ─────────────────────────────────────────────────────────

describe("getReaderPolicy", () => {
  it("returns default policy for known reader", () => {
    expect(getReaderPolicy("pixels")).toEqual(DEFAULT_READER_POLICIES.pixels);
  });

  it("merges partial override on top of default", () => {
    const policy = getReaderPolicy("pixels", { missingField: "placeholder" });
    expect(policy.missingField).toBe("placeholder");
    expect(policy.unknownEnumValue).toBe("passthrough");
    expect(policy.removedEntityRef).toBe("broken-link");
  });

  it("returns a fresh copy (not the frozen default)", () => {
    const policy = getReaderPolicy("voice");
    expect(Object.isFrozen(policy)).toBe(false);
    expect(policy).toEqual(DEFAULT_READER_POLICIES.voice);
  });

  it("throws for unknown reader", () => {
    expect(() => getReaderPolicy("xml")).toThrow(/unknown reader/);
  });

  it("ignores invalid override", () => {
    expect(getReaderPolicy("pixels", null)).toEqual(DEFAULT_READER_POLICIES.pixels);
    expect(getReaderPolicy("pixels", "bogus")).toEqual(DEFAULT_READER_POLICIES.pixels);
  });
});

// ─── detectFieldGap ──────────────────────────────────────────────────────────

describe("detectFieldGap", () => {
  it("returns missingField for undefined value", () => {
    const gap = detectFieldGap(undefined, { type: "string" }, { entity: "Task", field: "title" });
    expect(gap).toEqual({ kind: "missingField", field: "title", entity: "Task" });
  });

  it("returns null for present scalar value", () => {
    expect(detectFieldGap("hello", { type: "string" })).toBeNull();
    expect(detectFieldGap(0, { type: "number" })).toBeNull();
    expect(detectFieldGap(false, { type: "boolean" })).toBeNull();
    expect(detectFieldGap(null, { type: "string" })).toBeNull();
  });

  it("returns unknownEnumValue when value not in enum.values[]", () => {
    const def = { type: "enum", values: ["open", "done"] };
    expect(detectFieldGap("archived", def, { field: "status", entity: "Task" })).toEqual({
      kind: "unknownEnumValue",
      value: "archived",
      field: "status",
      entity: "Task",
    });
  });

  it("returns null when value in enum.values[]", () => {
    expect(detectFieldGap("open", { type: "enum", values: ["open", "done"] })).toBeNull();
  });

  it("supports valueLabels-style enum (host convention)", () => {
    const def = { type: "string", valueLabels: { open: "Open", done: "Done" } };
    expect(detectFieldGap("open", def)).toBeNull();
    expect(detectFieldGap("archived", def)?.kind).toBe("unknownEnumValue");
  });

  it("returns removedEntityRef when ref target not in world", () => {
    const def = { type: "ref", entity: "User" };
    const world = { User: [{ id: "u1" }] };
    const gap = detectFieldGap("u-missing", def, { world, field: "assignee", entity: "Task" });
    expect(gap?.kind).toBe("removedEntityRef");
    expect(gap?.value).toBe("u-missing");
  });

  it("returns null when ref target found in PascalCase collection", () => {
    const def = { type: "ref", entity: "User" };
    const world = { User: [{ id: "u1" }] };
    expect(detectFieldGap("u1", def, { world })).toBeNull();
  });

  it("returns null when ref target found via lowercase + plural typeMap", () => {
    const def = { type: "ref", entity: "User" };
    const world = { users: [{ id: "u1" }] };
    expect(detectFieldGap("u1", def, { world, typeMap: { user: "users" } })).toBeNull();
  });

  it("skips ref check when world is not provided", () => {
    const def = { type: "ref", entity: "User" };
    expect(detectFieldGap("u-anything", def)).toBeNull();
  });

  it("entityRef alias also detected", () => {
    const def = { type: "entityRef", entity: "User" };
    const world = { User: [] };
    expect(detectFieldGap("u-missing", def, { world })?.kind).toBe("removedEntityRef");
  });
});

// ─── resolveGap ──────────────────────────────────────────────────────────────

describe("resolveGap", () => {
  const gap = { kind: "missingField", field: "priority", entity: "Task" };

  it("returns hidden action for pixels.missingField", () => {
    const r = resolveGap(gap, DEFAULT_READER_POLICIES.pixels);
    expect(r.action).toBe("hidden");
    expect(r.gap).toBe(gap);
    expect(r).not.toHaveProperty("placeholder");
    expect(r).not.toHaveProperty("value");
  });

  it("returns omit action for voice.missingField", () => {
    expect(resolveGap(gap, DEFAULT_READER_POLICIES.voice).action).toBe("omit");
  });

  it("returns placeholder action with default text for document.missingField", () => {
    const r = resolveGap(gap, DEFAULT_READER_POLICIES.document);
    expect(r.action).toBe("placeholder");
    expect(r.placeholder).toBe(DEFAULT_PLACEHOLDER);
  });

  it("respects custom placeholder option", () => {
    const r = resolveGap(gap, DEFAULT_READER_POLICIES.document, { placeholder: "(unset)" });
    expect(r.placeholder).toBe("(unset)");
  });

  it("returns passthrough with raw value for pixels.unknownEnumValue", () => {
    const enumGap = { kind: "unknownEnumValue", value: "weird", field: "status" };
    const r = resolveGap(enumGap, DEFAULT_READER_POLICIES.pixels);
    expect(r.action).toBe("passthrough");
    expect(r.value).toBe("weird");
  });

  it("returns broken-link with value for pixels.removedEntityRef", () => {
    const refGap = { kind: "removedEntityRef", value: "u-missing", field: "assignee", entity: "Task" };
    const r = resolveGap(refGap, DEFAULT_READER_POLICIES.pixels);
    expect(r.action).toBe("broken-link");
    expect(r.value).toBe("u-missing");
  });

  it("supports custom error policy", () => {
    const policy = { missingField: "error", unknownEnumValue: "passthrough", removedEntityRef: "broken-link" };
    expect(resolveGap(gap, policy).action).toBe("error");
  });

  it("throws on missing gap descriptor", () => {
    expect(() => resolveGap(null, DEFAULT_READER_POLICIES.pixels)).toThrow(/gap must be/);
  });

  it("throws on missing policy", () => {
    expect(() => resolveGap(gap, null)).toThrow(/policy must be/);
  });

  it("throws on unknown action in policy", () => {
    const bogus = { missingField: "weirdAction", unknownEnumValue: "passthrough", removedEntityRef: "broken-link" };
    expect(() => resolveGap(gap, bogus)).toThrow(/unknown action/);
  });
});

// ─── resolveFieldGap (composition) ───────────────────────────────────────────

describe("resolveFieldGap", () => {
  it("returns null when no gap detected", () => {
    expect(resolveFieldGap("Hello", { type: "string" }, DEFAULT_READER_POLICIES.pixels)).toBeNull();
  });

  it("returns resolution for missing field on document policy", () => {
    const r = resolveFieldGap(undefined, { type: "string" }, DEFAULT_READER_POLICIES.document, { field: "name" });
    expect(r?.action).toBe("placeholder");
    expect(r?.placeholder).toBe(DEFAULT_PLACEHOLDER);
  });

  it("returns resolution for unknown enum on agent policy", () => {
    const r = resolveFieldGap("archived", { type: "enum", values: ["open", "done"] }, DEFAULT_READER_POLICIES.agent);
    expect(r?.action).toBe("passthrough");
    expect(r?.value).toBe("archived");
  });

  it("returns omit for ref-gap on voice policy", () => {
    const r = resolveFieldGap(
      "u-missing",
      { type: "ref", entity: "User" },
      DEFAULT_READER_POLICIES.voice,
      { world: { User: [] } },
    );
    expect(r?.action).toBe("omit");
  });

  it("propagates custom placeholder from ctx", () => {
    const r = resolveFieldGap(undefined, { type: "string" }, DEFAULT_READER_POLICIES.document, { placeholder: "n/a" });
    expect(r?.placeholder).toBe("n/a");
  });
});

// ─── scanEntityGaps ──────────────────────────────────────────────────────────

describe("scanEntityGaps", () => {
  const fieldDefs = {
    title: { type: "string" },
    priority: { type: "string" },
    status: { type: "enum", values: ["open", "done"] },
    assignee: { type: "ref", entity: "User" },
  };

  it("returns [] when entity is fully populated", () => {
    const entity = { id: "t1", title: "Hi", priority: "high", status: "open", assignee: "u1" };
    const world = { User: [{ id: "u1" }] };
    expect(scanEntityGaps(entity, fieldDefs, { world, entity: "Task" })).toEqual([]);
  });

  it("collects multiple gaps in a row", () => {
    const entity = { id: "t1", title: "Hi", status: "archived", assignee: "u-missing" };
    const world = { User: [{ id: "u1" }] };
    const gaps = scanEntityGaps(entity, fieldDefs, { world, entity: "Task" });
    const kinds = gaps.map(g => g.kind).sort();
    expect(kinds).toEqual(["missingField", "removedEntityRef", "unknownEnumValue"]);
  });

  it("handles empty fieldDefs gracefully", () => {
    expect(scanEntityGaps({ id: "t1" }, {}, {})).toEqual([]);
  });

  it("handles missing entity gracefully", () => {
    expect(scanEntityGaps(null, fieldDefs)).toEqual([]);
    expect(scanEntityGaps(undefined, fieldDefs)).toEqual([]);
  });
});

// ─── Cross-reader equivalence (Layer 4 prep) ─────────────────────────────────

describe("integration: same gap, different reader policies", () => {
  it("4 readers diverge on same missingField gap", () => {
    const gap = { kind: "missingField", field: "priority", entity: "Task" };
    const r1 = resolveGap(gap, DEFAULT_READER_POLICIES.pixels).action;
    const r2 = resolveGap(gap, DEFAULT_READER_POLICIES.voice).action;
    const r3 = resolveGap(gap, DEFAULT_READER_POLICIES.agent).action;
    const r4 = resolveGap(gap, DEFAULT_READER_POLICIES.document).action;
    expect(r1).toBe("hidden");
    expect(r2).toBe("omit");
    expect(r3).toBe("omit");
    expect(r4).toBe("placeholder");
    // Layer 4 detector в Phase 5 будет проверять, что reader'ы согласованы по
    // gap-set (где-то поле missing), но action может разниться — это контракт.
    expect(new Set([r1, r2, r3, r4]).size).toBeGreaterThan(1);
  });

  it("unknown enum: pixels passthrough, voice omits, document placeholder, agent passthrough", () => {
    const gap = { kind: "unknownEnumValue", value: "weird", field: "status" };
    expect(resolveGap(gap, DEFAULT_READER_POLICIES.pixels).action).toBe("passthrough");
    expect(resolveGap(gap, DEFAULT_READER_POLICIES.voice).action).toBe("omit");
    expect(resolveGap(gap, DEFAULT_READER_POLICIES.agent).action).toBe("passthrough");
    expect(resolveGap(gap, DEFAULT_READER_POLICIES.document).action).toBe("placeholder");
  });
});
