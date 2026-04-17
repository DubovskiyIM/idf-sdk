import ArchetypeFeed from "./archetypes/ArchetypeFeed.jsx";
import ArchetypeCatalog from "./archetypes/ArchetypeCatalog.jsx";
import ArchetypeDetail from "./archetypes/ArchetypeDetail.jsx";
import ArchetypeForm from "./archetypes/ArchetypeForm.jsx";
import ArchetypeCanvas from "./archetypes/ArchetypeCanvas.jsx";
import ArchetypeDashboard from "./archetypes/ArchetypeDashboard.jsx";
import ArchetypeWizard from "./archetypes/ArchetypeWizard.jsx";
import ArchetypeErrorBoundary from "./ErrorBoundary.jsx";
import { validateArtifact } from "./validation/validateArtifact.js";

const ARCHETYPES = {
  feed: ArchetypeFeed,
  catalog: ArchetypeCatalog,
  detail: ArchetypeDetail,
  form: ArchetypeForm,
  canvas: ArchetypeCanvas,
  dashboard: ArchetypeDashboard,
  wizard: ArchetypeWizard,
};

/**
 * ProjectionRendererV2 — рендерер артефакта v2.
 *
 * `artifactOverride` (v1.8, §27 authoring-env):
 *   Dev-only prop для preview-режима PatternInspector и других инструментов
 *   среды авторства. Когда передан truthy-артефакт, он имеет приоритет над
 *   обычным `artifact` prop и используется напрямую, минуя штатную деривацию.
 *   Это НЕ §17.3 personal-layer — override не должен попадать в production
 *   user-facing пути. Когда `artifactOverride` отсутствует/null — поведение
 *   не меняется, используется `artifact`.
 *
 *   NB: текущий рендерер получает уже-кристаллизованный артефакт как prop
 *   (внутренний crystallize не вызывается), поэтому семантически
 *   `artifactOverride` — alias с явным приоритетом.
 *
 * `previewPatternId` (v1.8, §27 authoring-env):
 *   Dev-only prop — идентификатор паттерна, применённого в preview-режиме.
 *   Прокидывается в ctx и используется архетипами для визуального overlay
 *   (PatternPreviewOverlay) над секциями/слотами, помеченными `source:
 *   "derived:..."`. Когда отсутствует — overlay не рендерится.
 */
export default function ProjectionRendererV2({
  artifact,
  artifactOverride,
  previewPatternId,
  projection,
  world,
  exec,
  execBatch,
  viewer,
  viewerContext,
  routeParams,
  navigate,
  back,
  theme,
  artifacts,
  allProjections,
}) {
  // §27 authoring-env: override имеет приоритет над artifact (dev-only).
  const effectiveArtifact = artifactOverride || artifact;

  if (!effectiveArtifact) {
    return <div style={{ padding: 20, color: "#9ca3af", textAlign: "center" }}>Нет артефакта</div>;
  }

  const validation = validateArtifact(effectiveArtifact);
  if (!validation.ok) {
    return (
      <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8 }}>
        <div style={{ fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>Артефакт не валиден</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#7f1d1d" }}>
          {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    );
  }

  const Archetype = ARCHETYPES[effectiveArtifact.archetype];
  if (!Archetype) {
    return (
      <div style={{ padding: 20, color: "#9ca3af" }}>
        Архетип "{effectiveArtifact.archetype}" пока не поддержан.
      </div>
    );
  }

  // Обёртка exec: автоматически вливает viewerContext + routeParams
  const wrappedExec = (intentId, params = {}) =>
    exec(intentId, { ...(viewerContext || {}), ...(routeParams || {}), ...params });

  // Обёртка execBatch: добавляет viewerContext + routeParams в каждый sub-ctx
  const wrappedExecBatch = execBatch
    ? (intentId, subs) =>
        execBatch(intentId, subs.map(sub => ({
          intentId: sub.intentId,
          ctx: { ...(viewerContext || {}), ...(routeParams || {}), ...(sub.ctx || {}) },
        })))
    : undefined;

  const ctx = {
    world,
    viewer,
    exec: wrappedExec,
    execBatch: wrappedExecBatch,
    theme,
    artifact: effectiveArtifact,
    viewerContext,
    routeParams,
    navigate,
    back,
    artifacts,
    allProjections,
    previewPatternId,
  };

  return (
    <ArchetypeErrorBoundary archetype={effectiveArtifact.archetype} key={effectiveArtifact.projection}>
      <Archetype slots={effectiveArtifact.slots} nav={effectiveArtifact.nav} ctx={ctx} projection={projection} />
    </ArchetypeErrorBoundary>
  );
}
