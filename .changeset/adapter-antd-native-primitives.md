---
"@intent-driven/adapter-antd": minor
---

Native AntD delegations для 4 новых Gravitino-спринт primitives. Builder-level primitives (DataGrid, Wizard, PropertyPopover, ChipList) теперь рендерятся через соответствующие native AntD components вместо SVG-fallback.

**Delegations:**
- **DataGrid** → `<Table>` AntD с column sort (sorter), filter (filters + onFilter для enum), pagination (pageSize 20 при items >20), onRow click navigation
- **Wizard** → `<Steps>` AntD + native fields (Input / InputNumber / Select / Input.TextArea) + Button'ы + inline testConnection
- **PropertyPopover** → `<Popover>` AntD с scrollable content, trigger="click", placement="bottomLeft"
- **ChipList** → `<Tag>` AntD с color prop (gold для policy, purple для role, default для tag), closable через onDetach

**Capability registration:**
```js
capabilities.primitive: {
  ...,
  dataGrid: { sort: true, filter: true, pagination: true },
  wizard: { steps: true, testConnection: true },
  propertyPopover: true,
  chipList: { variants: ["tag", "policy", "role"] },
}
```

**Use-case:** Gravitino dogfood Stage 8 — все primitive'ы в host domain (Table.columns / Metalake.properties / User.roles / Role.securableObjects / etc) получают native AntD look вместо built-in SVG-fallback.

**Tests:** +12 unit: DataGrid (render + capability), Wizard (steps/empty/capability), PropertyPopover (empty/non-empty/capability), ChipList (render/overflow/empty/variants). 38/38 adapter-antd pass. Added jsdom stubs (matchMedia) для AntD v6 responsive observer.
