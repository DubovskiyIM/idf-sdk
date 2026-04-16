import { describe, it, expect } from "vitest";
import { checkAnchoring } from "./anchoring.js";

describe("checkAnchoring — entity", () => {
  const ontology = {
    entities: {
      Item: { fields: { id: { type: "string" }, title: { type: "string" } } },
    },
  };

  it("error для unknown entity", () => {
    const intents = {
      do_foo: { particles: { entities: ["Foo"], effects: [], witnesses: [] } },
    };
    const result = checkAnchoring(intents, ontology);
    expect(result.passed).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      rule: "anchoring_entity",
      level: "error",
      intent: "do_foo",
      particle: { kind: "entity", value: "Foo" },
    });
  });

  it("pass для known entity", () => {
    const intents = {
      do_item: { particles: { entities: ["Item"], effects: [], witnesses: [] } },
    };
    const result = checkAnchoring(intents, ontology);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("plural-singular matching: Items → Item", () => {
    const intents = {
      do_items: { particles: { entities: ["Items"], effects: [], witnesses: [] } },
    };
    const result = checkAnchoring(intents, ontology);
    expect(result.passed).toBe(true);
  });
});

describe("checkAnchoring — effect.target", () => {
  const ontology = {
    entities: {
      Item: { fields: { id: { type: "string" }, title: { type: "string" } } },
    },
  };

  it("error для unknown base collection", () => {
    const intents = {
      create_foo: {
        particles: {
          entities: [],
          effects: [{ type: "add", target: "foos", payload: {} }],
          witnesses: [],
        },
      },
    };
    const result = checkAnchoring(intents, ontology);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe("anchoring_effect_target");
    expect(result.errors[0].particle.value).toBe("foos");
  });

  it("warning для unknown field в target (base известен)", () => {
    const intents = {
      update_item: {
        particles: {
          entities: ["Item"],
          effects: [{ type: "replace", target: "items.unknownField", payload: "x" }],
          witnesses: [],
        },
      },
    };
    const result = checkAnchoring(intents, ontology);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].rule).toBe("anchoring_effect_field");
    expect(result.warnings[0].level).toBe("warning");
  });

  it("pass для target.field с known field", () => {
    const intents = {
      update_item: {
        particles: {
          entities: ["Item"],
          effects: [{ type: "replace", target: "items.title", payload: "x" }],
          witnesses: [],
        },
      },
    };
    const result = checkAnchoring(intents, ontology);
    expect(result.passed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("systemCollections подавляет error", () => {
    const ontologyWithSystem = { ...ontology, systemCollections: ["drafts"] };
    const intents = {
      save_draft: {
        particles: {
          entities: [],
          effects: [{ type: "add", target: "drafts", payload: {} }],
          witnesses: [],
        },
      },
    };
    const result = checkAnchoring(intents, ontologyWithSystem);
    expect(result.passed).toBe(true);
  });
});
