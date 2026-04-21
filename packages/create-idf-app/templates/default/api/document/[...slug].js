// BFF: document-materialization reader.
// POST /api/document/:projection { world, role } → structured document.
// Wired в Этапе 3 через @intent-driven/server documentMaterializer.

export default function handler(req, res) {
  res.status(501).json({
    error: "Not Implemented",
    message: "Document materializer будет подключён на Этапе 3 (scaffold MVP plan 2026-04-21)",
  });
}
