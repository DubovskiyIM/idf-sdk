// BFF: voice-materialization reader.
// POST /api/voice/:projection?format=json|ssml|plain → speech-script.
// Wired в Этапе 3.

export default function handler(req, res) {
  res.status(501).json({
    error: "Not Implemented",
    message: "Voice materializer будет подключён на Этапе 3",
  });
}
