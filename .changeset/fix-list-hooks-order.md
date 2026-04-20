---
"@intent-driven/renderer": patch
---

Fix rules-of-hooks violation в List primitive. `useRef`/`useEffect` были
размещены ПОСЛЕ conditional early-return `if (items.length === 0 && node.empty)`.
При переходе empty ↔ non-empty React падал с "Rendered more/fewer hooks than
during the previous render", catalog показывал ArchetypeErrorBoundary.

Fix: hooks вызываются безусловно ДО early-return. 3 regression-теста:
empty→non-empty, non-empty→empty, filter-полностью-отсеивает.
