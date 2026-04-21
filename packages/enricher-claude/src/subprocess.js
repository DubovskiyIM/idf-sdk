import { spawn } from "node:child_process";

/**
 * Вызывает `claude` CLI non-interactively: `-p --bare --output-format json --json-schema`.
 * input передаётся через stdin как JSON. Ответ — parsed structured-response.
 *
 * @param {{ systemPrompt: string, input: unknown, schema: object, claudeBin?: string }} opts
 * @returns {Promise<object>} — содержимое result-поля распарсенное как JSON
 */
export async function callClaude({ systemPrompt, input, schema, claudeBin = "claude" }) {
  // -p — non-interactive, без --bare чтобы работать через OAuth keychain
  // (--bare требует ANTHROPIC_API_KEY; без bare — читает ~/.claude creds).
  const args = [
    "-p",
    "--output-format",
    "json",
    "--append-system-prompt",
    systemPrompt,
    "--json-schema",
    JSON.stringify(schema),
  ];

  const child = spawn(claudeBin, args, { stdio: ["pipe", "pipe", "pipe"] });

  const stdoutChunks = [];
  const stderrChunks = [];
  child.stdout.on("data", (c) => stdoutChunks.push(c));
  child.stderr.on("data", (c) => stderrChunks.push(c));

  child.stdin.write(JSON.stringify(input));
  child.stdin.end();

  const exitCode = await new Promise((resolve) => child.on("exit", resolve));

  const stdout = Buffer.concat(stdoutChunks.map(toBuf)).toString("utf8");
  const stderr = Buffer.concat(stderrChunks.map(toBuf)).toString("utf8");

  if (exitCode !== 0) {
    throw new Error(`claude exited with code ${exitCode}: ${stderr.trim() || stdout.trim()}`);
  }

  // Claude CLI в --output-format=json возвращает wrapper { type, result, ... }
  // где result — строка с самим ответом (когда schema задана, строка = JSON).
  let wrapper;
  try {
    wrapper = JSON.parse(stdout);
  } catch (err) {
    throw new Error(`claude output не JSON: ${stdout.slice(0, 200)}`);
  }

  const innerText = wrapper.result ?? wrapper.content ?? stdout;
  return extractJson(innerText);
}

/**
 * Извлекает JSON-объект из текста Claude.
 * Порядок попыток:
 *   1. Прямой JSON.parse — если модель вернула чистый JSON.
 *   2. Markdown code-fence ```json ... ```.
 *   3. Поиск первого `{` и last `}` — fallback.
 */
export function extractJson(text) {
  if (typeof text !== "string") return text;

  try {
    return JSON.parse(text);
  } catch {
    /* fallthrough */
  }

  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch { /* fallthrough */ }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* fallthrough */ }
  }

  throw new Error(`Structured response не JSON: ${text.slice(0, 200)}`);
}

function toBuf(c) {
  return Buffer.isBuffer(c) ? c : Buffer.from(c);
}
