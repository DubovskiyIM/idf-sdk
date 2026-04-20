---
"@intent-driven/adapter-mantine": minor
"@intent-driven/adapter-shadcn": minor
"@intent-driven/adapter-apple": minor
"@intent-driven/adapter-antd": minor
---

feat(shell.sidebar): все 4 адаптера получили собственный sidebar

Host (idf#80) уже вызывает `getAdaptedComponent("shell", "sidebar")` с fallback на inline SectionedSidebar. Теперь каждый адаптер предоставляет свою визуально отличающуюся реализацию:

- **Mantine** — corporate: Mantine `NavLink` с вложенными childrenOffset, ScrollArea, default-opened секции с chevron.
- **shadcn (Doodle)** — handcrafted: dashed dividers между секциями, box-shadow на активном пункте, лёгкий `rotate(-0.5deg)` при active, spiralling doodle-icons (✎ / ○) для collapse-toggle.
- **Apple (visionOS-glass)** — frosted: `backdropFilter: blur(40px) saturate(180%)`, translucent pills для active-state, uppercase section-label с letter-spacing, hover-background через events.
- **AntD (enterprise-fintech)** — dense dark: antd `Menu` с `mode:"inline"`, `theme:"dark"`, type:"group" для секций, compact spacing.

Контракт всех четырёх:
```js
({ sections: [{section, icon?, items}], active, onSelect, projectionNames })
```

Все добавляют `capabilities.shell.sidebar: true` — host может делать `supportsVariant("shell", "sidebar")` для graceful fallback (уже работает через `getAdaptedComponent(...) || fallback`).

После релиза прототип (idf) автоматически подхватит разные sidebar'ы при переключении UI-kit'а через PrefsPanel ⚙.
