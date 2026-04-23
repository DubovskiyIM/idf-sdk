import { describe, it, expect } from "vitest";
import pattern from "./lifecycle-gated-destructive.js";

function mkEnumStatusEntity() {
  return {
    Listing: {
      fields: {
        id: { type: "text" },
        title: { type: "text" },
        status: { type: "enum", options: ["draft", "published", "suspended"] },
      },
    },
  };
}

function mkBooleanLifecycleEntity() {
  return {
    Catalog: {
      fields: {
        id: { type: "text" },
        name: { type: "text" },
        inUse: { type: "boolean" },
      },
    },
  };
}

const disableIntent = {
  id: "suspend_listing",
  particles: {
    effects: [{ α: "replace", target: "Listing.status", value: "suspended" }],
  },
};
const removeIntent = {
  id: "remove_listing",
  particles: {
    effects: [{ α: "remove", target: "entities" }],
  },
};
const unrelatedIntent = {
  id: "update_title",
  particles: {
    effects: [{ α: "replace", target: "Listing.title" }],
  },
};

describe("lifecycle-gated-destructive trigger.match", () => {
  it("срабатывает при enum-status с active+inactive + disable+remove парой", () => {
    const ontology = { entities: mkEnumStatusEntity() };
    const ok = pattern.trigger.match(
      [disableIntent, removeIntent],
      ontology,
      { mainEntity: "Listing" },
    );
    expect(ok).toBe(true);
  });

  it("срабатывает при boolean inUse lifecycle", () => {
    const ontology = { entities: mkBooleanLifecycleEntity() };
    const disable = {
      id: "disable_catalog",
      particles: { effects: [{ α: "replace", target: "Catalog.inUse", value: false }] },
    };
    const remove = {
      id: "delete_catalog",
      particles: { effects: [{ α: "remove", target: "entities" }] },
    };
    const ok = pattern.trigger.match([disable, remove], ontology, { mainEntity: "Catalog" });
    expect(ok).toBe(true);
  });

  it("НЕ срабатывает без disable-intent (только remove)", () => {
    const ontology = { entities: mkEnumStatusEntity() };
    const ok = pattern.trigger.match([removeIntent, unrelatedIntent], ontology, { mainEntity: "Listing" });
    expect(ok).toBe(false);
  });

  it("НЕ срабатывает без remove-intent", () => {
    const ontology = { entities: mkEnumStatusEntity() };
    const ok = pattern.trigger.match([disableIntent, unrelatedIntent], ontology, { mainEntity: "Listing" });
    expect(ok).toBe(false);
  });

  it("НЕ срабатывает без status-поля с ≥2 опциями", () => {
    const ontology = {
      entities: { Note: { fields: { id: { type: "text" }, text: { type: "text" } } } },
    };
    const remove = {
      id: "remove_note",
      particles: { effects: [{ α: "remove", target: "entities" }] },
    };
    const ok = pattern.trigger.match([remove], ontology, { mainEntity: "Note" });
    expect(ok).toBe(false);
  });

  it("НЕ срабатывает если status только active-подобные значения", () => {
    const ontology = {
      entities: {
        Thing: { fields: { status: { type: "enum", options: ["active", "running"] } } },
      },
    };
    const disable = {
      id: "x",
      particles: { effects: [{ α: "replace", target: "Thing.status", value: "running" }] },
    };
    const ok = pattern.trigger.match([disable, removeIntent], ontology, { mainEntity: "Thing" });
    expect(ok).toBe(false);
  });
});

describe("lifecycle-gated-destructive.structure.apply", () => {
  it("добавляет gate в slots.actionGates для enum-status", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: { entities: mkEnumStatusEntity() },
      mainEntity: "Listing",
      intents: [disableIntent, removeIntent],
    });
    expect(result.actionGates).toHaveLength(1);
    const gate = result.actionGates[0];
    expect(gate.intentId).toBe("remove_listing");
    expect(gate.enabledBy).toBe("suspend_listing");
    expect(gate.statusField).toBe("status");
    expect(gate.inactiveValue).toBe("suspended");
    expect(gate.activeValue).toBe("published");
    expect(gate.blockedWhen).toBe("item.status !== 'suspended'");
    expect(gate.source).toBe("derived:lifecycle-gated-destructive");
  });

  it("blockedWhen для boolean-lifecycle — без кавычек", () => {
    const disable = {
      id: "disable_catalog",
      particles: { effects: [{ α: "replace", target: "Catalog.inUse" }] },
    };
    const remove = {
      id: "delete_catalog",
      particles: { effects: [{ α: "remove", target: "entities" }] },
    };
    const result = pattern.structure.apply({}, {
      ontology: { entities: mkBooleanLifecycleEntity() },
      mainEntity: "Catalog",
      intents: [disable, remove],
    });
    expect(result.actionGates).toHaveLength(1);
    expect(result.actionGates[0].blockedWhen).toBe("item.inUse !== false");
  });

  it("idempotent: существующий gate с тем же id не перезаписывается", () => {
    const slots = {
      actionGates: [{ id: "lifecycleGated_remove_listing", custom: true }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: { entities: mkEnumStatusEntity() },
      mainEntity: "Listing",
      intents: [disableIntent, removeIntent],
    });
    expect(result.actionGates).toHaveLength(1);
    expect(result.actionGates[0].custom).toBe(true);
  });

  it("без disable/remove пары — no-op (slots без изменений)", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: { entities: mkEnumStatusEntity() },
      mainEntity: "Listing",
      intents: [unrelatedIntent],
    });
    expect(result).toBe(slots);
  });

  it("без status-поля — no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: { entities: { Note: { fields: {} } } },
      mainEntity: "Note",
      intents: [removeIntent],
    });
    expect(result).toBe(slots);
  });
});
