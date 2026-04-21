// BFF: agent-API reader.
// /api/agent/:domain/{schema|world|exec} с JWT + preapproval.
// Wired в Этапе 3.

export default function handler(req, res) {
  res.status(501).json({
    error: "Not Implemented",
    message: "Agent API будет подключён на Этапе 3",
  });
}
