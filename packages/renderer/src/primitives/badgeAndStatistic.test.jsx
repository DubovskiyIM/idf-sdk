/**
 * Badge toneMap/toneBind + Statistic primitive (backlog §8.4 / §8.6).
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Badge, Statistic } from "./atoms.jsx";

const ctx = { world: {}, viewer: { id: "u1" } };

describe("Badge toneMap (backlog §8.6)", () => {
  it("без toneMap — дефолтный (индиго) tone", () => {
    const { container } = render(<Badge node={{ bind: "status" }} ctx={ctx} item={{ status: "draft" }} />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
    expect(span.style.background).toBe("rgb(238, 242, 255)"); // default.bg
  });

  it("toneMap: { published: 'success' } → зелёный для published", () => {
    const { container } = render(
      <Badge
        node={{ bind: "status", toneMap: { published: "success", draft: "neutral" } }}
        ctx={ctx}
        item={{ status: "published" }}
      />,
    );
    const span = container.querySelector("span");
    expect(span.style.background).toBe("rgb(220, 252, 231)"); // success.bg
  });

  it("toneMap: { draft: 'neutral' } — серый для draft", () => {
    const { container } = render(
      <Badge
        node={{ bind: "status", toneMap: { draft: "neutral" } }}
        ctx={ctx}
        item={{ status: "draft" }}
      />,
    );
    const span = container.querySelector("span");
    expect(span.style.background).toBe("rgb(243, 244, 246)"); // neutral.bg
  });

  it("toneBind — resolve tone из поля item", () => {
    const { container } = render(
      <Badge
        node={{ bind: "status", toneBind: "_tone" }}
        ctx={ctx}
        item={{ status: "active", _tone: "warning" }}
      />,
    );
    const span = container.querySelector("span");
    expect(span.style.background).toBe("rgb(254, 243, 199)"); // warning.bg
  });

  it("explicit color имеет приоритет над toneMap", () => {
    const { container } = render(
      <Badge
        node={{ bind: "status", color: "danger", toneMap: { x: "success" } }}
        ctx={ctx}
        item={{ status: "x" }}
      />,
    );
    const span = container.querySelector("span");
    expect(span.style.background).toBe("rgb(254, 226, 226)"); // danger.bg
  });

  it("toneMap с unknown value → дефолтный", () => {
    const { container } = render(
      <Badge
        node={{ bind: "status", toneMap: { published: "success" } }}
        ctx={ctx}
        item={{ status: "draft" }} // в toneMap нет
      />,
    );
    const span = container.querySelector("span");
    expect(span.style.background).toBe("rgb(238, 242, 255)"); // default
  });
});

describe("Statistic primitive (backlog §8.4)", () => {
  it("рендерит title + number + suffix", () => {
    const { container } = render(
      <Statistic
        node={{ title: "Бюджет", bind: "budget", suffix: "₽" }}
        ctx={ctx}
        item={{ budget: 15000 }}
      />,
    );
    expect(container.textContent).toContain("Бюджет");
    expect(container.textContent).toContain("15");
    expect(container.textContent).toContain("000");
    expect(container.textContent).toContain("₽");
  });

  it("отсутствующее значение → пустая строка", () => {
    const { container } = render(
      <Statistic node={{ bind: "missing" }} ctx={ctx} item={{}} />,
    );
    // Не падает; может показать пустоту.
    expect(container).toBeTruthy();
  });

  it("prefix рендерится", () => {
    const { container } = render(
      <Statistic
        node={{ prefix: "$", bind: "value" }}
        ctx={ctx}
        item={{ value: 100 }}
      />,
    );
    expect(container.textContent).toContain("$");
    expect(container.textContent).toContain("100");
  });

  it("без title — только число без заголовка", () => {
    const { container } = render(
      <Statistic node={{ bind: "value" }} ctx={ctx} item={{ value: 42 }} />,
    );
    expect(container.textContent).toContain("42");
    // Нет заглавия — проверяем, что uppercase-label пусто.
    const headerDivs = Array.from(container.querySelectorAll("div")).filter(
      d => d.style.textTransform === "uppercase",
    );
    expect(headerDivs).toHaveLength(0);
  });
});
