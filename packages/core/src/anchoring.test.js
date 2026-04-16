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
