import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { enrich } from "../src/index.js";
import { createCache } from "../src/cache.js";

describe("integration: enrich() full-flow с fake subprocess", () => {
  let tmp;
  let cache;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "enricher-int-"));
    cache = createCache({ dir: tmp });
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const ontology = {
    name: "default",
    entities: {
      Order: { name: "Order", kind: "internal", fields: { id: { type: "string", readOnly: true }, status: { type: "string" } } },
    },
    intents: {},
    roles: { owner: { base: "owner" } },
  };

  const fakeSubprocess = async () => ({
    namedIntents: [
      { name: "approve_order", target: "Order", alpha: "replace", reason: "status enum" },
      { name: "cancel_order", target: "Order", alpha: "replace", reason: "status enum" },
    ],
    absorbHints: [],
    additionalRoles: [
      { entity: "Order", field: "status", role: "status-enum", reason: "enum-like values" },
    ],
    baseRoles: [],
  });

  it("применяет suggestions к ontology", async () => {
    const { enriched, suggestions, cached } = await enrich(ontology, {
      cache,
      subprocess: fakeSubprocess,
    });

    expect(enriched.intents.approve_order).toBeDefined();
    expect(enriched.intents.cancel_order).toBeDefined();
    expect(enriched.entities.Order.fields.status.role).toBe("status-enum");
    expect(suggestions.namedIntents).toHaveLength(2);
    expect(cached).toBe(false);
  });

  it("второй запуск с той же ontology → cached=true", async () => {
    await enrich(ontology, { cache, subprocess: fakeSubprocess });
    const { cached } = await enrich(ontology, { cache, subprocess: fakeSubprocess });
    expect(cached).toBe(true);
  });

  it("force=true игнорирует cache", async () => {
    await enrich(ontology, { cache, subprocess: fakeSubprocess });
    const { cached } = await enrich(ontology, {
      cache,
      subprocess: fakeSubprocess,
      force: true,
    });
    expect(cached).toBe(false);
  });
});
