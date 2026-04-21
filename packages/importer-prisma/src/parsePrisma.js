import { getSchema } from "@mrleebo/prisma-ast";

/**
 * Нормализованная форма AST: { models: [{ name, fields, blockAttributes }] }.
 * Skip'аются break/comment-entries, только models-объекты остаются.
 */
export function parsePrisma(source) {
  const ast = getSchema(source);
  const models = [];

  for (const entry of ast.list ?? []) {
    if (entry.type !== "model") continue;

    const fields = [];
    const blockAttributes = [];

    for (const prop of entry.properties ?? []) {
      if (prop.type === "field") {
        fields.push({
          name: prop.name,
          fieldType: prop.fieldType,
          array: !!prop.array,
          optional: !!prop.optional,
          attributes: prop.attributes ?? [],
        });
      } else if (prop.type === "attribute") {
        blockAttributes.push(prop);
      }
    }

    models.push({
      name: entry.name,
      fields,
      blockAttributes,
    });
  }

  return { models };
}
