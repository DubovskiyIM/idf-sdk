import { useEffect, useMemo } from "react";
import { computeCanonicalGapSet, getReaderPolicy } from "@intent-driven/core";
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
  xrayMode = false,
  slotAttribution = null,
  xrayDomain = null,
  onExpandPattern,
  patternWitnesses = null,
  activeView,
  projection,
  world,
  exec,
  execBatch,
  testConnection,
  viewer,
  viewerContext,
  routeParams,
  navigate,
  back,
  theme,
  artifacts,
  allProjections,
  validationStrict = false,
  // Φ schema-versioning Phase 4/5 — reader gap policy + observability.
  // Pixels reader декларирует policy и сообщает наблюдённый canonical gap-set
  // через onGapsObserved-callback. Параметры опциональны: если ontology не
  // передана, gap detection пропускается (рендер не зависит от neё).
  ontology,
  gapPolicy,
  onGapsObserved,
}) {
  // §27 authoring-env: override имеет приоритет над artifact (dev-only).
  const baseArtifact = artifactOverride || artifact;

  // Φ schema-versioning Phase 4/5 — pixels reader gap observation.
  // Computation memoized по (world, ontology); callback вызывается через
  // useEffect, чтобы не side-effect'ить во время рендера. Caller использует
  // observation как ReaderObservation для detectReaderEquivalenceDrift.
  const resolvedGapPolicy = useMemo(
    () => gapPolicy ?? getReaderPolicy("pixels"),
    [gapPolicy],
  );
  const gapsObserved = useMemo(() => {
    if (!ontology?.entities || !world) return [];
    return computeCanonicalGapSet(world, ontology).cells;
  }, [ontology, world]);
  useEffect(() => {
    if (typeof onGapsObserved !== "function") return;
    onGapsObserved({ reader: "pixels", policy: resolvedGapPolicy, gapCells: gapsObserved });
  }, [onGapsObserved, resolvedGapPolicy, gapsObserved]);

  if (!baseArtifact) {
    return <div style={{ padding: 20, color: "#9ca3af", textAlign: "center" }}>Нет артефакта</div>;
  }

  // Multi-archetype views (v0.13): подменяем archetype/slots на active view's.
  // Backward-compat: activeView == null или view не найдена → baseArtifact unchanged.
  let effectiveArtifact = baseArtifact;
  if (activeView && Array.isArray(baseArtifact.views)) {
    const view = baseArtifact.views.find(v => v.id === activeView);
    if (view && view.id !== baseArtifact.defaultView) {
      effectiveArtifact = {
        ...baseArtifact,
        archetype: view.archetype,
        slots: view.slots,
        matchedPatterns: view.matchedPatterns,
        witnesses: view.witnesses,
      };
    }
  }

  // G-K-23: validation default = soft-warn (console.warn + render продолжает).
  // Strict mode opt-in через `validationStrict` prop — hard-fail с red box
  // (для CI / studio authoring environment где invalidity критична).
  const validation = validateArtifact(effectiveArtifact);
  if (!validation.ok) {
    if (validationStrict) {
      return (
        <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8 }}>
          <div style={{ fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>Артефакт не валиден</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#7f1d1d" }}>
            {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      );
    }
    console.warn(
      `[ProjectionRendererV2] artifact "${effectiveArtifact.projection}" имеет ${validation.errors.length} validation error(s) — render продолжается (soft-warn). Pass validationStrict={true} для hard-fail.`,
      validation.errors
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

  // Wizard step.testConnection (P-K-B Keycloak Stage 7): async handler,
  // который runtime вызывает из wizard middle-step'а. Подписывает values +
  // viewerContext для server-side probe (OAuth discovery, SAML metadata,
  // LDAP bind test и т.п.). Host кладёт реальный fetch-probe; если не
  // предоставлен — Wizard рендерит «ctx.testConnection не реализован».
  const wrappedTestConnection = testConnection
    ? (intentId, values = {}) =>
        testConnection(intentId, { ...(viewerContext || {}), ...(routeParams || {}), ...values })
    : undefined;

  const ctx = {
    world,
    viewer,
    exec: wrappedExec,
    execBatch: wrappedExecBatch,
    testConnection: wrappedTestConnection,
    theme,
    artifact: effectiveArtifact,
    viewerContext,
    routeParams,
    navigate,
    back,
    artifacts,
    allProjections,
    previewPatternId,
    xrayMode,
    slotAttribution,
    xrayDomain,
    onExpandPattern,
    patternWitnesses,
  };

  return (
    <ArchetypeErrorBoundary archetype={effectiveArtifact.archetype} key={effectiveArtifact.projection}>
      <Archetype slots={effectiveArtifact.slots} nav={effectiveArtifact.nav} ctx={ctx} projection={projection} />
    </ArchetypeErrorBoundary>
  );
}
