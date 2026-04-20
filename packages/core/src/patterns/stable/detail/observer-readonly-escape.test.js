import { describe, it, expect } from "vitest";
import pattern from "./observer-readonly-escape.js";

const intents = [
  { id: "view_payment", irreversibility: "low" },
  { id: "file_dispute", irreversibility: "high" },
  { id: "flag_anomaly", irreversibility: "high" },
];

const observerOntology = {
  roles: {
    auditor: {
      base: "observer",
      canExecute: ["view_payment", "file_dispute", "flag_anomaly"],
    },
    user: { base: "owner" },
  },
};

describe("observer-readonly-escape trigger.match", () => {
  it("срабатывает когда observer имеет ≥1 high intent", () => {
    expect(pattern.trigger.match(intents, observerOntology, {})).toBe(true);
  });

  it("не срабатывает без observer-роли", () => {
    const ontology = { roles: { user: { base: "owner" } } };
    expect(pattern.trigger.match(intents, ontology, {})).toBe(false);
  });

  it("не срабатывает без high-irreversibility intents у observer", () => {
    const onto = {
      roles: { auditor: { base: "observer", canExecute: ["view_payment"] } },
    };
    expect(pattern.trigger.match(intents, onto, {})).toBe(false);
  });
});

describe("observer-readonly-escape.structure.apply", () => {
  it("добавляет readonlyBanner в header с escapeIntentIds", () => {
    const slots = { header: [], primaryCTA: [] };
    const result = pattern.structure.apply(slots, {
      ontology: observerOntology,
      intents,
    });
    expect(result.header).toHaveLength(1);
    expect(result.header[0]).toMatchObject({
      type: "readonlyBanner",
      role: "auditor",
      escapeIntentIds: ["file_dispute", "flag_anomaly"],
      source: "derived:observer-readonly-escape",
    });
  });

  it("idempotent: existing readonlyBanner → no-op", () => {
    const slots = {
      header: [{ type: "readonlyBanner", role: "other" }],
      primaryCTA: [],
    };
    const result = pattern.structure.apply(slots, {
      ontology: observerOntology,
      intents,
    });
    expect(result.header).toHaveLength(1);
    expect(result.header[0].role).toBe("other");  // не перетёрт
  });

  it("без observer-роли → no-op", () => {
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, {
      ontology: { roles: { user: { base: "owner" } } },
      intents,
    });
    expect(result).toBe(slots);
  });

  it("сохраняет существующие header nodes", () => {
    const slots = {
      header: [{ type: "text", content: "Title" }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: observerOntology,
      intents,
    });
    expect(result.header).toHaveLength(2);
    expect(result.header[0].type).toBe("readonlyBanner");  // prepended
    expect(result.header[1].type).toBe("text");
  });
});
