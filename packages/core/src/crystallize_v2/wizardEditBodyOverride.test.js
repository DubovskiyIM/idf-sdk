// G-K-12 (Keycloak dogfood, 2026-04-23): для α=replace intents formModal
// overlay должен подхватывать authored bodyOverride из <entityLower>_edit
// projection (если задекларирован). Это позволяет author'у определить
// edit-flow с Wizard / TabbedForm primitive, а не flat parameters list.
import { describe, it, expect } from "vitest";
import { wrapByConfirmation } from "./wrapByConfirmation.js";

const baseUpdateIntent = {
  name: "Update realm",
  target: "Realm",
  alpha: "replace",
  particles: { confirmation: "form", entities: ["Realm"] },
  parameters: { realmId: { type: "text", required: true } },
};

const params = [{ name: "realmId", type: "text", required: true }];

const ONTOLOGY = {
  entities: {
    Realm: { name: "Realm", kind: "internal", fields: { id: { type: "text" }, realm: { type: "text" } } },
  },
};

describe("G-K-12: formModal overlay подхватывает authored <entity>_edit.bodyOverride", () => {
  it("без projections в context — fallback на старое (parameters list)", () => {
    const wrapped = wrapByConfirmation(baseUpdateIntent, "updateRealm", params, { ontology: ONTOLOGY });
    expect(wrapped.overlay.bodyOverride).toBeUndefined();
    expect(Array.isArray(wrapped.overlay.parameters)).toBe(true);
  });

  it("authored realm_edit с bodyOverride wizard — overlay получает bodyOverride", () => {
    const projections = {
      realm_edit: {
        kind: "form",
        mainEntity: "Realm",
        bodyOverride: {
          type: "wizard",
          steps: [
            { id: "basic", title: "Basic", fields: [{ name: "realm", label: "ID" }] },
            { id: "tokens", title: "Tokens", fields: [{ name: "accessTokenLifespan", label: "Token TTL" }] },
          ],
        },
      },
    };
    const wrapped = wrapByConfirmation(baseUpdateIntent, "updateRealm", params, {
      ontology: ONTOLOGY, projections,
    });
    expect(wrapped.overlay.bodyOverride).toBeDefined();
    expect(wrapped.overlay.bodyOverride.type).toBe("wizard");
    expect(wrapped.overlay.bodyOverride.steps.length).toBe(2);
    // parameters сохраняются для path-binding (не должны теряться)
    expect(Array.isArray(wrapped.overlay.parameters)).toBe(true);
  });

  it("authored realm_edit с bodyOverride tabbedForm — overlay получает bodyOverride", () => {
    const projections = {
      realm_edit: {
        kind: "form",
        mainEntity: "Realm",
        bodyOverride: {
          type: "tabbedForm",
          tabs: [
            { id: "general", title: "General", fields: ["realm", "displayName"] },
            { id: "security", title: "Security", fields: ["sslRequired", "bruteForceProtected"] },
          ],
        },
      },
    };
    const wrapped = wrapByConfirmation(baseUpdateIntent, "updateRealm", params, {
      ontology: ONTOLOGY, projections,
    });
    expect(wrapped.overlay.bodyOverride.type).toBe("tabbedForm");
    expect(wrapped.overlay.bodyOverride.tabs.length).toBe(2);
  });

  it("intent с α=insert — projection lookup НЕ срабатывает (только α=replace)", () => {
    const createIntent = { ...baseUpdateIntent, alpha: "insert" };
    const projections = {
      realm_edit: { kind: "form", mainEntity: "Realm", bodyOverride: { type: "wizard", steps: [] } },
    };
    const wrapped = wrapByConfirmation(createIntent, "createRealm", params, {
      ontology: ONTOLOGY, projections,
    });
    // create-flow остаётся без overlay-bodyOverride (используется
    // отдельный <entity>_create projection через generateCreateProjections)
    expect(wrapped.overlay.bodyOverride).toBeUndefined();
  });

  it("если authored <entity>_edit БЕЗ bodyOverride — fallback на parameters", () => {
    const projections = {
      realm_edit: { kind: "form", mainEntity: "Realm" }, // no bodyOverride
    };
    const wrapped = wrapByConfirmation(baseUpdateIntent, "updateRealm", params, {
      ontology: ONTOLOGY, projections,
    });
    expect(wrapped.overlay.bodyOverride).toBeUndefined();
    expect(Array.isArray(wrapped.overlay.parameters)).toBe(true);
  });
});
