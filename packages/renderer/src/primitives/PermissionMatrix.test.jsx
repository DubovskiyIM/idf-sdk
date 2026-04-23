// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import PermissionMatrix from "./PermissionMatrix.jsx";

afterEach(cleanup);

const sample = [
  { type: "metalake", name: "prod_lake", privileges: ["select", "modify"] },
  { type: "catalog", name: "hive_warehouse", privileges: ["select"] },
  { type: "schema", name: "*", privileges: ["select", "create"] },
];

describe("PermissionMatrix — basic rendering", () => {
  it("рендерит rows как resources с type-badge + name", () => {
    render(<PermissionMatrix value={sample} />);
    expect(screen.getByText("prod_lake")).toBeTruthy();
    expect(screen.getByText("hive_warehouse")).toBeTruthy();
    expect(screen.getAllByText("metalake")[0]).toBeTruthy(); // badge
  });

  it("рендерит все unique privileges как headers", () => {
    render(<PermissionMatrix value={sample} />);
    expect(screen.getByText("select", { selector: "th" })).toBeTruthy();
    expect(screen.getByText("modify", { selector: "th" })).toBeTruthy();
    expect(screen.getByText("create", { selector: "th" })).toBeTruthy();
  });

  it("wildcard name '*' → type (all) label, italic style", () => {
    render(<PermissionMatrix value={sample} />);
    expect(screen.getByText("schema (all)")).toBeTruthy();
  });

  it("пустой value → 'Нет разрешений'", () => {
    render(<PermissionMatrix value={[]} />);
    expect(screen.getByText("Нет разрешений")).toBeTruthy();
  });

  it("фильтрует invalid rows (без type)", () => {
    render(
      <PermissionMatrix
        value={[
          { type: "metalake", name: "valid", privileges: [] },
          null,
          { name: "no-type", privileges: [] },
          "not-an-object",
        ]}
      />
    );
    expect(screen.getByText("valid")).toBeTruthy();
    expect(screen.queryByText("no-type")).toBeNull();
  });
});

describe("PermissionMatrix — canonical privilege order", () => {
  it("выставляет privileges в canonical order (select/modify/create/...) когда все common", () => {
    const { container } = render(
      <PermissionMatrix
        value={[
          { type: "metalake", name: "x", privileges: ["modify", "delete", "create", "select"] },
        ]}
      />
    );
    const headers = Array.from(container.querySelectorAll("th")).slice(1).map(t => t.textContent);
    expect(headers).toEqual(["select", "create", "modify", "delete"]);
  });

  it("non-canonical privileges идут в конец в alphabetical order", () => {
    const { container } = render(
      <PermissionMatrix
        value={[
          { type: "r", name: "x", privileges: ["select", "zebra", "apple", "create"] },
        ]}
      />
    );
    const headers = Array.from(container.querySelectorAll("th")).slice(1).map(t => t.textContent);
    // canonical first: select, create; затем alphabetical: apple, zebra
    expect(headers).toEqual(["select", "create", "apple", "zebra"]);
  });
});

describe("PermissionMatrix — explicit privileges prop", () => {
  it("explicit privileges показываются даже если не в value", () => {
    const { container } = render(
      <PermissionMatrix
        value={[{ type: "metalake", name: "x", privileges: ["select"] }]}
        privileges={["select", "modify", "delete"]}
      />
    );
    const headers = Array.from(container.querySelectorAll("th")).slice(1).map(t => t.textContent);
    expect(headers).toEqual(["select", "modify", "delete"]);
  });
});

describe("PermissionMatrix — search filter", () => {
  it("поиск по type или name case-insensitive", () => {
    render(<PermissionMatrix value={sample} />);
    const searchInput = screen.getByPlaceholderText("Фильтр ресурсов…");
    fireEvent.change(searchInput, { target: { value: "HIVE" } });
    expect(screen.getByText("hive_warehouse")).toBeTruthy();
    expect(screen.queryByText("prod_lake")).toBeNull();
  });

  it("counter показывает filtered / total", () => {
    render(<PermissionMatrix value={sample} />);
    const searchInput = screen.getByPlaceholderText("Фильтр ресурсов…");
    fireEvent.change(searchInput, { target: { value: "metalake" } });
    expect(screen.getByText(/1 \/ 3 resources/)).toBeTruthy();
  });
});

describe("PermissionMatrix — edit mode", () => {
  it("readOnly=false → checkboxes editable, toggle вызывает onChange", () => {
    const onChange = vi.fn();
    render(
      <PermissionMatrix
        value={[{ type: "metalake", name: "x", privileges: ["select"] }]}
        readOnly={false}
        onChange={onChange}
      />
    );
    const selectCheckbox = screen.getByLabelText("metalake:x select");
    expect(selectCheckbox.checked).toBe(true);
    fireEvent.click(selectCheckbox);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next[0].privileges).toEqual([]);
  });

  it("add privilege через click на unchecked cell", () => {
    const onChange = vi.fn();
    render(
      <PermissionMatrix
        value={[{ type: "metalake", name: "x", privileges: ["select"] }]}
        privileges={["select", "modify"]}  // explicit privileges чтобы "modify" column был
        readOnly={false}
        onChange={onChange}
      />
    );
    const modifyCheckbox = screen.getByLabelText("metalake:x modify");
    expect(modifyCheckbox.checked).toBe(false);
    fireEvent.click(modifyCheckbox);
    const next = onChange.mock.calls[0][0];
    expect(next[0].privileges).toContain("modify");
  });
});

describe("PermissionMatrix — wildcard privilege", () => {
  it("'*' privilege в row → все остальные privileges показываются granted (hollow dot)", () => {
    const { container } = render(
      <PermissionMatrix
        value={[{ type: "metalake", name: "prod", privileges: ["*"] }]}
      />
    );
    // все columns — checked (granted by wildcard)
    const cells = container.querySelectorAll("tbody td:not(:first-child)");
    const checkedCount = Array.from(cells).filter(c => c.textContent.trim() === "●" || c.textContent.trim() === "○").length;
    expect(checkedCount).toBeGreaterThan(0);
  });

  it("legend показывается когда * privilege есть", () => {
    render(<PermissionMatrix value={[{ type: "r", name: "x", privileges: ["*"] }]} />);
    expect(screen.getByText(/granted by/)).toBeTruthy();
  });
});

describe("PermissionMatrix — inheritance badges (P-K-D Keycloak Stage 9)", () => {
  it("row с inheritedFrom (string) показывает badge 'через composite'", () => {
    const value = [
      { type: "realm", name: "admin", privileges: ["manage"] },
      { type: "realm", name: "view", privileges: ["view"], inheritedFrom: "composite:admin" },
    ];
    const { container } = render(<PermissionMatrix value={value} />);
    expect(container.textContent).toContain("через composite");
    // via 'admin' появится в title attribute, но не в textContent
  });

  it("row с inheritedFrom (object {kind, via}) — корректный tone/label", () => {
    const value = [
      { type: "client", name: "view-users", privileges: ["view"],
        inheritedFrom: { kind: "group", via: "developers" } },
    ];
    const { container } = render(<PermissionMatrix value={value} />);
    expect(container.textContent).toContain("через группу");
    expect(container.textContent).toContain("developers");
  });

  it("unknown kind — fallback label kind-name", () => {
    const value = [
      { type: "realm", name: "custom", privileges: ["use"],
        inheritedFrom: { kind: "somewhere", via: "x" } },
    ];
    const { container } = render(<PermissionMatrix value={value} />);
    expect(container.textContent).toContain("somewhere");
  });

  it("row без inheritedFrom — badge не рендерится", () => {
    const value = [{ type: "realm", name: "admin", privileges: ["manage"] }];
    const { container } = render(<PermissionMatrix value={value} />);
    expect(container.textContent).not.toContain("через");
    expect(container.textContent).not.toContain("inherited");
    expect(container.textContent).not.toContain("client-default");
  });

  it("multiple rows — каждая независимо получает badge (или нет)", () => {
    const value = [
      { type: "realm", name: "admin", privileges: ["manage"] }, // direct
      { type: "realm", name: "view", privileges: ["view"], inheritedFrom: "composite:admin" },
      { type: "client", name: "default", privileges: ["use"], inheritedFrom: { kind: "client", via: "realm" } },
    ];
    const { container } = render(<PermissionMatrix value={value} />);
    expect(container.textContent).toContain("через composite");
    expect(container.textContent).toContain("client-default");
  });
});

describe("PermissionMatrix — adapter delegation", () => {
  it("использует adapter component если capability зарегистрирована", () => {
    const Adapted = ({ value }) => <div data-testid="adapter-pm">adapter:{value.length}</div>;
    const ctx = {
      adapter: {
        getComponent: (kind, type) =>
          kind === "primitive" && type === "permissionMatrix" ? Adapted : null,
      },
    };
    render(<PermissionMatrix value={sample} ctx={ctx} />);
    expect(screen.getByTestId("adapter-pm").textContent).toBe("adapter:3");
  });
});
