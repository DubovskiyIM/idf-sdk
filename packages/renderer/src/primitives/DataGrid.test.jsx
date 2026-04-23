// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import DataGrid from "./DataGrid.jsx";

afterEach(cleanup);

const sample = [
  { id: 1, name: "prod_lake", type: "relational", provider: "hive" },
  { id: 2, name: "dev_lake", type: "messaging", provider: "kafka" },
  { id: 3, name: "analytics", type: "relational", provider: "iceberg" },
];

const columns = [
  { key: "name", label: "Name", sortable: true, filterable: true },
  { key: "type", label: "Type", sortable: true, filterable: true, filter: "enum", values: ["relational", "messaging"] },
  { key: "provider", label: "Provider", sortable: true, filterable: true },
];

describe("DataGrid — rendering", () => {
  it("рендерит items в table rows", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    expect(screen.getByText("prod_lake")).toBeTruthy();
    expect(screen.getByText("dev_lake")).toBeTruthy();
    expect(screen.getByText("analytics")).toBeTruthy();
  });

  it("рендерит column headers с labels", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Type")).toBeTruthy();
    expect(screen.getByText("Provider")).toBeTruthy();
  });

  it("пустые items → empty-row label", () => {
    render(
      <DataGrid
        node={{ type: "dataGrid", items: [], columns, emptyLabel: "Нет метейлейков" }}
      />
    );
    expect(screen.getByText("Нет метейлейков")).toBeTruthy();
  });

  it("array cell value → chip list", () => {
    const withArrays = [{ id: 1, name: "user1", roles: ["admin", "viewer", "observer", "analyst"] }];
    const cols = [{ key: "name" }, { key: "roles" }];
    render(<DataGrid node={{ type: "dataGrid", items: withArrays, columns: cols }} />);
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("viewer")).toBeTruthy();
    // Ограничение на 3 — остальные как +N
    expect(screen.getByText("+1")).toBeTruthy();
  });
});

describe("DataGrid — sorting", () => {
  it("click на sortable header → asc sort", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    fireEvent.click(screen.getByText(/^Name/));
    const rows = screen.getAllByRole("row");
    // row 0 = header, row 1 = filter row, row 2 = first data
    // asc: analytics first, then dev_lake, then prod_lake
    expect(rows[2].textContent).toContain("analytics");
    expect(rows[3].textContent).toContain("dev_lake");
    expect(rows[4].textContent).toContain("prod_lake");
  });

  it("второй click → desc", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    fireEvent.click(screen.getByText(/^Name/));
    fireEvent.click(screen.getByText(/^Name/));
    const rows = screen.getAllByRole("row");
    expect(rows[2].textContent).toContain("prod_lake");
  });

  it("третий click → unsorted (оригинальный порядок)", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    const nameHeader = screen.getByText(/^Name/);
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    const rows = screen.getAllByRole("row");
    expect(rows[2].textContent).toContain("prod_lake"); // original first
  });

  it("aria-sort отражает состояние сортировки", () => {
    const { container } = render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    const nameTh = container.querySelector("th[aria-sort]");
    expect(nameTh.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(nameTh);
    expect(nameTh.getAttribute("aria-sort")).toBe("ascending");
  });
});

describe("DataGrid — filtering", () => {
  it("text filter сужает rows (case-insensitive substring)", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    const inputs = screen.getAllByPlaceholderText("filter…");
    // Первый input — для name column
    fireEvent.change(inputs[0], { target: { value: "lake" } });
    expect(screen.getByText("prod_lake")).toBeTruthy();
    expect(screen.getByText("dev_lake")).toBeTruthy();
    expect(screen.queryByText("analytics")).toBeNull();
  });

  it("enum filter — select с values", () => {
    const { container } = render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    const selects = container.querySelectorAll("select");
    expect(selects.length).toBe(1); // только type column — enum filter
    fireEvent.change(selects[0], { target: { value: "messaging" } });
    expect(screen.getByText("dev_lake")).toBeTruthy();
    expect(screen.queryByText("prod_lake")).toBeNull();
  });
});

describe("DataGrid — column visibility", () => {
  it(">3 columns → появляется ColumnMenu", () => {
    const cols4 = [...columns, { key: "extra", label: "Extra" }];
    const items4 = sample.map(s => ({ ...s, extra: "x" }));
    render(<DataGrid node={{ type: "dataGrid", items: items4, columns: cols4 }} />);
    expect(screen.getByText(/Columns \(4\/4\)/)).toBeTruthy();
  });

  it("≤3 columns → ColumnMenu не показывается", () => {
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} />);
    expect(screen.queryByText(/Columns \(/)).toBeNull();
  });

  it("toggle column visibility скрывает/показывает column", () => {
    const cols4 = [...columns, { key: "extra", label: "Extra" }];
    const items4 = sample.map(s => ({ ...s, extra: "x" }));
    const { container } = render(<DataGrid node={{ type: "dataGrid", items: items4, columns: cols4 }} />);
    // до toggle — header с Extra существует (`<th>Extra</th>`)
    const headsBefore = Array.from(container.querySelectorAll("th")).map(t => t.textContent);
    expect(headsBefore.some(t => t.includes("Extra"))).toBe(true);
    // click menu button + toggle Extra off
    fireEvent.click(screen.getByText(/Columns \(/));
    const extraCheckbox = screen.getByLabelText(/Extra/);
    fireEvent.click(extraCheckbox);
    // после toggle — header'а нет в <th>; label в dropdown остался
    const headsAfter = Array.from(container.querySelectorAll("th")).map(t => t.textContent);
    expect(headsAfter.some(t => t.includes("Extra"))).toBe(false);
  });
});

describe("DataGrid — row click navigation", () => {
  it("onItemClick function — вызывается с item", () => {
    const onItemClick = vi.fn();
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns, onItemClick }} />);
    fireEvent.click(screen.getByText("prod_lake"));
    expect(onItemClick).toHaveBeenCalledWith(sample[0]);
  });

  it("onItemClick declarative — navigate с bound params", () => {
    const navigate = vi.fn();
    const ctx = { navigate };
    render(
      <DataGrid
        node={{
          type: "dataGrid",
          items: sample,
          columns,
          onItemClick: {
            action: "navigate",
            to: "metalake_detail",
            params: { metalakeId: "item.id" },
          },
        }}
        ctx={ctx}
      />
    );
    fireEvent.click(screen.getByText("dev_lake"));
    expect(navigate).toHaveBeenCalledWith("metalake_detail", { metalakeId: 2 });
  });
});

describe("DataGrid — action column (col.kind='actions')", () => {
  const actionsCol = {
    key: "_actions",
    label: "Actions",
    kind: "actions",
    actions: [
      { intent: "grantRole", label: "Grant", params: { user: "item.name" } },
      { intent: "revokeRole", label: "Revoke", params: { user: "item.name" }, danger: true },
    ],
  };

  it("рендерит buttons для каждого action в каждой row", () => {
    const columns2 = [{ key: "name", label: "Name" }, actionsCol];
    const { container } = render(<DataGrid node={{ type: "dataGrid", items: sample, columns: columns2 }} ctx={{ exec: vi.fn() }} />);
    const grantBtns = container.querySelectorAll("button");
    const grantLabels = Array.from(grantBtns).filter(b => b.textContent === "Grant");
    expect(grantLabels.length).toBe(sample.length);
  });

  it("click → ctx.exec с resolved params (item.X)", () => {
    const exec = vi.fn();
    const columns2 = [{ key: "name", label: "Name" }, actionsCol];
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns: columns2 }} ctx={{ exec }} />);
    const grantBtn = screen.getAllByText("Grant")[0];
    fireEvent.click(grantBtn);
    expect(exec).toHaveBeenCalledWith("grantRole", { user: "prod_lake" });
  });

  it("click не триггерит onItemClick (stopPropagation)", () => {
    const onItemClick = vi.fn();
    const exec = vi.fn();
    const columns2 = [{ key: "name", label: "Name" }, actionsCol];
    render(
      <DataGrid
        node={{ type: "dataGrid", items: sample, columns: columns2, onItemClick }}
        ctx={{ exec }}
      />
    );
    fireEvent.click(screen.getAllByText("Grant")[0]);
    expect(exec).toHaveBeenCalled();
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it("action.params route.X резолвится через ctx.routeParams", () => {
    const exec = vi.fn();
    const col = {
      ...actionsCol,
      actions: [{ intent: "grantRole", label: "Grant", params: { user: "item.name", metalake: "route.metalakeId" } }],
    };
    const columns2 = [{ key: "name", label: "Name" }, col];
    render(
      <DataGrid
        node={{ type: "dataGrid", items: sample, columns: columns2 }}
        ctx={{ exec, routeParams: { metalakeId: "m_prod" } }}
      />
    );
    fireEvent.click(screen.getAllByText("Grant")[0]);
    expect(exec).toHaveBeenCalledWith("grantRole", { user: "prod_lake", metalake: "m_prod" });
  });

  it("action.disabled как function — disabled button", () => {
    const exec = vi.fn();
    const col = {
      ...actionsCol,
      actions: [{ intent: "grantRole", label: "Grant", params: {}, disabled: (item) => item.name === "prod_lake" }],
    };
    const columns2 = [{ key: "name", label: "Name" }, col];
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns: columns2 }} ctx={{ exec }} />);
    const buttons = screen.getAllByText("Grant");
    expect(buttons[0].disabled).toBe(true);  // prod_lake
    expect(buttons[1].disabled).toBe(false); // dev_lake
  });

  it("action column не sortable / не filterable (skipped)", () => {
    const columns2 = [{ key: "name", label: "Name", sortable: true }, actionsCol];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns: columns2 }} ctx={{ exec: vi.fn() }} />
    );
    const actionsHead = Array.from(container.querySelectorAll("th")).find(t => t.textContent.includes("Actions"));
    expect(actionsHead.getAttribute("aria-sort")).toBe("none");
    expect(actionsHead.style.cursor).toBe("default");
  });
});

describe("DataGrid — action column display modes", () => {
  const threeActions = {
    key: "_actions",
    label: "Actions",
    kind: "actions",
    actions: [
      { intent: "edit", label: "Edit", params: {} },
      { intent: "duplicate", label: "Duplicate", params: {} },
      { intent: "remove", label: "Delete", params: {}, danger: true },
    ],
  };

  it("display:'auto' + ≤2 actions → inline buttons", () => {
    const twoActions = { ...threeActions, actions: threeActions.actions.slice(0, 2) };
    const columns = [{ key: "name" }, twoActions];
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />);
    // inline — видны labels без клика
    expect(screen.getAllByText("Edit").length).toBe(sample.length);
    expect(screen.getAllByText("Duplicate").length).toBe(sample.length);
  });

  it("display:'auto' + >2 actions → menu trigger (⋯)", () => {
    const columns = [{ key: "name" }, threeActions];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />
    );
    // menu triggers — по одному на строку, label'ы скрыты до клика
    const triggers = Array.from(container.querySelectorAll("button")).filter(b => b.textContent === "⋯");
    expect(triggers.length).toBe(sample.length);
    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("display:'menu' + 2 actions → menu (force)", () => {
    const twoActions = { ...threeActions, actions: threeActions.actions.slice(0, 2), display: "menu" };
    const columns = [{ key: "name" }, twoActions];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />
    );
    const triggers = Array.from(container.querySelectorAll("button")).filter(b => b.textContent === "⋯");
    expect(triggers.length).toBe(sample.length);
  });

  it("display:'inline' + 3 actions → inline (force)", () => {
    const col = { ...threeActions, display: "inline" };
    const columns = [{ key: "name" }, col];
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />);
    expect(screen.getAllByText("Edit").length).toBe(sample.length);
    expect(screen.getAllByText("Delete").length).toBe(sample.length);
  });

  it("menu trigger click → items visible", () => {
    const columns = [{ key: "name" }, threeActions];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />
    );
    const trigger = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "⋯");
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("menu item click → exec + закрытие menu", () => {
    const exec = vi.fn();
    const col = {
      ...threeActions,
      actions: [
        { intent: "edit", label: "Edit", params: { id: "item.id" } },
        { intent: "duplicate", label: "Duplicate", params: {} },
        { intent: "remove", label: "Delete", params: {}, danger: true },
      ],
    };
    const columns = [{ key: "name" }, col];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec }} />
    );
    const trigger = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "⋯");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Edit"));
    expect(exec).toHaveBeenCalledWith("edit", { id: 1 });
    // После клика — menu закрывается
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("col.icon:'gear' → ⚙ trigger вместо ⋯", () => {
    const col = { ...threeActions, icon: "gear", display: "menu" };
    const columns = [{ key: "name" }, col];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />
    );
    const triggers = Array.from(container.querySelectorAll("button")).filter(b => b.textContent === "⚙");
    expect(triggers.length).toBe(sample.length);
  });

  it("menu item disabled=true → disabled button", () => {
    const col = {
      ...threeActions,
      actions: [
        { intent: "edit", label: "Edit", params: {} },
        { intent: "remove", label: "Delete", params: {}, disabled: () => true },
        { intent: "dup", label: "Dup", params: {} },
      ],
      display: "menu",
    };
    const columns = [{ key: "name" }, col];
    const { container } = render(
      <DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={{ exec: vi.fn() }} />
    );
    const trigger = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "⋯");
    fireEvent.click(trigger);
    const deleteBtn = screen.getByText("Delete").closest("button");
    expect(deleteBtn.disabled).toBe(true);
  });
});

describe("DataGrid — adapter delegation", () => {
  it("использует adapter component если capability зарегистрирована", () => {
    const AdapterGrid = ({ node }) => <div data-testid="adapter-grid">adapter:{node.items.length}</div>;
    const ctx = {
      adapter: {
        getComponent: (kind, type) =>
          kind === "primitive" && type === "dataGrid" ? AdapterGrid : null,
      },
    };
    render(<DataGrid node={{ type: "dataGrid", items: sample, columns }} ctx={ctx} />);
    expect(screen.getByTestId("adapter-grid").textContent).toBe("adapter:3");
  });
});
