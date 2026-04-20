import { describe, it, expect } from "vitest";
import { materializeAuditLog, buildAuditContext } from "./auditLog.js";

const eff = (over = {}) => ({
  id: "e1",
  status: "confirmed",
  timestamp: 1000,
  actor: "alice",
  type: "create_journal_entry_draft",
  entityKind: "JournalEntry",
  entityId: "je1",
  context: { __audit: { sourceIntent: "create_journal_entry_draft", ruleIds: [] } },
  ...over,
});

describe("materializeAuditLog", () => {
  it("возвращает пустой массив для пустой Φ", () => {
    expect(materializeAuditLog({ effects: [] })).toEqual([]);
  });

  it("возвращает пустой массив если phi не содержит effects", () => {
    expect(materializeAuditLog({})).toEqual([]);
    expect(materializeAuditLog(null)).toEqual([]);
  });

  it("включает только confirmed effects", () => {
    const phi = { effects: [
      eff({ id: "e1", status: "confirmed" }),
      eff({ id: "e2", status: "proposed" }),
      eff({ id: "e3", status: "rejected" }),
    ] };
    const result = materializeAuditLog(phi);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e1");
  });

  it("фильтрует по actorId", () => {
    const phi = { effects: [
      eff({ id: "e1", actor: "alice" }),
      eff({ id: "e2", actor: "bob" }),
    ] };
    expect(materializeAuditLog(phi, { actorId: "bob" })).toEqual([
      expect.objectContaining({ id: "e2", actor: "bob" }),
    ]);
  });

  it("фильтрует по timeRange {from, to} inclusive", () => {
    const phi = { effects: [
      eff({ id: "e1", timestamp: 500 }),
      eff({ id: "e2", timestamp: 1000 }),
      eff({ id: "e3", timestamp: 1500 }),
      eff({ id: "e4", timestamp: 2500 }),
    ] };
    const result = materializeAuditLog(phi, { timeRange: { from: 1000, to: 1500 } });
    expect(result.map(r => r.id)).toEqual(["e2", "e3"]);
  });

  it("timeRange только с from — open-ended справа", () => {
    const phi = { effects: [
      eff({ id: "e1", timestamp: 500 }),
      eff({ id: "e2", timestamp: 2000 }),
    ] };
    expect(materializeAuditLog(phi, { timeRange: { from: 1000 } })).toHaveLength(1);
  });

  it("фильтрует по intentTypes array", () => {
    const phi = { effects: [
      eff({ id: "e1", type: "approve_journal_entry" }),
      eff({ id: "e2", type: "submit_attestation" }),
      eff({ id: "e3", type: "approve_journal_entry" }),
    ] };
    const result = materializeAuditLog(phi, { intentTypes: ["approve_journal_entry"] });
    expect(result.map(r => r.id)).toEqual(["e1", "e3"]);
  });

  it("фильтрует по entityKind + entityId", () => {
    const phi = { effects: [
      eff({ id: "e1", entityKind: "JournalEntry", entityId: "je1" }),
      eff({ id: "e2", entityKind: "Attestation",  entityId: "att1" }),
      eff({ id: "e3", entityKind: "JournalEntry", entityId: "je2" }),
    ] };
    expect(materializeAuditLog(phi, { entityKind: "JournalEntry" })).toHaveLength(2);
    expect(materializeAuditLog(phi, { entityKind: "JournalEntry", entityId: "je1" })).toHaveLength(1);
  });

  it("фильтрует по ruleId (из __audit.ruleIds)", () => {
    const phi = { effects: [
      eff({ id: "e1", context: { __audit: { ruleIds: ["sod-reviewer", "threshold"] } } }),
      eff({ id: "e2", context: { __audit: { ruleIds: ["threshold"] } } }),
      eff({ id: "e3", context: { __audit: { ruleIds: [] } } }),
    ] };
    expect(materializeAuditLog(phi, { ruleId: "sod-reviewer" })).toHaveLength(1);
    expect(materializeAuditLog(phi, { ruleId: "threshold" })).toHaveLength(2);
  });

  it("обогащает записи полями из __audit", () => {
    const phi = { effects: [eff({
      id: "e1",
      context: { __audit: {
        sourceIntent: "approve_journal_entry",
        ruleIds: ["invariant_threshold_approvals"],
        witnessChain: [{ basis: "phase-transition", from: "submitted", to: "approved" }],
        evidenceIds: ["ev1", "ev2"],
        auditHash: "fnv1a:deadbeef",
      } },
    })] };
    const [entry] = materializeAuditLog(phi);
    expect(entry.sourceIntent).toBe("approve_journal_entry");
    expect(entry.ruleIds).toEqual(["invariant_threshold_approvals"]);
    expect(entry.evidenceIds).toEqual(["ev1", "ev2"]);
    expect(entry.witnessChain).toHaveLength(1);
    expect(entry.auditHash).toBe("fnv1a:deadbeef");
  });

  it("fallback'ит sourceIntent к effect.type если __audit отсутствует", () => {
    const phi = { effects: [eff({ id: "e1", type: "foo", context: {} })] };
    const [entry] = materializeAuditLog(phi);
    expect(entry.sourceIntent).toBe("foo");
    expect(entry.ruleIds).toEqual([]);
    expect(entry.evidenceIds).toEqual([]);
  });
});

describe("buildAuditContext", () => {
  it("возвращает shape с sourceIntent/ruleIds/evidenceIds/witnessChain/auditHash", () => {
    const ctx = buildAuditContext({
      intent: "approve_journal_entry",
      actor: "dan",
      timestamp: 1000,
      ruleIds: ["r1"],
      evidenceIds: ["ev1"],
      witnessChain: [],
    });
    expect(ctx).toEqual({
      sourceIntent: "approve_journal_entry",
      ruleIds: ["r1"],
      evidenceIds: ["ev1"],
      witnessChain: [],
      auditHash: expect.stringMatching(/^fnv1a:[0-9a-f]{8}$/),
    });
  });

  it("defaults для optional полей — пустые массивы", () => {
    const ctx = buildAuditContext({ intent: "x", actor: "u", timestamp: 1 });
    expect(ctx.ruleIds).toEqual([]);
    expect(ctx.evidenceIds).toEqual([]);
    expect(ctx.witnessChain).toEqual([]);
  });

  it("даёт стабильный hash для одинакового input", () => {
    const a = buildAuditContext({ intent: "x", actor: "u", timestamp: 1, ruleIds: ["r1"] });
    const b = buildAuditContext({ intent: "x", actor: "u", timestamp: 1, ruleIds: ["r1"] });
    expect(a.auditHash).toBe(b.auditHash);
  });

  it("даёт разный hash для разных intent", () => {
    const a = buildAuditContext({ intent: "x", actor: "u", timestamp: 1 });
    const b = buildAuditContext({ intent: "y", actor: "u", timestamp: 1 });
    expect(a.auditHash).not.toBe(b.auditHash);
  });

  it("даёт разный hash для разных actor", () => {
    const a = buildAuditContext({ intent: "x", actor: "u1", timestamp: 1 });
    const b = buildAuditContext({ intent: "x", actor: "u2", timestamp: 1 });
    expect(a.auditHash).not.toBe(b.auditHash);
  });

  it("canonical-json: порядок ruleIds влияет на hash (authored order — значим)", () => {
    const a = buildAuditContext({ intent: "x", actor: "u", timestamp: 1, ruleIds: ["r1", "r2"] });
    const b = buildAuditContext({ intent: "x", actor: "u", timestamp: 1, ruleIds: ["r2", "r1"] });
    expect(a.auditHash).not.toBe(b.auditHash);
  });
});
