// G-K-20 (Keycloak dogfood, 2026-04-23): для α="replace" intents
// formModal overlay должен включать entity.fields (editable parameters)
// в дополнение к path-params из intent.parameters. Без этого update-form
// показывает только {Realm, Group Id, Realm Id} и не редактирует
// настоящие поля сущности.
import { describe, it, expect } from "vitest";
import { wrapByConfirmation } from "./wrapByConfirmation.js";

const ONTOLOGY = {
  entities: {
    Group: {
      name: "Group",
      kind: "internal",
      fields: {
        id:       { type: "text", label: "ID" },
        name:     { type: "text", label: "Group name", required: true },
        path:     { type: "text", label: "Path" },
        description: { type: "textarea", label: "Description" },
        attributes:  { type: "json", label: "Attributes" },
        realmId:  { type: "text", label: "Realm" }, // FK — также path-param
      },
    },
  },
};

const updateGroupIntent = {
  name: "Обновить группу",
  target: "Group",
  alpha: "replace",
  particles: {
    confirmation: "form",
    entities: ["Group"],
  },
  parameters: {
    realm:    { type: "text", required: true },
    groupId:  { type: "text", required: true },
    realmId:  { type: "text", required: true, aliasOf: "realm" },
  },
};

const parametersAsArray = Object.entries(updateGroupIntent.parameters)
  .map(([name, p]) => ({ name, ...p }));

describe("G-K-20: formModal overlay для α=replace включает entity.fields", () => {
  it("без ontology в context — fallback на старое поведение (только parameters)", () => {
    const wrapped = wrapByConfirmation(updateGroupIntent, "updateGroup", parametersAsArray, {});
    expect(wrapped?.overlay?.parameters?.length).toBe(3); // только path-params
    const names = wrapped.overlay.parameters.map(p => p.name);
    expect(names).toEqual(["realm", "groupId", "realmId"]);
  });

  it("с ontology в context — entity.fields merged как editable parameters", () => {
    const wrapped = wrapByConfirmation(updateGroupIntent, "updateGroup", parametersAsArray, {
      ontology: ONTOLOGY,
    });
    expect(wrapped?.overlay?.parameters).toBeDefined();
    const names = wrapped.overlay.parameters.map(p => p.name);
    // path-params сохранены
    expect(names).toContain("realm");
    expect(names).toContain("groupId");
    expect(names).toContain("realmId");
    // entity.fields добавлены (исключая id и duplicates)
    expect(names).toContain("name");
    expect(names).toContain("path");
    expect(names).toContain("description");
  });

  it("ID-поле сущности не дублируется в form (системное)", () => {
    const wrapped = wrapByConfirmation(updateGroupIntent, "updateGroup", parametersAsArray, {
      ontology: ONTOLOGY,
    });
    const names = wrapped.overlay.parameters.map(p => p.name);
    // entity.fields.id — identifier, не editable input
    const idParams = names.filter(n => n === "id");
    expect(idParams.length).toBe(0);
  });

  it("если parameter уже есть среди path-params — entity.field не дублируется", () => {
    const wrapped = wrapByConfirmation(updateGroupIntent, "updateGroup", parametersAsArray, {
      ontology: ONTOLOGY,
    });
    // realmId — есть и в parameters (path), и в entity.fields. Не дублируется
    const realmIdCount = wrapped.overlay.parameters.filter(p => p.name === "realmId").length;
    expect(realmIdCount).toBe(1);
  });

  it("entity.field получает label из ontology", () => {
    const wrapped = wrapByConfirmation(updateGroupIntent, "updateGroup", parametersAsArray, {
      ontology: ONTOLOGY,
    });
    const nameParam = wrapped.overlay.parameters.find(p => p.name === "name");
    expect(nameParam?.label).toBe("Group name");
    const descParam = wrapped.overlay.parameters.find(p => p.name === "description");
    expect(descParam?.type).toBe("textarea");
  });

  it("intent с α=insert — entity.fields НЕ добавляются (только create-flow)", () => {
    const createIntent = { ...updateGroupIntent, alpha: "insert" };
    const wrapped = wrapByConfirmation(createIntent, "createGroup", parametersAsArray, {
      ontology: ONTOLOGY,
    });
    const names = wrapped?.overlay?.parameters?.map(p => p.name) || [];
    expect(names).not.toContain("name");
    expect(names).not.toContain("description");
  });
});
