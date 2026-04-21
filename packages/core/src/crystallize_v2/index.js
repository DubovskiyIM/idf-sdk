/**
 * crystallizeV2: INTENTS + PROJECTIONS + ONTOLOGY → { projId: artifact }.
 *
 * Поддерживает 6 архетипов: feed, catalog, detail, form, canvas, dashboard.
 * Артефакт содержит nav.outgoing/incoming из deriveNavGraph.
 * Автогенерация синтетических edit-проекций (kind: form) из detail-проекций.
 *
 * @module crystallize_v2
 */

/** @typedef {import('../../types/idf.d.ts').IntentsMap} IntentsMap */
/** @typedef {import('../../types/idf.d.ts').ProjectionsMap} ProjectionsMap */
/** @typedef {import('../../types/idf.d.ts').Ontology} Ontology */
/** @typedef {import('../../types/idf.d.ts').Artifact} Artifact */

import { assignToSlots } from "./assignToSlots.js";
import { hashInputs } from "./hash.js";
import { deriveNavGraph } from "./navGraph.js";
import { generateEditProjections, buildFormSpec } from "./formGrouping.js";
import { normalizeIntentsMap } from "./normalizeIntentNative.js";
import { validateArtifact } from "./validateArtifact.js";
import { checkAnchoring } from "../anchoring.js";
import { AnchoringError } from "../errors.js";
import { resolvePattern } from "../patterns/index.js";
import { getDefaultRegistry, loadStablePatterns } from "../patterns/registry.js";
import { evaluateTriggerExplained } from "../patterns/schema.js";
import { applyStructuralPatterns } from "./applyStructuralPatterns.js";
import { absorbHubChildren } from "./absorbHubChildren.js";
import { deriveShape } from "./deriveShape.js";
import { mergeViewWithParent } from "./mergeViews.js";

const SUPPORTED_ARCHETYPES = new Set(["feed", "catalog", "detail", "form", "canvas", "dashboard", "wizard"]);

/** Стабильная иммутабельная пересборка объекта с алфавитной сортировкой ключей. */
function sortKeys(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

// Phase 1: soft default (не breaking для существующих потребителей).
// В Phase 3 переключится на "strict" через major bump.
const DEFAULT_ANCHORING_MODE = "soft";

/**
 * Кристаллизация: INTENTS + PROJECTIONS + ONTOLOGY → артефакты v2.
 *
 * @param {IntentsMap} INTENTS — определения намерений домена
 * @param {ProjectionsMap} PROJECTIONS — определения проекций домена
 * @param {Ontology} ONTOLOGY — онтология домена
 * @param {string} [domainId] — идентификатор домена
 * @returns {Record<string, Artifact>} — артефакты по projection id
 */
export function crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, domainId = "unknown", opts = {}) {
  // Функториальность (§16): результат не должен зависеть от порядка
  // авторства ключей INTENTS/PROJECTIONS. Нормализуем на входе — downstream
  // iteration (Object.entries, for..of) наследует стабильный порядок.
  INTENTS = sortKeys(INTENTS);
  PROJECTIONS = sortKeys(PROJECTIONS);

  // Native-format bridge (backlog §8.1 / Workzilla findings P0-1).
  // Scaffold-path + importer'ы (openapi/prisma/postgres) emit'ят intent'ы
  // с top-level `target`/`alpha`, `parameters:{obj}`, `effects[].op` —
  // crystallize_v2 downstream ожидает `particles.entities`, α, array-params.
  // Normalize — additive-only, legacy-intent'ы проходят как no-op.
  INTENTS = normalizeIntentsMap(INTENTS);

  // Anchoring gate (§15 zazor #1)
  const mode = opts.anchoring || DEFAULT_ANCHORING_MODE;
  const anchoring = checkAnchoring(INTENTS, ONTOLOGY);
  if (!anchoring.passed && mode === "strict") {
    throw new AnchoringError(anchoring.errors, domainId);
  }
  if (mode === "soft" && anchoring.errors.length > 0) {
    console.warn(`[crystallize_v2] ${domainId}: ${anchoring.errors.length} anchoring errors suppressed (soft mode)`);
  }

  const artifacts = {};

  // Pattern Bank: загрузить stable паттерны при первом вызове
  const patternRegistry = getDefaultRegistry();
  if (patternRegistry.getAllPatterns("stable").length === 0) {
    loadStablePatterns(patternRegistry);
  }

  // Автогенерация edit-проекций (М3.4b)
  const editProjections = generateEditProjections(INTENTS, PROJECTIONS, ONTOLOGY);
  // R8: Hub-absorption — child-каталоги с FK абсорбируются в hub-detail.
  const allProjections = sortKeys(
    absorbHubChildren({ ...PROJECTIONS, ...editProjections }, ONTOLOGY)
  );

  const inputsHash = hashInputs(INTENTS, allProjections, ONTOLOGY);
  const generatedAt = Date.now();
  const navGraph = deriveNavGraph(allProjections);

  for (const [projId, proj] of Object.entries(allProjections)) {
    const archetype = proj.kind || inferArchetype(proj);
    if (!SUPPORTED_ARCHETYPES.has(archetype)) {
      // dashboard, canvas — будущие M
      continue;
    }

    // UX Pattern Layer: вывод поведенческого паттерна из intent-группы проекции
    const projIntents = Object.entries(INTENTS)
      .filter(([, intent]) => {
        const entities = (intent.particles?.entities || []).map(e => e.split(":").pop().trim().replace(/\[\]$/, ""));
        return !proj.mainEntity || entities.includes(proj.mainEntity);
      })
      .map(([id, intent]) => ({ id, ...intent }));
    const patternResult = resolvePattern(projIntents, ONTOLOGY, proj);
    const structuralPatterns = patternRegistry.matchPatterns(projIntents, ONTOLOGY, proj);

    const shapeResult = deriveShape(proj, ONTOLOGY);

    let slots;
    if (archetype === "form") {
      // Form-архетип: не проходит через обычный assignToSlots.
      // body — formSpec (fields для ArchetypeForm), остальные слоты пустые.
      const formSpec = buildFormSpec(proj, INTENTS, ONTOLOGY, "self");
      slots = {
        header: [],
        toolbar: [],
        body: { type: "formBody", ...formSpec },
        context: [],
        fab: [],
        overlay: [],
      };
    } else if (archetype === "canvas") {
      // Canvas-архетип: минимальный артефакт, рендер делегируется domain-specific компоненту.
      slots = {
        header: [],
        toolbar: [],
        body: { type: "canvas", mainEntity: proj.mainEntity },
        context: [],
        fab: [],
        overlay: [],
      };
    } else if (archetype === "dashboard") {
      // Dashboard-архетип: widgets — массив ссылок на другие проекции.
      slots = {
        header: [],
        toolbar: [],
        body: { type: "dashboard", widgets: proj.widgets || [] },
        context: [],
        fab: [],
        overlay: [],
      };
    } else if (archetype === "wizard") {
      // Wizard-архетип: steps пробрасываются as-is, рендер управляется ArchetypeWizard.
      slots = { kind: "wizard", steps: proj.steps || [], projection: proj };
    } else {
      slots = assignToSlots(INTENTS, { ...proj, id: projId }, ONTOLOGY, patternResult.strategy, shapeResult.shape);
    }

    // Pattern Bank: structure.apply (v1.8) — обогащение слотов matched + enabled паттернами.
    // Feature-flag ontology.features.structureApply !== false (default true).
    const applyEnabled = ONTOLOGY?.features?.structureApply !== false;
    // witness-of-crystallization: crystallize-rule witnesses из deriveProjections (R1/R2/R3/R7)
    // идут первыми — они объясняют само происхождение проекции.
    // Спецификация: idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
    let witnesses = Array.isArray(proj.derivedBy) ? [...proj.derivedBy] : [];
    if (applyEnabled && archetype !== "form" && archetype !== "canvas" && archetype !== "dashboard" && archetype !== "wizard") {
      const matchedAugmented = structuralPatterns.map(p => ({
        pattern: p,
        explain: evaluateTriggerExplained(p.trigger, projIntents, ONTOLOGY, proj),
      }));
      // witness-of-crystallization (§15): каждый matched pattern → запись в artifact.witnesses[]
      for (const { pattern, explain } of matchedAugmented) {
        witnesses.push({
          basis: "pattern-bank",
          pattern: pattern.id,
          reliability: "rule-based",
          requirements: explain.requirements.map(r => ({ kind: r.kind, ok: r.ok, spec: r.spec })),
          matchFn: explain.matchFn,
          matchOk: explain.matchOk,
        });
      }
      const preferences = proj.patterns || {};
      const applyContext = { ontology: ONTOLOGY, mainEntity: proj.mainEntity, intents: projIntents, projection: proj };
      slots = applyStructuralPatterns(slots, matchedAugmented, applyContext, preferences, patternRegistry);
    }

    // Polymorphic entities (v0.15): rule-based witness для projection с
    // mainEntity, имеющим discriminator + variants.
    if (proj.mainEntity) {
      const mainEntityDef = ONTOLOGY?.entities?.[proj.mainEntity];
      if (mainEntityDef?.discriminator && mainEntityDef?.variants) {
        witnesses.push({
          basis: "polymorphic-variant",
          pattern: "polymorphic:variant-resolution",
          reliability: "rule-based",
          requirements: [{
            kind: "entity-has-discriminator",
            ok: true,
            spec: {
              entity: proj.mainEntity,
              discriminator: mainEntityDef.discriminator,
              variants: Object.keys(mainEntityDef.variants),
            },
          }],
        });
      }
    }

    // Temporal sections (v0.14): rule-based witness для каждой detail-секции
    // с renderAs.type === "eventTimeline". Declarative temporality в онтологии
    // → rule-based reliability (не heuristic).
    if (archetype === "detail" && Array.isArray(slots.sections)) {
      for (const sec of slots.sections) {
        if (sec.renderAs?.type === "eventTimeline") {
          witnesses.push({
            basis: "temporal-section",
            pattern: "temporal:event-timeline",
            reliability: "rule-based",
            requirements: [{
              kind: "sub-entity-temporality",
              ok: true,
              spec: { entity: sec.itemEntity, temporality: sec.renderAs.kind },
            }],
          });
        }
      }
    }

    // onItemClick: (1) явно объявленный автором в проекции, (2) выведенный из navGraph.
    if (slots.body?.type === "list") {
      if (proj.onItemClick) {
        slots.body.onItemClick = proj.onItemClick;
      } else {
        const outgoing = navGraph.edgesFrom(projId).filter(e => e.kind === "item-click");
        if (outgoing.length > 0) {
          const edge = outgoing[0];
          slots.body.onItemClick = {
            action: "navigate",
            to: edge.to,
            params: edge.params,
          };
        }
      }
    }

    // postCreate: дополнить heroCreate nav-данными из nav-графа
    if (slots.hero) {
      for (const hero of slots.hero) {
        if (hero.postCreate && !hero.postCreate.navigateTo) {
          const detailEdge = navGraph.edges.find(e =>
            e.kind === "edit-action" && allProjections[e.from]?.mainEntity === proj.mainEntity
          );
          if (detailEdge) {
            hero.postCreate.navigateTo = detailEdge.to;
            hero.postCreate.idParam = Object.keys(detailEdge.params)[0];
          }
        }
      }
    }

    // Slot-level witnesses (из assignToSlots* — alphabetical-fallback, и т.п.)
    // сливаются в artifact.witnesses как first-class находки § 15.
    if (Array.isArray(slots?._witnesses) && slots._witnesses.length > 0) {
      witnesses.push(...slots._witnesses);
      delete slots._witnesses;
    }

    const artifact = {
      projection: projId,
      name: proj.name || projId,
      domain: domainId,
      layer: "canonical",
      archetype,
      pattern: patternResult.pattern,
      matchedPatterns: structuralPatterns.map(p => p.id),
      version: 2,
      generatedAt,
      generatedBy: "rules",
      inputsHash,
      slots,
      nav: {
        outgoing: navGraph.edgesFrom(projId),
        incoming: navGraph.edgesTo(projId),
      },
      // Для detail: ссылка на соответствующую edit-проекцию (если есть)
      editProjection: editProjections[projId + "_edit"] ? (projId + "_edit") : null,
      // Для form: ссылка на исходную detail
      sourceProjection: proj.sourceProjection || null,
      // R8 Hub-absorption (v1.13)
      absorbedBy: proj.absorbedBy || null,
      hubSections: proj.hubSections || null,
      // Shape-layer (v1.13) — timeline/directory/default
      shape: shapeResult.shape,
      shapeSignals: shapeResult.signals,
      // Multi-archetype views (v0.13) — null если views не объявлены
      views: null,
      defaultView: null,
      viewSwitcher: null,
      // witness-of-crystallization (§15 v1.9+): pattern-bank findings
      witnesses,
    };

    // Views expansion (v0.13) — per-view crystallize pass
    const projViews = proj.views;
    if (Array.isArray(projViews) && projViews.length >= 2) {
      const defaultViewId = proj.defaultView || projViews[0].id;
      const viewsOutput = [];
      const viewWarnings = [];
      for (const view of projViews) {
        const { merged, warnings: vw } = mergeViewWithParent(proj, view);
        viewWarnings.push(...vw);
        const viewArchetype = merged.kind || inferArchetype(merged);
        if (!SUPPORTED_ARCHETYPES.has(viewArchetype)) continue;

        const viewPatternResult = resolvePattern(projIntents, ONTOLOGY, merged);
        const viewStructuralPatterns = patternRegistry.matchPatterns(projIntents, ONTOLOGY, merged);

        let viewSlots;
        if (viewArchetype === "dashboard") {
          viewSlots = {
            header: [], toolbar: [],
            body: { type: "dashboard", widgets: merged.widgets || [] },
            context: [], fab: [], overlay: [],
          };
        } else {
          viewSlots = assignToSlots(INTENTS, { ...merged, id: projId + ":" + view.id }, ONTOLOGY, viewPatternResult.strategy);
        }

        let viewWitnesses = Array.isArray(proj.derivedBy) ? [...proj.derivedBy] : [];
        if (applyEnabled && viewArchetype !== "form" && viewArchetype !== "canvas" && viewArchetype !== "dashboard" && viewArchetype !== "wizard") {
          const matchedAugmented = viewStructuralPatterns.map(p => ({
            pattern: p,
            explain: evaluateTriggerExplained(p.trigger, projIntents, ONTOLOGY, merged),
          }));
          for (const { pattern, explain } of matchedAugmented) {
            viewWitnesses.push({
              basis: "pattern-bank",
              pattern: pattern.id,
              reliability: "rule-based",
              requirements: explain.requirements.map(r => ({ kind: r.kind, ok: r.ok, spec: r.spec })),
              matchFn: explain.matchFn,
              matchOk: explain.matchOk,
            });
          }
          const preferences = merged.patterns || {};
          const applyContext = { ontology: ONTOLOGY, mainEntity: merged.mainEntity, intents: projIntents, projection: merged };
          viewSlots = applyStructuralPatterns(viewSlots, matchedAugmented, applyContext, preferences, patternRegistry);
        }

        viewsOutput.push({
          id: view.id,
          name: merged.name,
          archetype: viewArchetype,
          layout: merged.layout || null,
          slots: viewSlots,
          matchedPatterns: viewStructuralPatterns.map(p => p.id),
          witnesses: viewWitnesses,
        });
      }

      if (viewsOutput.length >= 2) {
        artifact.views = viewsOutput;
        artifact.defaultView = defaultViewId;
        artifact.viewSwitcher = {
          views: viewsOutput.map(v => ({ id: v.id, name: v.name, archetype: v.archetype })),
          activeId: defaultViewId,
        };
        const defaultV = viewsOutput.find(v => v.id === defaultViewId);
        if (defaultV) {
          artifact.archetype = defaultV.archetype;
          artifact.slots = defaultV.slots;
        }
        if (viewWarnings.length > 0) {
          console.warn(`[crystallize_v2] ${projId}: view warnings`, viewWarnings);
        }
      }
    }

    const validation = validateArtifact(artifact);
    if (!validation.ok) {
      console.warn(`[crystallize_v2] артефакт "${projId}" не прошёл валидацию:`, validation.errors);
    }

    artifacts[projId] = artifact;
  }

  return artifacts;
}

function inferArchetype(proj) {
  const query = (proj.query || "").toLowerCase();
  if (query.includes("сообщения") || query.includes("лента")) return "feed";
  if (query.includes("список") || query.includes("все") || query.includes("беседы") || query.includes("контакты")) return "catalog";
  if (query.includes("один") || query.includes("детали") || query.includes("профиль")) return "detail";
  return "catalog";
}
