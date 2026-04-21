import { inferEndpoint } from "./inferEndpoint.js";
import { buildFetchRequest } from "./buildFetchRequest.js";

/**
 * Выполняет IDF intent через HTTP. Pure-async, не держит state — интеграция с
 * local Φ-state делается вызывающим кодом (useHttpEngine или manual).
 *
 * @returns {Promise<{ ok: boolean, status?: number, data?: any, error?: string }>}
 */
export async function runIntent({
  name,
  intent,
  entity,
  params,
  apiUrl,
  getAuthToken,
}) {
  const endpoint = inferEndpoint({ name, intent, entity });
  const authToken = getAuthToken ? await getAuthToken() : undefined;
  const { url, init } = buildFetchRequest({ apiUrl, endpoint, params, authToken });

  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorText =
      (data && (data.error || data.message)) || `HTTP ${response.status}`;
    return { ok: false, status: response.status, error: errorText };
  }

  return { ok: true, status: response.status, data };
}
