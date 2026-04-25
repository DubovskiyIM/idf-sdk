import { describe, it, expect } from "vitest";
import dualStatusBadgeCard from "./dual-status-badge-card.js";

const { looksLikeStatusField, pickStatusWitnesses } = dualStatusBadgeCard._helpers;

describe("dual-status-badge-card — trigger.match", () => {
  const ontologyArgo = {
    entities: {
      Application: {
        fields: {
          name:         { type: "string" },
          syncStatus:   { type: "string", values: ["Synced", "OutOfSync", "Unknown"] },
          healthStatus: { type: "string", values: ["Healthy", "Progressing", "Degraded", "Suspended", "Missing"] },
          cluster:      { type: "string" },
        },
      },
    },
  };
  const projArgo = {
    archetype: "catalog",
    mainEntity: "Application",
    witnesses: ["name", "syncStatus", "healthStatus", "cluster"],
  };

  it("matches: catalog с двумя status-enum-полями в witnesses", () => {
    expect(dualStatusBadgeCard.trigger.match([], ontologyArgo, projArgo)).toBe(true);
  });

  it("не matches: один status field (sales-listing single status)", () => {
    const ont = {
      entities: {
        Listing: {
          fields: {
            title:  { type: "string" },
            status: { type: "string", values: ["active", "sold", "expired"] },
            price:  { type: "number" },
          },
        },
      },
    };
    const proj = { archetype: "catalog", mainEntity: "Listing", witnesses: ["title", "status", "price"] };
    expect(dualStatusBadgeCard.trigger.match([], ont, proj)).toBe(false);
  });

  it("не matches: status-полe вне witnesses (автор не показывает)", () => {
    const proj = { ...projArgo, witnesses: ["name", "cluster"] };
    expect(dualStatusBadgeCard.trigger.match([], ontologyArgo, proj)).toBe(false);
  });

  it("не matches: enum field без status-hint в имени и без fieldRole", () => {
    const ont = {
      entities: {
        E: {
          fields: {
            name:    { type: "string" },
            color:   { type: "string", values: ["red", "blue"] },
            size:    { type: "string", values: ["S", "M", "L"] },
          },
        },
      },
    };
    const proj = { archetype: "catalog", mainEntity: "E", witnesses: ["name", "color", "size"] };
    expect(dualStatusBadgeCard.trigger.match([], ont, proj)).toBe(false);
  });

  it("matches через fieldRole: 'status' даже без хинта в имени", () => {
    const ont = {
      entities: {
        E: {
          fields: {
            name: { type: "string" },
            sync: { type: "string", values: ["a", "b"], fieldRole: "status" },
            health: { type: "string", values: ["c", "d"], fieldRole: "status" },
          },
        },
      },
    };
    const proj = { archetype: "catalog", mainEntity: "E", witnesses: ["name", "sync", "health"] };
    expect(dualStatusBadgeCard.trigger.match([], ont, proj)).toBe(true);
  });

  it("matches через name-hint Phase / State", () => {
    const ont = {
      entities: {
        Pod: {
          fields: {
            name:  { type: "string" },
            phase: { type: "string", values: ["Pending", "Running", "Succeeded", "Failed"] },
            state: { type: "string", values: ["waiting", "running", "terminated"] },
          },
        },
      },
    };
    const proj = { archetype: "catalog", mainEntity: "Pod", witnesses: ["name", "phase", "state"] };
    expect(dualStatusBadgeCard.trigger.match([], ont, proj)).toBe(true);
  });

  it("не matches: archetype != catalog", () => {
    const proj = { ...projArgo, archetype: "detail" };
    expect(dualStatusBadgeCard.trigger.match([], ontologyArgo, proj)).toBe(false);
  });

  it("не matches: status-field без values (free-form string)", () => {
    const ont = {
      entities: {
        E: {
          fields: {
            name: { type: "string" },
            syncStatus: { type: "string" },
            healthStatus: { type: "string" },
          },
        },
      },
    };
    const proj = { archetype: "catalog", mainEntity: "E", witnesses: ["name", "syncStatus", "healthStatus"] };
    expect(dualStatusBadgeCard.trigger.match([], ont, proj)).toBe(false);
  });
});

describe("dual-status-badge-card — structure.apply", () => {
  const ontology = {
    entities: {
      Application: {
        fields: {
          name:         { type: "string" },
          syncStatus:   { type: "string", values: ["Synced", "OutOfSync"] },
          healthStatus: { type: "string", values: ["Healthy", "Degraded"] },
        },
      },
    },
  };
  const projection = {
    archetype: "catalog",
    mainEntity: "Application",
    witnesses: ["name", "syncStatus", "healthStatus"],
  };

  it("добавляет cardSpec.badges из ≥2 status-witnesses в порядке witnesses", () => {
    const slots = { body: { layout: "grid", cardSpec: { title: { bind: "name" } } } };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out.body.cardSpec.badges).toHaveLength(2);
    expect(out.body.cardSpec.badges[0].bind).toBe("syncStatus");
    expect(out.body.cardSpec.badges[1].bind).toBe("healthStatus");
    expect(out.body.cardSpec.badges[0].values).toEqual(["Synced", "OutOfSync"]);
  });

  it("backfill'ит cardSpec.badge ← badges[0] для legacy renderer", () => {
    const slots = { body: { layout: "grid", cardSpec: { title: { bind: "name" } } } };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out.body.cardSpec.badge).toEqual({ bind: "syncStatus" });
  });

  it("сохраняет existing cardSpec.badge если author уже задал", () => {
    const slots = {
      body: {
        layout: "grid",
        cardSpec: { title: { bind: "name" }, badge: { bind: "customBadge" } },
      },
    };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out.body.cardSpec.badge).toEqual({ bind: "customBadge" }); // не перезаписан
    expect(out.body.cardSpec.badges).toHaveLength(2); // но badges всё равно добавлены
  });

  it("no-op: badges уже присутствуют (author-override)", () => {
    const slots = {
      body: {
        layout: "grid",
        cardSpec: { badges: [{ bind: "custom1" }] },
      },
    };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out).toBe(slots);
  });

  it("no-op: body.layout != 'grid' (badges релевантны только cards)", () => {
    const slots = { body: { layout: "list", cardSpec: {} } };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out).toBe(slots);
  });

  it("no-op: cardSpec отсутствует (grid-card-layout не отработал)", () => {
    const slots = { body: { layout: "grid" } };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out).toBe(slots);
  });

  it("no-op: polymorphic cardSpec (variants) — v1 не покрывает", () => {
    const slots = {
      body: {
        layout: "grid",
        cardSpec: { variants: { a: {}, b: {} }, discriminator: "kind" },
      },
    };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out).toBe(slots);
  });

  it("сохраняет другие slots поля без изменений", () => {
    const slots = {
      header: { title: "Apps" },
      body: { layout: "grid", cardSpec: { title: { bind: "name" } }, source: "applications" },
      footer: {},
    };
    const out = dualStatusBadgeCard.structure.apply(slots, { projection, ontology });
    expect(out.header).toEqual({ title: "Apps" });
    expect(out.body.source).toBe("applications");
    expect(out.footer).toEqual({});
  });
});

describe("dual-status-badge-card — helpers", () => {
  it("looksLikeStatusField: status-name + values → true", () => {
    expect(looksLikeStatusField("syncStatus", { type: "string", values: ["a", "b"] })).toBe(true);
    expect(looksLikeStatusField("phase", { type: "string", values: ["a", "b"] })).toBe(true);
    expect(looksLikeStatusField("state", { type: "string", values: ["a", "b"] })).toBe(true);
  });

  it("looksLikeStatusField: fieldRole status → true даже без name-hint", () => {
    expect(looksLikeStatusField("foo", { type: "string", values: ["a", "b"], fieldRole: "status" })).toBe(true);
  });

  it("looksLikeStatusField: enum без status-hint → false", () => {
    expect(looksLikeStatusField("color", { type: "string", values: ["red", "blue"] })).toBe(false);
  });

  it("looksLikeStatusField: status-name без values → false", () => {
    expect(looksLikeStatusField("syncStatus", { type: "string" })).toBe(false);
  });

  it("pickStatusWitnesses: возвращает только status-witnesses в порядке witnesses", () => {
    const entity = {
      fields: {
        name:   { type: "string" },
        b:      { type: "string", values: ["x", "y"], fieldRole: "status" },
        a:      { type: "string", values: ["p", "q"], fieldRole: "status" },
      },
    };
    const result = pickStatusWitnesses(["name", "b", "a"], entity);
    expect(result.map(r => r.bind)).toEqual(["b", "a"]);
  });

  it("pickStatusWitnesses: dotted witness берёт root field", () => {
    const entity = {
      fields: { syncStatus: { type: "string", values: ["a", "b"] } },
    };
    const result = pickStatusWitnesses(["syncStatus.detail"], entity);
    expect(result).toHaveLength(1);
    expect(result[0].bind).toBe("syncStatus");
  });
});
