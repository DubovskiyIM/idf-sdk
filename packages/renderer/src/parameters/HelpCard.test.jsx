// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import HelpCard from "./HelpCard.jsx";
import ParameterControl from "./index.jsx";

afterEach(cleanup);

describe("HelpCard", () => {
  it("null help → не рендерится", () => {
    const { container } = render(<HelpCard help={null} />);
    expect(container.textContent).toBe("");
  });

  it("string shortcut — renders text only", () => {
    const { getByText } = render(<HelpCard help="Совет" />);
    expect(getByText("Совет")).toBeTruthy();
  });

  it("full spec — title + text + icon", () => {
    const help = {
      title: "Какую стоимость поставить?",
      text: "Укажите стоимость, которую готовы заплатить за задание.",
      icon: "💰",
    };
    const { getByText } = render(<HelpCard help={help} />);
    expect(getByText("Какую стоимость поставить?")).toBeTruthy();
    expect(getByText("Укажите стоимость, которую готовы заплатить за задание.")).toBeTruthy();
    expect(getByText("💰")).toBeTruthy();
  });

  it("дефолтная иконка — 💡", () => {
    const { getByText } = render(<HelpCard help={{ title: "x" }} />);
    expect(getByText("💡")).toBeTruthy();
  });

  it("role='note' для accessibility", () => {
    const { container } = render(<HelpCard help={{ title: "x" }} />);
    expect(container.firstChild.getAttribute("role")).toBe("note");
  });

  it("без title и text → не рендерится", () => {
    const { container } = render(<HelpCard help={{ icon: "🚀" }} />);
    expect(container.textContent).toBe("");
  });
});

describe("ParameterControl + help integration", () => {
  it("spec.help object — рендерит hint-card под input'ом", () => {
    const { getByText } = render(
      <ParameterControl
        spec={{
          name: "budget",
          control: "number",
          help: {
            title: "Какую стоимость поставить?",
            text: "Важно, чтобы цена соответствовала объёму работы.",
          },
        }}
        value=""
        onChange={() => {}}
      />,
    );
    expect(getByText("Какую стоимость поставить?")).toBeTruthy();
    expect(getByText("Важно, чтобы цена соответствовала объёму работы.")).toBeTruthy();
  });

  it("spec.help string — shortcut form", () => {
    const { getByText } = render(
      <ParameterControl
        spec={{ name: "city", control: "text", help: "Укажите город" }}
        value=""
        onChange={() => {}}
      />,
    );
    expect(getByText("Укажите город")).toBeTruthy();
  });

  it("spec без help → hint-card не рендерится", () => {
    const { queryByRole } = render(
      <ParameterControl
        spec={{ name: "title", control: "text" }}
        value=""
        onChange={() => {}}
      />,
    );
    expect(queryByRole("note")).toBeNull();
  });
});
