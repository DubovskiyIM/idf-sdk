import { describe, it, expect } from "vitest";
import { buildTemporalRenderSpec } from "./buildTemporalRenderSpec.js";

describe("buildTemporalRenderSpec", () => {
  const eventEntity = {
    temporality: "causal-chain",
    ownerField: "paymentId",
    fields: {
      id: {},
      paymentId: { type: "entityRef" },
      kind: { type: "enum", values: ["created", "authorized", "captured"] },
      at: { type: "datetime" },
      actor: { type: "entityRef" },
      description: { type: "text" },
    },
  };

  it("causal-chain — resolves atField, kindField, actorField, descriptionField", () => {
    const spec = buildTemporalRenderSpec(
      "causal-chain",
      "PaymentEvent",
      { entities: { PaymentEvent: eventEntity } }
    );
    expect(spec).toEqual({
      type: "eventTimeline",
      kind: "causal-chain",
      atField: "at",
      kindField: "kind",
      actorField: "actor",
      descriptionField: "description",
    });
  });

  it("causal-chain — resolves 'performedBy' as actorField", () => {
    const ontology = {
      entities: {
        AuditLog: {
          temporality: "causal-chain",
          fields: {
            id: {},
            at: { type: "datetime" },
            kind: { type: "enum" },
            performedBy: { type: "entityRef" },
          },
        },
      },
    };
    const spec = buildTemporalRenderSpec("causal-chain", "AuditLog", ontology);
    expect(spec.actorField).toBe("performedBy");
  });

  it("causal-chain — resolves 'reason' as descriptionField", () => {
    const ontology = {
      entities: {
        Action: {
          temporality: "causal-chain",
          fields: {
            id: {},
            createdAt: { type: "datetime" },
            kind: { type: "enum" },
            reason: { type: "text" },
          },
        },
      },
    };
    const spec = buildTemporalRenderSpec("causal-chain", "Action", ontology);
    expect(spec.descriptionField).toBe("reason");
    expect(spec.atField).toBe("createdAt");
  });

  it("snapshot — resolves atField + stateFields (non-system, non-id, non-FK, non-at)", () => {
    const snapshotEntity = {
      temporality: "snapshot",
      ownerField: "positionId",
      fields: {
        id: {},
        positionId: { type: "entityRef" },
        at: { type: "datetime" },
        quantity: { type: "number" },
        price: { type: "number", fieldRole: "money" },
        value: { type: "number", fieldRole: "money" },
      },
    };
    const spec = buildTemporalRenderSpec(
      "snapshot",
      "PositionSnapshot",
      { entities: { PositionSnapshot: snapshotEntity } }
    );
    expect(spec.type).toBe("eventTimeline");
    expect(spec.kind).toBe("snapshot");
    expect(spec.atField).toBe("at");
    expect(spec.stateFields).toEqual(["quantity", "price", "value"]);
  });

  it("priority atField: occurred > timestamp > scheduled", () => {
    const multiDate = {
      temporality: "causal-chain",
      fields: {
        id: {},
        createdAt: { type: "datetime" },
        occurredAt: { type: "datetime" },
        scheduledAt: { type: "datetime" },
        kind: { type: "enum" },
      },
    };
    const spec = buildTemporalRenderSpec(
      "causal-chain",
      "X",
      { entities: { X: multiDate } }
    );
    expect(spec.atField).toBe("occurredAt");
  });

  it("no temporal field — atField=null, graceful", () => {
    const noDate = {
      temporality: "snapshot",
      fields: { id: {}, quantity: { type: "number" } },
    };
    const spec = buildTemporalRenderSpec(
      "snapshot",
      "Y",
      { entities: { Y: noDate } }
    );
    expect(spec.atField).toBeNull();
    expect(spec.stateFields).toEqual(["quantity"]);
  });

  it("snapshot stateFields — исключает FK даже без суффикса Id", () => {
    const snapshotCustomFK = {
      temporality: "snapshot",
      ownerField: "parent",
      fields: {
        id: {},
        parent: { type: "entityRef" },
        at: { type: "datetime" },
        value: { type: "number" },
      },
    };
    const spec = buildTemporalRenderSpec(
      "snapshot",
      "Z",
      { entities: { Z: snapshotCustomFK } }
    );
    expect(spec.stateFields).toEqual(["value"]);
  });
});
