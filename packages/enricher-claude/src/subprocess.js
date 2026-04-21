import { spawn } from "node:child_process";

/**
 * Вызывает `claude` CLI non-interactively: `-p --bare --output-format json --json-schema`.
 * input передаётся через stdin как JSON. Ответ — parsed structured-response.
 *
 * @param {{ systemPrompt: string, input: unknown, schema: object, claudeBin?: string }} opts
 * @returns {Promise<object>} — содержимое result-поля распарсенное как JSON
 */
export async function callClaude({ systemPrompt, input, schema, claudeBin = "claude" }) {
  const args = [
    "-p",
    "--bare",
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
  try {
    return typeof innerText === "string" ? JSON.parse(innerText) : innerText;
  } catch (err) {
    throw new Error(`Structured response внутри claude result не JSON: ${String(innerText).slice(0, 200)}`);
  }
}

function toBuf(c) {
  return Buffer.isBuffer(c) ? c : Buffer.from(c);
}
