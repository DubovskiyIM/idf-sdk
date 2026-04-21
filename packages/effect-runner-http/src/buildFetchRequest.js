const METHODS_WITHOUT_BODY = new Set(["GET", "DELETE", "HEAD"]);

export function buildFetchRequest({ apiUrl, endpoint, params = {}, authToken }) {
  const baseUrl = apiUrl.replace(/\/$/, "");
  const { method, path } = endpoint;

  const { resolvedPath, remaining } = substitutePathParams(path, params);

  let url = baseUrl + resolvedPath;
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = authToken;

  const init = { method, headers };

  if (METHODS_WITHOUT_BODY.has(method)) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(remaining)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const q = qs.toString();
    if (q) url += "?" + q;
  } else {
    init.body = JSON.stringify(remaining);
  }

  return { url, init };
}

function substitutePathParams(path, params) {
  const remaining = { ...params };
  const resolvedPath = path.replace(/:([a-zA-Z_]\w*)/g, (_, key) => {
    const val = remaining[key];
    if (val === undefined) throw new Error(`Path-param :${key} отсутствует в params`);
    delete remaining[key];
    return encodeURIComponent(String(val));
  });
  return { resolvedPath, remaining };
}
