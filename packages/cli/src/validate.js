/**
 * Self-validation сгенерированного домена через crystallizeV2.
 * Импортируется из ./init.js после завершения генерации файлов.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function validateGenerated(targetDir) {
  // Динамически импортируем из workspace, чтобы не тянуть core в bundle CLI.
  const { crystallizeV2, computeAlgebra } = await import("@intent-driven/core");

  const domainUrl = pathToFileURL(join(targetDir, "domain.js")).href;
  const { ontology, intents, projections } = await import(domainUrl);

  if (!ontology || !intents || !projections) {
    throw new Error("domain.js не экспортирует ontology / intents / projections");
  }

  const artifacts = crystallizeV2(intents, projections, ontology);
  if (!artifacts || Object.keys(artifacts).length === 0) {
    throw new Error("crystallizeV2 вернул пустой результат");
  }

  let relationsCount = 0;
  if (computeAlgebra) {
    const algebra = computeAlgebra(intents);
    relationsCount = Object.values(algebra || {}).reduce((sum, rels) => {
      if (!rels || typeof rels !== "object") return sum;
      return sum + Object.values(rels).reduce((s, list) => s + (Array.isArray(list) ? list.length : 0), 0);
    }, 0);
  }

  return {
    projectionsCount: Object.keys(artifacts).length,
    intentsCount: Object.keys(intents).length,
    relationsCount,
  };
}
