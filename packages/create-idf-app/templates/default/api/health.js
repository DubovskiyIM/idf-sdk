// Vercel serverless function: health-check
// GET /api/health → { status, version, ts }

export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    version: "0.1.0",
    ts: new Date().toISOString(),
  });
}
