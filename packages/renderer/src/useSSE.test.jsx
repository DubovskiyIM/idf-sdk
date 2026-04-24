import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSSE } from "./useSSE";

describe("useSSE", () => {
  it("accumulates events from stream", async () => {
    const chunks = [
      'data: {"kind":"thinking","text":"hi"}\n\n',
      'data: {"kind":"done","totalCalls":1}\n\n',
    ];
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
            controller.close();
          },
        }),
      }),
    );
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useSSE());
    await act(async () => {
      await result.current.start("/api/test", { task: "x" });
    });

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0]).toEqual({ kind: "thinking", text: "hi" });
    expect(result.current.events[1]).toEqual({ kind: "done", totalCalls: 1 });
  });

  it("sets error on non-ok response", async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
    const { result } = renderHook(() => useSSE());
    await act(async () => {
      await result.current.start("/api/x", {});
    });
    expect(result.current.error).toContain("500");
    expect(result.current.done).toBe(true);
  });

  it("skips malformed JSON lines without crashing", async () => {
    const chunks = [
      'data: {"kind":"thinking","text":"ok"}\n\n',
      "data: not-json\n\n",
      'data: {"kind":"done","totalCalls":1}\n\n',
    ];
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
            controller.close();
          },
        }),
      }),
    );
    const { result } = renderHook(() => useSSE());
    await act(async () => {
      await result.current.start("/api/x", {});
    });
    expect(result.current.events).toHaveLength(2);
    expect(result.current.error).toBe(null);
  });
});
