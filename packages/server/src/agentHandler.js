import { normalizeSlug } from "./shared.js";

/**
 * Factory: minimal agent handler.
 *
 * Сейчас поддерживается только `schema` — возвращает доступные intents + entities
 * для agent-консьюмера (LLM / script / voice-agent).
 *
 * Будущие действия (в отдельных фазах):
 *   /api/agent/world — текущий world-snapshot с role-filter
 *   /api/agent/exec  — выполнить intent (с preapproval guard)
 */
export function createAgentHandler({ ontology }) {
  return async function handler(req, res) {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed (use POST for exec in future release)" });
      return;
    }

    const slug = normalizeSlug(req.query?.slug);
    const action = slug[0];

    if (!action || action === "schema") {
      res.status(200).json({
        domain: ontology.name ?? "default",
        entities: Object.keys(ontology.entities ?? {}),
        intents: Object.keys(ontology.intents ?? {}).map((name) => ({
          name,
          target: ontology.intents[name].target,
          alpha: ontology.intents[name].alpha,
        })),
        roles: Object.keys(ontology.roles ?? {}),
        notes: "Agent exec / world endpoints — будут в следующих релизах @intent-driven/server.",
      });
      return;
    }

    res.status(501).json({
      error: `Action "${action}" не реализован (MVP поддерживает только /schema)`,
    });
  };
}
