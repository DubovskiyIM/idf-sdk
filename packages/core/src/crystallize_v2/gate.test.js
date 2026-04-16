import { describe, it, expect, vi } from "vitest";
import { crystallizeV2 } from "./index.js";
import { AnchoringError } from "../errors.js";

const ONTOLOGY = {
  entities: { Item: { fields: { id: { type: "string" }, title: { type: "string" } } } },
};

const VALID_INTENTS = {
  create_item: {
    particles: {
      entities: ["Item"],
      effects: [{ type: "add", target: "items", payload: {} }],
      witnesses: ["item.title"],
    },
  },
};

const INVALID_INTENTS = {
  create_foo: {
    particles: {
      entities: ["Foo"],
      effects: [{ type: "add", target: "foos", payload: {} }],
      witnesses: [],
    },
  },
};

const PROJECTIONS = { item_list: { kind: "catalog", entities: ["Item"], mainEntity: "Item" } };

describe("crystallizeV2 — anchoring gate", () => {
  it("strict: throws AnchoringError на unknown entity", () => {
    expect(() => crystallizeV2(INVALID_INTENTS, PROJECTIONS, ONTOLOGY, "test", { anchoring: "strict" }))
      .toThrow(AnchoringError);
  });

  it("strict: AnchoringError содержит findings с domainId", () => {
    try {
      crystallizeV2(INVALID_INTENTS, PROJECTIONS, ONTOLOGY, "test", { anchoring: "strict" });
      expect.fail("должен был throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AnchoringError);
      expect(err.domainId).toBe("test");
      expect(err.findings.length).toBeGreaterThan(0);
    }
  });

  it("soft: не throws, логирует warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = crystallizeV2(INVALID_INTENTS, PROJECTIONS, ONTOLOGY, "test", { anchoring: "soft" });
    expect(result).toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("anchoring errors suppressed"));
    warn.mockRestore();
  });

  it("default (Phase 1 = soft): не throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = crystallizeV2(INVALID_INTENTS, PROJECTIONS, ONTOLOGY, "test");
    expect(result).toBeDefined();
    warn.mockRestore();
  });

  it("valid intents: работает в любом режиме", () => {
    const strictResult = crystallizeV2(VALID_INTENTS, PROJECTIONS, ONTOLOGY, "test", { anchoring: "strict" });
    const softResult = crystallizeV2(VALID_INTENTS, PROJECTIONS, ONTOLOGY, "test", { anchoring: "soft" });
    expect(Object.keys(strictResult).length).toBeGreaterThan(0);
    expect(Object.keys(softResult).length).toBeGreaterThan(0);
  });
});
