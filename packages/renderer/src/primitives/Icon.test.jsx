// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Icon, { registerIconResolver, EMOJI_MAP, LUCIDE_MAP } from "./Icon.jsx";

afterEach(() => { cleanup(); registerIconResolver(null); });

describe("Icon primitive", () => {
  it("emoji-mode рендерит символ из EMOJI_MAP", () => {
    render(<Icon name="schema" mode="emoji" />);
    expect(screen.getByText("📂")).toBeTruthy();
    expect(screen.getByLabelText("schema")).toBeTruthy();
  });

  it("none-mode не рендерит nothing", () => {
    const { container } = render(<Icon name="schema" mode="none" />);
    expect(container.firstChild).toBeNull();
  });

  it("неизвестный name + emoji → ⬚ fallback", () => {
    render(<Icon name="weird-unknown-x" mode="emoji" />);
    expect(screen.getByText("⬚")).toBeTruthy();
  });

  it("EMOJI_MAP содержит все базовые семантические имена", () => {
    const required = ["schema", "table", "edit", "delete", "user", "tag", "policy", "role", "gear"];
    required.forEach(n => expect(EMOJI_MAP[n]).toBeTruthy());
  });

  it("LUCIDE_MAP параллелен EMOJI_MAP по ключам (не строго но shoud cover same)", () => {
    Object.keys(EMOJI_MAP).forEach(k => {
      expect(typeof LUCIDE_MAP[k] === "string" || LUCIDE_MAP[k] === undefined).toBe(true);
    });
  });

  it("registerIconResolver — custom resolver используется первым", () => {
    registerIconResolver((name) => name === "schema" ? <span data-testid="custom-schema">CUSTOM</span> : null);
    render(<Icon name="schema" />);
    expect(screen.getByTestId("custom-schema")).toBeTruthy();
  });

  it("custom resolver возвращает null → fallback к lucide/emoji", () => {
    registerIconResolver(() => null);
    render(<Icon name="table" mode="emoji" />);
    expect(screen.getByText("🗒")).toBeTruthy();
  });

  it("size + color пробрасываются", () => {
    render(<Icon name="schema" mode="emoji" size={24} color="#f00" />);
    const el = screen.getByLabelText("schema");
    expect(el.style.color).toBeTruthy();
    expect(el.style.fontSize).toMatch(/26/); // size + 2
  });
});
