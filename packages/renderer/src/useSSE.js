import { useCallback, useRef, useState } from "react";

/**
 * Reader для Server-Sent Events стрима, отдаваемого runtime'ом на
 * POST /api/agent/:slug/console/turn. Парсит NDJSON-форма SSE `data: {...}`
 * и накапливает events в state.
 */
export function useSSE() {
  const [events, setEvents] = useState([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const start = useCallback(async (url, body, opts = {}) => {
    setEvents([]);
    setDone(false);
    setError(null);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        setError(`HTTP ${res.status}`);
        setDone(true);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() ?? "";
        for (const raw of blocks) {
          const line = raw.startsWith("data: ") ? raw.slice(6) : raw;
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            setEvents((prev) => [...prev, evt]);
            if (evt.kind === "done" || evt.kind === "error") setDone(true);
          } catch {
            /* skip malformed */
          }
        }
      }
      setDone(true);
    } catch (e) {
      if (e.name !== "AbortError") setError(String(e.message ?? e));
      setDone(true);
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setDone(true);
  }, []);

  return { events, done, error, start, stop };
}
