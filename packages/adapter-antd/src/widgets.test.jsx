/**
 * Юнит-тесты виджетов adapter-antd (backlog §2).
 * Рендер через @testing-library/react + jsdom.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { antdAdapter } from "./adapter.jsx";
import { pickBest, rankCandidates } from "@intent-driven/renderer";

// jsdom не реализует matchMedia/getComputedStyle полноценно — AntD v6
// Table/Steps используют responsive observer. Stub'аем минимально.
beforeAll(() => {
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    });
  }
});

afterEach(cleanup);

function get(kind, type) {
  return antdAdapter[kind][type];
}

describe("adapter-antd buttons (2.1)", () => {
  it("PrimaryButton читает children и рендерит их", () => {
    const Primary = get("button", "primary");
    render(<Primary onClick={() => {}}>Сохранить</Primary>);
    expect(screen.getByRole("button", { name: /Сохранить/ })).toBeTruthy();
  });

  it("PrimaryButton читает label (обратная совместимость)", () => {
    const Primary = get("button", "primary");
    render(<Primary label="Создать" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /Создать/ })).toBeTruthy();
  });

  it("PrimaryButton: label имеет приоритет над children", () => {
    const Primary = get("button", "primary");
    render(<Primary label="LABEL" onClick={() => {}}>CHILDREN</Primary>);
    expect(screen.getByRole("button", { name: /LABEL/ })).toBeTruthy();
    expect(screen.queryByText("CHILDREN")).toBeNull();
  });

  it("SecondaryButton с children", () => {
    const Sec = get("button", "secondary");
    render(<Sec onClick={() => {}}>Отмена</Sec>);
    expect(screen.getByRole("button", { name: /Отмена/ })).toBeTruthy();
  });

  it("DangerButton с children", () => {
    const Danger = get("button", "danger");
    render(<Danger onClick={() => {}}>Удалить</Danger>);
    expect(screen.getByRole("button", { name: /Удалить/ })).toBeTruthy();
  });
});

describe("AntdDateTime (2.2)", () => {
  it("spec.withTime=true включает time-picker (placeholder с временем)", () => {
    const DT = get("parameter", "datetime");
    const { container } = render(
      <DT spec={{ name: "deadline", withTime: true }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("placeholder")).toMatch(/время/i);
  });

  it("spec.precision=\"minute\" включает time-picker", () => {
    const DT = get("parameter", "datetime");
    const { container } = render(
      <DT spec={{ name: "startAt", precision: "minute" }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("placeholder")).toMatch(/время/i);
  });

  it("без withTime и precision → date-only (placeholder без времени)", () => {
    const DT = get("parameter", "datetime");
    const { container } = render(
      <DT spec={{ name: "birthDate" }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("placeholder")).not.toMatch(/время/i);
  });
});

describe("AntdNumber fieldRole (2.3)", () => {
  it("fieldRole=\"money\" → prefix ₽", () => {
    const Num = get("parameter", "number");
    const { container } = render(
      <Num spec={{ name: "fee", fieldRole: "money" }} value={100} onChange={() => {}} />
    );
    expect(container.innerHTML).toContain("₽");
  });

  it("fieldRole=\"price\" → prefix ₽ (backlog 2.3)", () => {
    const Num = get("parameter", "number");
    const { container } = render(
      <Num spec={{ name: "amount", fieldRole: "price" }} value={100} onChange={() => {}} />
    );
    expect(container.innerHTML).toContain("₽");
  });

  it("fieldRole=\"percentage\" → suffix %", () => {
    const Num = get("parameter", "number");
    const { container } = render(
      <Num spec={{ name: "rate", fieldRole: "percentage" }} value={5} onChange={() => {}} />
    );
    expect(container.innerHTML).toContain("%");
  });
});

describe("adapter affinity scoring (task #14)", () => {
  it("price fieldRole: pickBest выбирает AntdNumber, не AntdTextInput", () => {
    const best = pickBest(
      "parameter",
      { type: "text", fieldRole: "price", name: "fee" },
      antdAdapter
    );
    expect(best).toBe(antdAdapter.parameter.number);
  });

  it("withTime=true: pickBest выбирает AntdDateTime", () => {
    const best = pickBest(
      "parameter",
      { type: "datetime", withTime: true, name: "deadline" },
      antdAdapter
    );
    expect(best).toBe(antdAdapter.parameter.datetime);
  });

  it("spec.name=\"phoneNumber\": AntdTel получает field-бонус", () => {
    const ranked = rankCandidates(
      "parameter",
      { type: "text", name: "phoneNumber" },
      antdAdapter
    );
    expect(ranked[0].type).toBe("tel");
  });

  it("spec.name=\"email\": AntdEmail ранжируется выше AntdText", () => {
    const ranked = rankCandidates(
      "parameter",
      { type: "text", name: "email" },
      antdAdapter
    );
    expect(ranked[0].type).toBe("email");
  });
});

describe("AntdBreadcrumbs primitive", () => {
  it("рендерит items как breadcrumb", () => {
    const B = get("primitive", "breadcrumbs");
    expect(B).toBeDefined();
    render(
      <B
        node={{
          type: "breadcrumbs",
          items: [
            { label: "Metalakes", projection: "metalake_list" },
            { label: "prod", projection: "metalake_detail" },
            { label: "Catalog" },
          ],
        }}
      />
    );
    expect(screen.getByText("Metalakes")).toBeTruthy();
    expect(screen.getByText("prod")).toBeTruthy();
    expect(screen.getByText("Catalog")).toBeTruthy();
  });

  it("пустой items → null (не крэш)", () => {
    const B = get("primitive", "breadcrumbs");
    const { container } = render(<B node={{ type: "breadcrumbs", items: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it("click на link вызывает ctx.navigate с projection+params", () => {
    const B = get("primitive", "breadcrumbs");
    const calls = [];
    const ctx = { navigate: (...args) => calls.push(args) };
    render(
      <B
        node={{
          type: "breadcrumbs",
          items: [
            { label: "Root", projection: "root_list", params: { a: 1 } },
            { label: "Current" },
          ],
        }}
        ctx={ctx}
      />
    );
    fireEvent.click(screen.getByText("Root"));
    expect(calls[0]?.[0]).toBe("root_list");
    expect(calls[0]?.[1]).toEqual({ a: 1 });
  });

  it("capability registered: adapter.capabilities.primitive.breadcrumbs === true", () => {
    expect(antdAdapter.capabilities?.primitive?.breadcrumbs).toBe(true);
  });
});

describe("AntdDataGrid primitive", () => {
  it("рендерит rows через AntD Table", () => {
    const G = get("primitive", "dataGrid");
    render(
      <G
        node={{
          type: "dataGrid",
          items: [{ id: 1, name: "a" }, { id: 2, name: "b" }],
          columns: [{ key: "name", label: "Name", sortable: true }],
        }}
      />
    );
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
  });

  it("capability registered: dataGrid.sort+filter", () => {
    expect(antdAdapter.capabilities?.primitive?.dataGrid?.sort).toBe(true);
    expect(antdAdapter.capabilities?.primitive?.dataGrid?.filter).toBe(true);
  });
});

describe("AntdWizard primitive", () => {
  it("рендерит AntD Steps + fields", () => {
    const W = get("primitive", "wizard");
    const { container } = render(
      <W
        node={{
          type: "wizard",
          steps: [
            { id: "a", title: "Step A", fields: [{ name: "x", type: "text" }] },
            { id: "b", title: "Step B", fields: [] },
          ],
        }}
      />
    );
    expect(screen.getByText("Step A")).toBeTruthy();
    expect(screen.getByText("Step B")).toBeTruthy();
    expect(container.querySelector(".ant-steps")).toBeTruthy();
  });

  it("пустой steps → 'Нет шагов'", () => {
    const W = get("primitive", "wizard");
    render(<W node={{ type: "wizard", steps: [] }} />);
    expect(screen.getByText("Нет шагов")).toBeTruthy();
  });

  it("capability registered: wizard.testConnection", () => {
    expect(antdAdapter.capabilities?.primitive?.wizard?.testConnection).toBe(true);
  });
});

describe("AntdPropertyPopover primitive", () => {
  it("empty value → 'Нет properties'", () => {
    const P = get("primitive", "propertyPopover");
    render(<P node={{ value: {} }} />);
    expect(screen.getByText(/Нет properties/i)).toBeTruthy();
  });

  it("non-empty value → trigger с counter", () => {
    const P = get("primitive", "propertyPopover");
    render(<P node={{ value: { env: "prod", region: "us-east-1" } }} />);
    expect(screen.getByText(/properties/i)).toBeTruthy();
  });

  it("capability registered", () => {
    expect(antdAdapter.capabilities?.primitive?.propertyPopover).toBe(true);
  });
});

describe("AntdChipList primitive", () => {
  it("рендерит items через AntD Tag", () => {
    const C = get("primitive", "chipList");
    const { container } = render(<C node={{ value: ["PII", "Financial"] }} />);
    expect(screen.getByText("PII")).toBeTruthy();
    expect(container.querySelector(".ant-tag")).toBeTruthy();
  });

  it("overflow +N при maxVisible", () => {
    const C = get("primitive", "chipList");
    render(<C node={{ value: ["a", "b", "c", "d"], maxVisible: 2 }} />);
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("пустой value → emptyLabel", () => {
    const C = get("primitive", "chipList");
    render(<C node={{ value: [], emptyLabel: "Нет тегов" }} />);
    expect(screen.getByText("Нет тегов")).toBeTruthy();
  });

  it("capability registered: chipList.variants", () => {
    expect(antdAdapter.capabilities?.primitive?.chipList?.variants).toEqual(["tag", "policy", "role"]);
  });
});

describe("AntdTextInput validation attrs (2.4)", () => {
  it("maxLength пробрасывается в input", () => {
    const T = get("parameter", "text");
    const { container } = render(
      <T spec={{ name: "cardLastFour", maxLength: 4 }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("maxlength")).toBe("4");
  });

  it("pattern пробрасывается в input", () => {
    const T = get("parameter", "text");
    const { container } = render(
      <T spec={{ name: "cardLastFour", pattern: "\\d{4}" }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("pattern")).toBe("\\d{4}");
  });

  it("minLength пробрасывается в input", () => {
    const T = get("parameter", "text");
    const { container } = render(
      <T spec={{ name: "pin", minLength: 6 }} value="" onChange={() => {}} />
    );
    const input = container.querySelector("input");
    expect(input.getAttribute("minlength")).toBe("6");
  });
});
