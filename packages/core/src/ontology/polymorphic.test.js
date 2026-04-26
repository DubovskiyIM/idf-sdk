import { describe, it, expect } from "vitest";
import {
  isPolymorphicEntity,
  getDiscriminatorField,
  getEntityVariants,
  getEntityVariant,
  listVariantValues,
  getEffectiveFields,
  getUnionFields,
  getVariantSpecificFields,
  validatePolymorphicEntity,
} from "./polymorphic.js";

const polymorphicWorkflowNode = {
  kind: "polymorphic",
  discriminator: "type",
  fields: {
    id: { type: "id" },
    type: { type: "select" },
    label: { type: "text" },
    workflowId: { references: "Workflow" },
  },
  variants: {
    ManualTrigger: {
      label: "Manual trigger",
      fields: {},
    },
    TelegramTrigger: {
      label: "Telegram trigger",
      fields: {
        botToken: { type: "secret", fieldRole: "auth" },
        webhookUrl: { type: "url" },
        secretToken: { type: "secret" },
      },
    },
    CallLLM: {
      label: "Call LLM",
      fields: {
        prompt: { type: "text" },
        temperature: { type: "number" },
        maxTokens: { type: "number" },
      },
      invariants: [
        { kind: "expression", expr: "temperature >= 0 && temperature <= 2" },
      ],
    },
  },
};

const plainEntity = {
  fields: { id: { type: "id" }, name: { type: "text" } },
};

const referenceEntity = {
  kind: "reference",
  fields: { id: { type: "id" }, code: { type: "text" } },
};

describe("isPolymorphicEntity", () => {
  it("true для entity.kind === 'polymorphic'", () => {
    expect(isPolymorphicEntity(polymorphicWorkflowNode)).toBe(true);
  });

  it("false для plain entity", () => {
    expect(isPolymorphicEntity(plainEntity)).toBe(false);
  });

  it("false для reference / mirror / assignment kind", () => {
    expect(isPolymorphicEntity(referenceEntity)).toBe(false);
    expect(isPolymorphicEntity({ kind: "mirror" })).toBe(false);
    expect(isPolymorphicEntity({ kind: "assignment" })).toBe(false);
  });

  it("false для нечитаемого input'а", () => {
    expect(isPolymorphicEntity(null)).toBe(false);
    expect(isPolymorphicEntity(undefined)).toBe(false);
    expect(isPolymorphicEntity("string")).toBe(false);
  });
});

describe("getDiscriminatorField", () => {
  it("возвращает имя discriminator-поля", () => {
    expect(getDiscriminatorField(polymorphicWorkflowNode)).toBe("type");
  });

  it("null для plain entity", () => {
    expect(getDiscriminatorField(plainEntity)).toBeNull();
  });

  it("null если discriminator не задан или пуст", () => {
    expect(getDiscriminatorField({ kind: "polymorphic", variants: {} })).toBeNull();
    expect(getDiscriminatorField({ kind: "polymorphic", discriminator: "" })).toBeNull();
  });
});

describe("getEntityVariants / getEntityVariant / listVariantValues", () => {
  it("возвращает все variants", () => {
    const variants = getEntityVariants(polymorphicWorkflowNode);
    expect(Object.keys(variants)).toEqual(["ManualTrigger", "TelegramTrigger", "CallLLM"]);
  });

  it("возвращает один variant по ключу", () => {
    const v = getEntityVariant(polymorphicWorkflowNode, "TelegramTrigger");
    expect(v?.label).toBe("Telegram trigger");
    expect(Object.keys(v?.fields ?? {})).toContain("botToken");
  });

  it("null для unknown variant", () => {
    expect(getEntityVariant(polymorphicWorkflowNode, "Unknown")).toBeNull();
  });

  it("listVariantValues возвращает массив ключей", () => {
    expect(listVariantValues(polymorphicWorkflowNode)).toEqual([
      "ManualTrigger",
      "TelegramTrigger",
      "CallLLM",
    ]);
  });

  it("пустой dict / массив для plain entity", () => {
    expect(getEntityVariants(plainEntity)).toEqual({});
    expect(listVariantValues(plainEntity)).toEqual([]);
  });
});

describe("getEffectiveFields", () => {
  it("без variant'а — base fields для polymorphic entity", () => {
    const fields = getEffectiveFields(polymorphicWorkflowNode);
    expect(Object.keys(fields)).toEqual(["id", "type", "label", "workflowId"]);
  });

  it("с variant'ом — base + variant fields", () => {
    const fields = getEffectiveFields(polymorphicWorkflowNode, "TelegramTrigger");
    expect(Object.keys(fields)).toContain("id");
    expect(Object.keys(fields)).toContain("botToken");
    expect(Object.keys(fields)).toContain("webhookUrl");
    expect(Object.keys(fields)).not.toContain("prompt");
  });

  it("variant fields override base", () => {
    const entityDef = {
      kind: "polymorphic",
      discriminator: "type",
      fields: {
        type: { type: "select" },
        amount: { type: "number" },
      },
      variants: {
        Currency: {
          fields: { amount: { type: "money", precision: 2 } },
        },
      },
    };
    const fields = getEffectiveFields(entityDef, "Currency");
    expect(fields.amount.type).toBe("money");
    expect(fields.amount.precision).toBe(2);
  });

  it("unknown variant — fallback на base fields", () => {
    const fields = getEffectiveFields(polymorphicWorkflowNode, "Unknown");
    expect(Object.keys(fields)).toEqual(["id", "type", "label", "workflowId"]);
  });

  it("non-polymorphic entity — base fields without merge", () => {
    const fields = getEffectiveFields(plainEntity, "anything");
    expect(Object.keys(fields)).toEqual(["id", "name"]);
  });
});

describe("getUnionFields", () => {
  it("возвращает union всех fields (base + every variant)", () => {
    const fields = getUnionFields(polymorphicWorkflowNode);
    expect(Object.keys(fields)).toEqual(
      expect.arrayContaining([
        "id", "type", "label", "workflowId",
        "botToken", "webhookUrl", "secretToken",
        "prompt", "temperature", "maxTokens",
      ]),
    );
  });

  it("first-wins при field-name conflict между variants", () => {
    const entityDef = {
      kind: "polymorphic",
      discriminator: "type",
      fields: { type: { type: "select" } },
      variants: {
        A: { fields: { shared: { type: "text" } } },
        B: { fields: { shared: { type: "number" } } },
      },
    };
    expect(getUnionFields(entityDef).shared.type).toBe("text");
  });

  it("non-polymorphic — base fields only", () => {
    expect(getUnionFields(plainEntity)).toEqual(plainEntity.fields);
  });
});

describe("getVariantSpecificFields", () => {
  it("returns fields присутствующие только в variant'е", () => {
    const specific = getVariantSpecificFields(polymorphicWorkflowNode, "TelegramTrigger");
    expect(specific).toEqual(expect.arrayContaining(["botToken", "webhookUrl", "secretToken"]));
    expect(specific).not.toContain("id");
  });

  it("пустой массив для unknown variant'а", () => {
    expect(getVariantSpecificFields(polymorphicWorkflowNode, "Unknown")).toEqual([]);
  });

  it("пустой массив для variant'а без fields", () => {
    expect(getVariantSpecificFields(polymorphicWorkflowNode, "ManualTrigger")).toEqual([]);
  });
});

describe("validatePolymorphicEntity", () => {
  it("non-polymorphic entity всегда valid", () => {
    expect(validatePolymorphicEntity(plainEntity)).toEqual({ valid: true, errors: [] });
    expect(validatePolymorphicEntity(referenceEntity)).toEqual({ valid: true, errors: [] });
  });

  it("полный polymorphic — valid", () => {
    expect(validatePolymorphicEntity(polymorphicWorkflowNode).valid).toBe(true);
  });

  it("missing discriminator — invalid", () => {
    const r = validatePolymorphicEntity({
      kind: "polymorphic",
      fields: { type: { type: "select" } },
      variants: { A: { fields: {} } },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("discriminator must be"))).toBe(true);
  });

  it("discriminator не в base.fields — invalid", () => {
    const r = validatePolymorphicEntity({
      kind: "polymorphic",
      discriminator: "type",
      fields: { id: { type: "id" } },
      variants: { A: { fields: {} } },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("must be declared in entity.fields"))).toBe(true);
  });

  it("variants пустой — invalid", () => {
    const r = validatePolymorphicEntity({
      kind: "polymorphic",
      discriminator: "type",
      fields: { type: { type: "select" } },
      variants: {},
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("at least one entry"))).toBe(true);
  });

  it("variants не объект — invalid", () => {
    const r = validatePolymorphicEntity({
      kind: "polymorphic",
      discriminator: "type",
      fields: { type: { type: "select" } },
      variants: ["A", "B"],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("variants must be an object"))).toBe(true);
  });

  it("variant.fields не объект — invalid", () => {
    const r = validatePolymorphicEntity({
      kind: "polymorphic",
      discriminator: "type",
      fields: { type: { type: "select" } },
      variants: { A: { fields: ["broken"] } },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('variant "A".fields'))).toBe(true);
  });

  it("variant без fields разрешён (treated as empty)", () => {
    const r = validatePolymorphicEntity({
      kind: "polymorphic",
      discriminator: "type",
      fields: { type: { type: "select" } },
      variants: { Empty: { label: "Empty variant" } },
    });
    expect(r.valid).toBe(true);
  });

  it("non-object input — invalid", () => {
    expect(validatePolymorphicEntity(null).valid).toBe(false);
    expect(validatePolymorphicEntity("hello").valid).toBe(false);
  });
});

describe("backward compatibility", () => {
  it("getEffectiveFields поддерживает legacy fields-as-array shape", () => {
    const legacyEntity = { fields: ["id", "name", "email"] };
    const fields = getEffectiveFields(legacyEntity);
    expect(Object.keys(fields)).toEqual(["id", "name", "email"]);
  });

  it("getEffectiveFields на null entity не падает", () => {
    expect(getEffectiveFields(null)).toEqual({});
    expect(getEffectiveFields(undefined)).toEqual({});
  });
});
