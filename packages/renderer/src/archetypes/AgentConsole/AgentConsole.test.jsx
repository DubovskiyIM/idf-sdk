import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AgentConsole from "./AgentConsole.jsx";

afterEach(() => cleanup());

describe("AgentConsole archetype", () => {
  it("renders empty state with ChatInput", () => {
    render(
      <AgentConsole
        projection={{ title: "Agent" }}
        events={[]}
        onSubmit={() => {}}
        isRunning={false}
      />,
    );
    expect(screen.getByPlaceholderText(/задачу агенту/i)).toBeDefined();
  });

  it("renders thinking bubble", () => {
    render(
      <AgentConsole
        projection={{}}
        events={[{ kind: "thinking", text: "анализирую" }]}
        onSubmit={() => {}}
        isRunning={true}
      />,
    );
    expect(screen.getByText(/анализирую/)).toBeDefined();
  });

  it("renders accepted effect with green badge", () => {
    render(
      <AgentConsole
        projection={{}}
        events={[
          {
            kind: "effect",
            result: { ok: true, intentId: "buy_asset", effectIds: ["e-1"] },
          },
        ]}
        onSubmit={() => {}}
        isRunning={false}
      />,
    );
    expect(screen.getByText(/accepted/i)).toBeDefined();
  });

  it("renders rejected effect with human-readable reason", () => {
    render(
      <AgentConsole
        projection={{}}
        events={[
          {
            kind: "effect",
            result: {
              ok: false,
              reason: "preapproval_denied",
              failedCheck: "maxAmount",
              intentId: "buy_asset",
            },
          },
        ]}
        onSubmit={() => {}}
        isRunning={false}
      />,
    );
    expect(screen.getByText(/Превышен максимальный/i)).toBeDefined();
  });

  it("calls onSubmit on form submit", () => {
    const onSubmit = vi.fn();
    render(
      <AgentConsole
        projection={{}}
        events={[]}
        onSubmit={onSubmit}
        isRunning={false}
      />,
    );
    const input = screen.getByPlaceholderText(/задачу агенту/i);
    fireEvent.change(input, { target: { value: "test task" } });
    fireEvent.submit(input.closest("form"));
    expect(onSubmit).toHaveBeenCalledWith("test task");
  });

  it("disables input when isRunning=true", () => {
    render(
      <AgentConsole
        projection={{}}
        events={[]}
        onSubmit={() => {}}
        isRunning={true}
      />,
    );
    const input = screen.getByPlaceholderText(/задачу агенту/i);
    expect(input.disabled).toBe(true);
  });

  it("renders done marker", () => {
    render(
      <AgentConsole
        projection={{}}
        events={[{ kind: "done", totalCalls: 3 }]}
        onSubmit={() => {}}
        isRunning={false}
      />,
    );
    expect(screen.getByText(/завершено/i)).toBeDefined();
  });
});
