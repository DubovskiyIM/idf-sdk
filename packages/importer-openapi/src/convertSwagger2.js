import s2o from "swagger2openapi";

/**
 * Конвертация Swagger 2.0 → OpenAPI 3.0 через swagger2openapi.
 *
 * Закрывает backlog §10.6 Phase B (Swagger 2.0 native support).
 *
 * Многие enterprise / open-source API всё ещё публикуют Swagger 2.0 spec
 * (ArgoCD, gRPC-gateway services, корпоративные REST API). Раньше host'ам
 * приходилось встраивать swagger2openapi вручную в reimport-script
 * (см. `idf/scripts/argocd-reimport.mjs`). Теперь — встроенный async helper.
 *
 * Использование:
 *   const swagger = JSON.parse(fs.readFileSync("swagger.json"));
 *   const openapi3 = await convertSwagger2(swagger);
 *   const ontology = importOpenApi(openapi3);
 *
 * Или одной командой через `importSpec`:
 *   const ontology = await importSpec(swaggerJson);
 *
 * Опции:
 *   - `patch: true` (default) — swagger2openapi auto-fix non-compliant
 *     схем (используется для ArgoCD spec'и с warning'ами).
 *   - `warnOnly: true` (default) — не падать на warning'ах, продолжать.
 *   - Любая другая опция swagger2openapi пробрасывается через `...opts`.
 *
 * @param {object} spec — parsed Swagger 2.0 spec
 * @param {object} [opts] — swagger2openapi options
 * @returns {Promise<object>} OpenAPI 3.0 spec
 */
export async function convertSwagger2(spec, opts = {}) {
  if (!spec || typeof spec !== "object") {
    throw new Error("convertSwagger2: spec must be parsed object");
  }
  if (spec.swagger !== "2.0") {
    throw new Error(
      `convertSwagger2: expected swagger:"2.0", got ${
        spec.swagger ? `swagger:"${spec.swagger}"` : `openapi:"${spec.openapi}"`
      }`
    );
  }
  const result = await s2o.convertObj(spec, {
    patch: true,
    warnOnly: true,
    ...opts,
  });
  return result.openapi;
}

/**
 * Detect-helper: возвращает true для Swagger 2.0, false для OpenAPI 3.x.
 * Используется importSpec'ом для auto-routing.
 */
export function isSwagger2(spec) {
  return !!spec && typeof spec === "object" && spec.swagger === "2.0";
}
