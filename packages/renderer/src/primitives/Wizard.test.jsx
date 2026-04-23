// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import Wizard from "./Wizard.jsx";

afterEach(cleanup);

const simpleSteps = [
  {
    id: "type",
    title: "Type",
    fields: [
      { name: "type", label: "Catalog type", type: "select", options: ["relational", "messaging"], required: true },
    ],
  },
  {
    id: "provider",
    title: "Provider",
    fields: [
      { name: "provider", label: "Provider", type: "select", options: ["hive", "iceberg"] },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    fields: [
      { name: "uri", label: "URI", type: "text", required: true },
      { name: "user", label: "Username", type: "text" },
    ],
    testConnection: { intent: "testConnection", label: "Test Connection" },
  },
];

describe("Wizard — basic rendering", () => {
  it("рендерит progress с номерами шагов + labels", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    expect(screen.getByText("Type")).toBeTruthy();
    expect(screen.getByText("Provider")).toBeTruthy();
    expect(screen.getByText("Configuration")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("рендерит fields первого шага", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    expect(screen.getByText("Catalog type")).toBeTruthy();
  });

  it("Next button видим на первом шаге, Submit — на последнем", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    expect(screen.getByText(/Next/)).toBeTruthy();
    expect(screen.queryByText("Submit")).toBeNull();
  });

  it("пустой steps → 'Нет шагов'", () => {
    render(<Wizard node={{ type: "wizard", steps: [] }} />);
    expect(screen.getByText("Нет шагов")).toBeTruthy();
  });

  it("Back disabled на первом шаге", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    const backBtn = screen.getByText(/Back/);
    expect(backBtn.disabled).toBe(true);
  });
});

describe("Wizard — navigation", () => {
  it("Next переключает на следующий шаг", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    fireEvent.click(screen.getByText(/Next/));
    expect(screen.getByText("Provider", { selector: "label" })).toBeTruthy();
  });

  it("Back возвращает на предыдущий", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Back/));
    expect(screen.getByText("Catalog type")).toBeTruthy();
  });

  it("Submit на последнем шаге вызывает onSubmit с values", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <Wizard node={{ type: "wizard", steps: simpleSteps }} onSubmit={onSubmit} />
    );
    // Шаг 1: select type
    const typeSelect = container.querySelector("select");
    fireEvent.change(typeSelect, { target: { value: "relational" } });
    fireEvent.click(screen.getByText(/Next/));
    // Шаг 2: select provider
    const providerSelect = container.querySelector("select");
    fireEvent.change(providerSelect, { target: { value: "hive" } });
    fireEvent.click(screen.getByText(/Next/));
    // Шаг 3: type URI
    const uriInput = screen.getByLabelText(/URI/);
    fireEvent.change(uriInput, { target: { value: "thrift://x" } });
    fireEvent.click(screen.getByText("Submit"));
    expect(onSubmit).toHaveBeenCalledWith({
      type: "relational",
      provider: "hive",
      uri: "thrift://x",
    });
  });
});

describe("Wizard — dependsOn step filtering", () => {
  it("step с dependsOn пропускается если condition не match", () => {
    const steps = [
      { id: "type", title: "Type", fields: [{ name: "type", type: "select", options: ["a", "b"] }] },
      { id: "only-a", title: "A-only", fields: [{ name: "x", type: "text" }], dependsOn: { type: "a" } },
      { id: "always", title: "Always", fields: [{ name: "y", type: "text" }] },
    ];
    render(<Wizard node={{ type: "wizard", steps }} value={{ type: "b" }} />);
    // "A-only" не должен появиться в progress
    expect(screen.queryByText("A-only")).toBeNull();
    expect(screen.getByText("Always")).toBeTruthy();
  });

  it("step с dependsOn появляется когда condition match", () => {
    const steps = [
      { id: "type", title: "Type", fields: [{ name: "type", type: "select", options: ["a", "b"] }] },
      { id: "only-a", title: "A-only", fields: [], dependsOn: { type: "a" } },
    ];
    render(<Wizard node={{ type: "wizard", steps }} value={{ type: "a" }} />);
    expect(screen.getByText("A-only")).toBeTruthy();
  });
});

describe("Wizard — test-connection control", () => {
  it("рендерит button на шаге с testConnection спекой", () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    expect(screen.getByText("Test Connection")).toBeTruthy();
  });

  it("click Test Connection → ctx.testConnection с intent + values", async () => {
    const testConnection = vi.fn().mockResolvedValue({ ok: true, message: "OK" });
    const ctx = { testConnection };
    render(
      <Wizard
        node={{ type: "wizard", steps: simpleSteps }}
        value={{ type: "relational", provider: "hive", uri: "thrift://x" }}
        ctx={ctx}
      />
    );
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText("Test Connection"));
    await waitFor(() => expect(testConnection).toHaveBeenCalled());
    expect(testConnection.mock.calls[0][0]).toBe("testConnection");
    expect(testConnection.mock.calls[0][1].type).toBe("relational");
  });

  it("success result показывает OK message", async () => {
    const ctx = { testConnection: vi.fn().mockResolvedValue({ ok: true, message: "Connected!" }) };
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} ctx={ctx} />);
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText("Test Connection"));
    await waitFor(() => expect(screen.getByText(/Connected!/)).toBeTruthy());
  });

  it("error result показывает error message", async () => {
    const ctx = { testConnection: vi.fn().mockResolvedValue({ ok: false, message: "Auth failed" }) };
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} ctx={ctx} />);
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText("Test Connection"));
    await waitFor(() => expect(screen.getByText(/Auth failed/)).toBeTruthy());
  });

  it("без ctx.testConnection → ошибка 'не реализован'", async () => {
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} />);
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText("Test Connection"));
    await waitFor(() => expect(screen.getByText(/не реализован/)).toBeTruthy());
  });
});

describe("Wizard — adapter delegation", () => {
  it("использует adapter component если зарегистрирован", () => {
    const Adapted = ({ node }) => <div data-testid="adapter-wizard">adapter:{node.steps.length}</div>;
    const ctx = {
      adapter: {
        getComponent: (kind, type) =>
          kind === "primitive" && type === "wizard" ? Adapted : null,
      },
    };
    render(<Wizard node={{ type: "wizard", steps: simpleSteps }} ctx={ctx} />);
    expect(screen.getByTestId("adapter-wizard").textContent).toBe("adapter:3");
  });
});
