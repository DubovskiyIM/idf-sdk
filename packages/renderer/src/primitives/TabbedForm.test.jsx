// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import TabbedForm from "./TabbedForm.jsx";

afterEach(cleanup);

const BASE_NODE = {
  type: "tabbedForm",
  tabs: [
    {
      id: "settings",
      title: "Settings",
      fields: [
        { name: "clientId", label: "Client ID", type: "string", required: true },
        { name: "name", label: "Name", type: "string" },
      ],
      onSubmit: { intent: "updateClient" },
    },
    {
      id: "flow",
      title: "Client type",
      fields: [
        { name: "publicClient", label: "Public client", type: "boolean" },
        { name: "protocol", label: "Protocol", type: "string" },
      ],
      onSubmit: { intent: "updateClient" },
    },
    {
      id: "empty",
      title: "Empty tab",
      fields: [],
    },
  ],
};

describe("TabbedForm — базовый рендер", () => {
  it("рендерит все tab-headers и первую tab активной", () => {
    const { container } = render(<TabbedForm node={BASE_NODE} ctx={{ exec: vi.fn() }} />);
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Client type")).toBeTruthy();
    expect(screen.getByText("Empty tab")).toBeTruthy();
    // Settings fields видны (через container.textContent — label может встретиться в
    // placeholder или ещё где-то, getByText требует unique)
    expect(container.textContent).toContain("Client ID");
    expect(container.textContent).toContain("Name");
  });

  it("переключение вкладки показывает поля другого tab'а", () => {
    const { container } = render(<TabbedForm node={BASE_NODE} ctx={{ exec: vi.fn() }} />);
    // Изначально — Settings fields
    expect(container.textContent).toContain("Client ID");
    expect(container.textContent).not.toContain("Public client");
    // Click Client type
    fireEvent.click(screen.getByText("Client type"));
    expect(container.textContent).toContain("Public client");
    expect(container.textContent).toContain("Protocol");
    // Client ID уходит из DOM
    expect(container.textContent).not.toContain("Client ID");
  });

  it("required-маркер '*' отображается рядом с label", () => {
    const { container } = render(<TabbedForm node={BASE_NODE} ctx={{ exec: vi.fn() }} />);
    // Client ID — required, next sibling должен содержать *
    expect(container.textContent).toContain("*");
  });

  it("initialTab управляет стартовой вкладкой", () => {
    const node = { ...BASE_NODE, initialTab: "flow" };
    const { container } = render(<TabbedForm node={node} ctx={{ exec: vi.fn() }} />);
    expect(container.textContent).toContain("Public client");
    expect(container.textContent).not.toContain("Client ID");
  });

  it("пустой tabs → placeholder message", () => {
    const { container } = render(<TabbedForm node={{ type: "tabbedForm", tabs: [] }} ctx={{ exec: vi.fn() }} />);
    expect(container.textContent).toContain("нет вкладок");
  });

  it("пустые fields в tab'е → empty message", () => {
    render(<TabbedForm node={BASE_NODE} ctx={{ exec: vi.fn() }} />);
    fireEvent.click(screen.getByText("Empty tab"));
    expect(screen.getByText(/нет полей/)).toBeTruthy();
  });
});

describe("TabbedForm — save (dirty tracking + exec)", () => {
  it("Save кнопка disabled при clean state, enabled после edit", () => {
    const exec = vi.fn();
    const { container } = render(
      <TabbedForm node={BASE_NODE} ctx={{ exec }} target={{ id: "c1", clientId: "my-app", name: "Old" }} />
    );
    const saveBtn = screen.getByText("Сохранить");
    expect(saveBtn.disabled).toBe(true);
    // Симулируем edit через input
    const nameInput = container.querySelector("input[value='Old']")
      || container.querySelectorAll("input")[1];
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "New" } });
    }
    expect(screen.getByText("Сохранить").disabled).toBe(false);
  });

  it("Save вызывает ctx.exec(onSubmit.intent, { ...values, id: target.id })", () => {
    const exec = vi.fn();
    const target = { id: "client-1", clientId: "my-app", name: "Original" };
    const { container } = render(
      <TabbedForm node={BASE_NODE} ctx={{ exec }} target={target} />
    );
    // Edit name
    const inputs = container.querySelectorAll("input");
    const nameInput = [...inputs].find(i => i.value === "Original");
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "Changed" } });
    }
    // Click Save
    fireEvent.click(screen.getByText("Сохранить"));
    expect(exec).toHaveBeenCalledWith(
      "updateClient",
      expect.objectContaining({ id: "client-1", clientId: "my-app" }),
    );
  });

  it("dirty state локален для текущей tab'ы — переключение не очищает values", () => {
    const exec = vi.fn();
    const { container } = render(
      <TabbedForm node={BASE_NODE} ctx={{ exec }} target={{ id: "c1" }} />
    );
    const input = container.querySelector("input");
    if (input) fireEvent.change(input, { target: { value: "new-id" } });
    fireEvent.click(screen.getByText("Client type"));
    fireEvent.click(screen.getByText("Settings"));
    // Value сохранён
    const reInput = container.querySelector("input");
    expect(reInput.value).toBe("new-id");
  });

  it("без onSubmit.intent в tab'е — Save кнопка не рендерится", () => {
    const node = {
      ...BASE_NODE,
      tabs: [{ id: "view", title: "View", fields: [{ name: "x", type: "string" }] }],
    };
    const { container } = render(<TabbedForm node={node} ctx={{ exec: vi.fn() }} />);
    expect(container.textContent).not.toContain("Сохранить");
  });
});

describe("TabbedForm — target overlay initial values", () => {
  it("target fields populate начальные значения, node.value override'ит", () => {
    const target = { id: "c1", clientId: "from-target", name: "TargetName" };
    const node = {
      ...BASE_NODE,
      value: { name: "OverrideName" },
    };
    const { container } = render(<TabbedForm node={node} target={target} ctx={{ exec: vi.fn() }} />);
    const inputs = container.querySelectorAll("input");
    // node.value override'ит target для name
    expect([...inputs].some(i => i.value === "OverrideName")).toBe(true);
    // clientId из target — не переопределён
    expect([...inputs].some(i => i.value === "from-target")).toBe(true);
  });
});
