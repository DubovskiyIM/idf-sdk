import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";

// Mock child_process.spawn до import'а subprocess.js
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";
import { callClaude } from "../src/subprocess.js";

function fakeChild({ stdout = "", stderr = "", exitCode = 0 } = {}) {
  const child = new EventEmitter();
  child.stdin = new Writable({
    write(_chunk, _enc, cb) { cb(); },
    final(cb) { cb(); },
  });
  child.stdout = Readable.from([stdout]);
  child.stderr = Readable.from([stderr]);
  setImmediate(() => child.emit("exit", exitCode));
  return child;
}

beforeEach(() => {
  spawn.mockReset();
});

describe("callClaude", () => {
  it("happy path — парсит JSON-ответ claude CLI", async () => {
    // Claude CLI в --output-format json возвращает { type, subtype, result, ... }
    const claudeResponse = JSON.stringify({
      type: "result",
      result: JSON.stringify({
        namedIntents: [{ name: "approve_order", target: "Order", reason: "x" }],
        absorbHints: [],
        additionalRoles: [],
        baseRoles: [],
      }),
    });
    spawn.mockReturnValue(fakeChild({ stdout: claudeResponse }));

    const result = await callClaude({
      systemPrompt: "test",
      input: { entities: {} },
      schema: { type: "object" },
    });

    expect(result.namedIntents).toHaveLength(1);
    expect(result.namedIntents[0].name).toBe("approve_order");
  });

  it("передаёт флаги: -p --bare --output-format json --append-system-prompt --json-schema", async () => {
    const response = JSON.stringify({
      type: "result",
      result: '{"namedIntents":[],"absorbHints":[],"additionalRoles":[],"baseRoles":[]}',
    });
    spawn.mockReturnValue(fakeChild({ stdout: response }));

    await callClaude({
      systemPrompt: "sys",
      input: {},
      schema: { type: "object" },
    });

    const args = spawn.mock.calls[0][1];
    expect(args).toContain("-p");
    expect(args).toContain("--output-format");
    expect(args).toContain("json");
    expect(args).toContain("--append-system-prompt");
    expect(args).toContain("--json-schema");
  });

  it("non-zero exit → throw", async () => {
    spawn.mockReturnValue(
      fakeChild({ stdout: "", stderr: "auth failed", exitCode: 2 })
    );

    await expect(
      callClaude({ systemPrompt: "s", input: {}, schema: {} })
    ).rejects.toThrow(/exit.*2|auth failed/i);
  });

  it("stderr warning не блокирует happy-path parsing", async () => {
    const response = JSON.stringify({
      type: "result",
      result: '{"namedIntents":[],"absorbHints":[],"additionalRoles":[],"baseRoles":[]}',
    });
    spawn.mockReturnValue(
      fakeChild({ stdout: response, stderr: "Warning: ...", exitCode: 0 })
    );

    const result = await callClaude({
      systemPrompt: "s",
      input: {},
      schema: {},
    });
    expect(result).toBeDefined();
  });
});
