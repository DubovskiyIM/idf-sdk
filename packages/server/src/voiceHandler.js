import { materializeAsVoice, renderVoiceSsml, renderVoicePlain } from "@intent-driven/core";
import { getArtifacts, normalizeSlug, readJsonBody } from "./shared.js";

/**
 * Factory: Vercel-style handler для `/api/voice/[...slug]`.
 *
 * Request: POST /api/voice/:projectionId?format=json|ssml|plain
 *   Body: { world, viewer?, routeParams? }
 * Response:
 *   200 → voice-graph (json), SSML (text/xml), или plain (text/plain)
 */
export function createVoiceHandler({ ontology }) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const slug = normalizeSlug(req.query?.slug);
    const projectionId = slug[0];
    if (!projectionId) {
      res.status(400).json({ error: "Projection id required" });
      return;
    }

    const artifacts = getArtifacts(ontology);
    const projection = artifacts.projections?.[projectionId];
    if (!projection) {
      res.status(404).json({ error: `Projection not found: ${projectionId}` });
      return;
    }

    const body = await readJsonBody(req);
    const world = body.world ?? {};
    const viewer = body.viewer ?? null;
    const routeParams = body.routeParams ?? {};
    const format = (req.query?.format ?? "json").toLowerCase();

    try {
      const voice = materializeAsVoice(projection, world, viewer, {
        allProjections: artifacts.projections,
        routeParams,
        domain: ontology.name,
        ontology,
      });

      if (format === "ssml") {
        res.setHeader("Content-Type", "application/ssml+xml; charset=utf-8");
        res.status(200).end(renderVoiceSsml(voice));
        return;
      }
      if (format === "plain") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.status(200).end(renderVoicePlain(voice));
        return;
      }
      // default: json
      res.status(200).json(voice);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
