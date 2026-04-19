---
"@intent-driven/renderer": minor
---

X-ray режим в `PatternPreviewOverlay` (warm-yellow border + hover-popover с trail требований + Open in Graph3D ссылка). `ProjectionRendererV2` принимает props `xrayMode`, `slotAttribution`, `xrayDomain`, `onExpandPattern`, `patternWitnesses` — пробрасывает в ctx, `ArchetypeDetail` оборачивает derived sections. Backward-compatible: без новых props поведение не меняется.
