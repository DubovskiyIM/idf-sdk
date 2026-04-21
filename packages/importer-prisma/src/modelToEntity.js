import { modelFieldToField } from "./modelFieldToField.js";

const OWNER_FIELDS = ["userId", "user_id", "ownerId", "owner_id", "authorId", "author_id", "createdBy", "created_by"];

export function modelToEntity(model, modelNames) {
  const fields = {};
  for (const pfield of model.fields) {
    const mapped = modelFieldToField(pfield, modelNames);
    if (mapped) {
      fields[pfield.name] = mapped;
    }
  }

  const ownerField = Object.keys(fields).find((k) => OWNER_FIELDS.includes(k));

  const entity = {
    name: model.name,
    kind: "internal",
    fields,
  };
  if (ownerField) entity.ownerField = ownerField;

  return entity;
}
