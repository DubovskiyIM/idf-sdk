import { materializeAsDocument } from "@intent-driven/core";
import { getArtifacts, normalizeSlug, readJsonBody } from "./shared.js";

/**
 * Factory: возвращает Vercel-style handler (req, res) для `/api/document/[...slug]`.
 *
 * Request: POST /api/document/:projectionId
 *   Body: { world, viewer?, routeParams? }
 * Response:
 *   200 → document-graph (JSON) от materializeAsDocument
 *   400 → no projection in slug
 *   404 → projection not found in ontology
 *   405 → not POST
 */
export function createDocumentHandler({ ontology }) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const slug = normalizeSlug(req.query?.slug);
    const projectionId = slug[0];
    if (!projectionId) {
      res.status(400).json({ error: "Projection id required: /api/document/:projectionId" });
      return;
    }

    const artifacts = getArtifacts(ontology);
    const projection = artifacts.projections?.[projectionId];
    if (!projection) {
      res.status(404).json({
        error: `Projection not found: ${projectionId}`,
        available: Object.keys(artifacts.projections ?? {}),
      });
      return;
    }

    const body = await readJsonBody(req);
    const world = body.world ?? {};
    const viewer = body.viewer ?? null;
    const routeParams = body.routeParams ?? {};

    try {
      const document = materializeAsDocument(projection, world, viewer, {
        allProjections: artifacts.projections,
        routeParams,
        domain: ontology.name,
      });
      res.status(200).json(document);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
