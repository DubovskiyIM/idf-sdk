/**
 * JSON-Schema для structured-output ответа Claude при обогащении ontology.
 * Передаётся в `claude --json-schema <schema>` — CLI validates response before returning.
 */
export const suggestionsSchema = {
  type: "object",
  properties: {
    namedIntents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          target: { type: "string" },
          alpha: {
            type: "string",
            enum: ["insert", "replace", "remove"],
          },
          reason: { type: "string" },
        },
        required: ["name", "target", "reason"],
      },
    },
    absorbHints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          child: { type: "string" },
          parent: { type: "string" },
          reason: { type: "string" },
        },
        required: ["child", "parent", "reason"],
      },
    },
    additionalRoles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          entity: { type: "string" },
          field: { type: "string" },
          role: { type: "string" },
          reason: { type: "string" },
        },
        required: ["entity", "field", "role"],
      },
    },
    baseRoles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          fromColumn: { type: "string" },
          reason: { type: "string" },
        },
        required: ["role", "reason"],
      },
    },
  },
  required: ["namedIntents", "absorbHints", "additionalRoles", "baseRoles"],
};
