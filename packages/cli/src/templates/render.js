/**
 * Маршрутизатор шаблонов. Каждый template — JS-модуль экспортирующий
 * `render(ctx)`. Не Handlebars / Mustache — чистый JS template literal,
 * без extra parsing dependency.
 */
import * as domainTpl from "./domain.tpl.js";
import * as seedTpl from "./seed.tpl.js";
import * as crystallizeTestTpl from "./crystallize-test.tpl.js";
import * as packageJsonTpl from "./package-json.tpl.js";
import * as readmeTpl from "./readme.tpl.js";

const REGISTRY = {
  "domain.js.tmpl": domainTpl,
  "seed.js.tmpl": seedTpl,
  "crystallize.test.js.tmpl": crystallizeTestTpl,
  "package.json.tmpl": packageJsonTpl,
  "README.md.tmpl": readmeTpl,
};

export async function renderTemplate(templateName, ctx) {
  const tpl = REGISTRY[templateName];
  if (!tpl) throw new Error(`Unknown template: ${templateName}`);
  return tpl.render(ctx);
}
