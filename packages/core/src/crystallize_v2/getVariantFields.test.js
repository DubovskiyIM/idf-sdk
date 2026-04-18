import { describe, it, expect } from "vitest";
import { getVariantFields } from "./getVariantFields.js";

describe("getVariantFields", () => {
  const polyTask = {
    discriminator: "kind",
    variants: {
      story: { label: "Story", fields: { storyPoints: { type: "number" }, criteria: { type: "textarea" } } },
      bug:   { label: "Bug",   fields: { severity: { type: "enum", values: ["low", "high"] } } },
    },
    fields: {
      id: {},
      title: { type: "text" },
      kind: { type: "enum", values: ["story", "bug"] },
    },
  };

  it("merges shared + variant fields", () => {
    const { fields } = getVariantFields(polyTask, "story");
    expect(Object.keys(fields).sort()).toEqual(["id", "kind", "storyPoints", "criteria", "title"].sort());
    expect(fields.storyPoints.type).toBe("number");
    expect(fields.title.type).toBe("text");
  });

  it("bug variant: severity merged, storyPoints absent", () => {
    const { fields } = getVariantFields(polyTask, "bug");
    expect(fields.severity).toBeDefined();
    expect(fields.storyPoints).toBeUndefined();
  });

  it("null variantKey → только shared fields", () => {
    const { fields } = getVariantFields(polyTask, null);
    expect(Object.keys(fields).sort()).toEqual(["id", "kind", "title"].sort());
  });

  it("unknown variant → только shared fields + warning", () => {
    const { fields, warnings } = getVariantFields(polyTask, "milestone");
    expect(fields.storyPoints).toBeUndefined();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/milestone/);
  });

  it("variant.fields attempts override shared → shared wins + warning", () => {
    const conflicting = {
      discriminator: "kind",
      variants: {
        story: { fields: { title: { type: "textarea" }, storyPoints: {} } },
      },
      fields: { title: { type: "text" }, kind: { type: "enum" } },
    };
    const { fields, warnings } = getVariantFields(conflicting, "story");
    expect(fields.title.type).toBe("text");
    expect(warnings.some(w => w.includes("title"))).toBe(true);
  });

  it("entity без variants → возвращает только shared", () => {
    const monomorphic = {
      fields: { id: {}, title: { type: "text" } },
    };
    const { fields, warnings } = getVariantFields(monomorphic, "whatever");
    expect(Object.keys(fields).sort()).toEqual(["id", "title"].sort());
    expect(warnings).toEqual([]);
  });

  it("entity без fields → пустой объект", () => {
    expect(getVariantFields({}, null).fields).toEqual({});
  });
});
