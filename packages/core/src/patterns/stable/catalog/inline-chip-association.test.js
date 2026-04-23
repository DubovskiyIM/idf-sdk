import { describe, it, expect } from "vitest";
import pattern from "./inline-chip-association.js";

function mkJunctionOntology() {
  return {
    entities: {
      Zone: { fields: { id: { type: "text" }, name: { type: "text" } } },
      DispatcherAssignment: {
        kind: "assignment",
        ownerField: "dispatcherId",
        fields: {
          id: { type: "text" },
          zoneId: { type: "entityRef" },
          dispatcherId: { type: "entityRef" },
        },
      },
    },
  };
}

const attachIntent = {
  id: "assign_dispatcher_to_zone",
  α: "add",
  creates: "DispatcherAssignment",
  particles: {},
};
const detachIntent = {
  id: "unassign_dispatcher_from_zone",
  particles: {
    effects: [{ α: "remove", target: "entities" }],
  },
};

describe("inline-chip-association trigger.match", () => {
  it("срабатывает при junction c FK + парой attach/detach", () => {
    const ok = pattern.trigger.match(
      [attachIntent, detachIntent],
      mkJunctionOntology(),
      { mainEntity: "Zone" },
    );
    expect(ok).toBe(true);
  });

  it("не срабатывает без detach-intent", () => {
    const ok = pattern.trigger.match([attachIntent], mkJunctionOntology(), { mainEntity: "Zone" });
    expect(ok).toBe(false);
  });

  it("не срабатывает без attach-intent", () => {
    const ok = pattern.trigger.match([detachIntent], mkJunctionOntology(), { mainEntity: "Zone" });
    expect(ok).toBe(false);
  });

  it("не срабатывает без junction-entity", () => {
    const ontology = {
      entities: { Zone: { fields: { id: { type: "text" } } } },
    };
    const ok = pattern.trigger.match([attachIntent, detachIntent], ontology, { mainEntity: "Zone" });
    expect(ok).toBe(false);
  });
});

describe("inline-chip-association.structure.apply", () => {
  it("добавляет rowAssociation для junction", () => {
    const result = pattern.structure.apply({}, {
      ontology: mkJunctionOntology(),
      mainEntity: "Zone",
      intents: [attachIntent, detachIntent],
    });
    expect(result.rowAssociations).toHaveLength(1);
    const entry = result.rowAssociations[0];
    expect(entry.id).toBe("chip_dispatcherassignment");
    expect(entry.junction).toBe("DispatcherAssignment");
    expect(entry.foreignKey).toBe("zoneId");
    expect(entry.otherField).toBe("dispatcherId");
    expect(entry.otherEntity).toBe("Dispatcher");
    expect(entry.attachIntent).toBe("assign_dispatcher_to_zone");
    expect(entry.detachIntent).toBe("unassign_dispatcher_from_zone");
    expect(entry.source).toBe("derived:inline-chip-association");
  });

  it("idempotent: existing rowAssociation с тем же id не перезаписывается", () => {
    const slots = {
      rowAssociations: [{ id: "chip_dispatcherassignment", custom: true }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: mkJunctionOntology(),
      mainEntity: "Zone",
      intents: [attachIntent, detachIntent],
    });
    expect(result.rowAssociations).toHaveLength(1);
    expect(result.rowAssociations[0].custom).toBe(true);
  });

  it("несколько junction-entities → несколько rowAssociations", () => {
    const ontology = {
      entities: {
        Zone: { fields: { id: { type: "text" } } },
        DispatcherAssignment: {
          kind: "assignment",
          fields: {
            id: { type: "text" },
            zoneId: { type: "entityRef" },
            dispatcherId: { type: "entityRef" },
          },
        },
        CourierAssignment: {
          kind: "assignment",
          fields: {
            id: { type: "text" },
            zoneId: { type: "entityRef" },
            courierId: { type: "entityRef" },
          },
        },
      },
    };
    const attach2 = { id: "assign_courier", creates: "CourierAssignment", particles: {} };
    const detach2 = {
      id: "unassign_courierassignment",
      particles: { effects: [{ α: "remove", target: "entities" }] },
    };
    const result = pattern.structure.apply({}, {
      ontology,
      mainEntity: "Zone",
      intents: [attachIntent, detachIntent, attach2, detach2],
    });
    expect(result.rowAssociations).toHaveLength(2);
    const ids = result.rowAssociations.map(a => a.id);
    expect(ids).toContain("chip_dispatcherassignment");
    expect(ids).toContain("chip_courierassignment");
  });

  it("без junction — no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: { entities: { Zone: { fields: { id: { type: "text" } } } } },
      mainEntity: "Zone",
      intents: [attachIntent, detachIntent],
    });
    expect(result).toBe(slots);
  });
});
