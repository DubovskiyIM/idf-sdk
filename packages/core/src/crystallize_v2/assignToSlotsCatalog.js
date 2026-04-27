/**
 * §3.1 дизайна (catalog-ветвь): назначение намерений в слоты catalog-архетипа.
 */

import { inferParameters } from "./inferParameters.js";
import { inferControlType, enrichWithOptions } from "./inferControlType.js";
import { wrapByConfirmation } from "./wrapByConfirmation.js";
import {
  needsCustomCapture,
  appliesToProjection,
  isUnsupportedInM2,
  normalizeCreates,
} from "./assignToSlotsShared.js";
import { getIntentIcon } from "./getIntentIcon.js";
import { getEntityFields, inferFieldRole } from "./ontologyHelpers.js";
import { buildCardSpec } from "./cardSpec.js";
import { computeSalience, bySalienceDesc, detectTiedGroups } from "./salience.js";
import { buildWitnessChildren, findHeroImageWitness } from "./witnessItemChildren.js";
import { diagnoseAssignment } from "./jointSolverDiagnose.js";
import { applyInformationBottleneck } from "./informationBottleneck.js";

export function assignToSlotsCatalog(INTENTS, projection, ONTOLOGY, strategy, shape = "default", opts = {}) {
  // Information Bottleneck: вычислить допустимые поля для body catalog.
  // role — из opts.role, или из strategy если передана строкой, или null.
  const ibRole = opts.role ?? (typeof strategy === "string" ? strategy : null);
  const { witness: ibWitness } = applyInformationBottleneck({
    projection, role: ibRole, INTENTS, ONTOLOGY
  });
  if (Array.isArray(opts.witnesses)) opts.witnesses.push(ibWitness);
  // projection.gating (UI-gap #6) — onboarding prerequisites: шаги к
  // разблокировке проекции. Node-shape { title, steps }, Array<step>
  // с { id, label, icon?, done?, cta? }. Renderer рендерит GatingPanel
  // выше body; если все steps done — скрывается автоматически.
  const gatingNode = projection.gating && Array.isArray(projection.gating.steps)
    ? { type: "gatingPanel", title: projection.gating.title, steps: projection.gating.steps }
    : null;

  // projection.hero (UI-gap #9) — authored горизонтальный banner над body.
  // Node (carousel / card / image / custom) или array<node>. SDK + heroCreate
  // archetype (inline-creator) аппендятся после authored. Legacy поведение
  // (hero:[] → только heroCreate) сохраняется — когда projection.hero не
  // задан.
  const authoredHero = projection.hero
    ? (Array.isArray(projection.hero) ? [...projection.hero] : [projection.hero])
    : [];

  // projection.bodyOverride — authored body-node (e.g. dataGrid primitive
  // с явными columns) полностью заменяет derived buildCatalogBody.
  // Use-case: Gravitino catalog_list хочет DataGrid с native AntD sort/
  // filter вместо default card-list. SDK respect'ит так же, как
  // subCollections уже — authored curation поверх derivation.
  const hasBodyOverride = projection?.bodyOverride && typeof projection.bodyOverride === "object";
  const derivedBody = hasBodyOverride
    ? projection.bodyOverride
    : buildCatalogBody(projection, ONTOLOGY);

  const slots = {
    header: [],
    toolbar: [],
    hero: authoredHero, // authored baннер + heroCreate intent (ниже)
    body: derivedBody,
    context: [],
    fab: [],
    overlay: [],
    // projection.sidebar (UI-gap #2) — static-content блоки слева от body.
    // Array<SlotRenderer node>: card / text / column / row / custom primitives.
    // Не intent-driven (workzilla tutorial / promo / examples cards). Renderer
    // (ArchetypeCatalog) рендерит aside-column шириной 260px если не пусто.
    sidebar: Array.isArray(projection.sidebar) ? [...projection.sidebar] : [],
    gating: gatingNode,
  };

  const itemIntents = [];
  const itemIntentIds = new Set();
  const addItemIntent = (spec) => {
    if (itemIntentIds.has(spec.intentId)) return;
    itemIntentIds.add(spec.intentId);
    itemIntents.push(spec);
  };

  const mainEntity = projection.mainEntity;

  const intentEntries = Object.entries(INTENTS);
  for (let declarationOrder = 0; declarationOrder < intentEntries.length; declarationOrder++) {
    const [id, intent] = intentEntries[declarationOrder];
    if (isUnsupportedInM2(id)) continue;
    if (!appliesToProjection(intent, projection)) continue;
    // customCapture (voiceRecorder/emojiPicker/entityPicker) теперь пройдёт
    // через wrapByConfirmation — скипаем только непокрытые виджеты.
    if (needsCustomCapture(intent)) continue;

    // Catalog-специфика: интент должен касаться mainEntity напрямую.
    // Intent'ы без entities (настройки, аналитика) — НЕ утилиты каталога.
    // Исключение: поисковые утилиты (witnesses "query"+"results") —
    // inlineSearch как projection-level control.
    const intentEntities = (intent.particles?.entities || [])
      .map(e => e.split(":").pop().trim().replace(/\[\]$/, ""));
    const touchesMainEntity = mainEntity && intentEntities.includes(mainEntity);
    const witnesses = intent.particles?.witnesses || [];
    const isSearchUtility = witnesses.includes("query") && witnesses.includes("results");
    if (!touchesMainEntity && !isSearchUtility) continue;

    const parameters = inferParameters(intent, ONTOLOGY).map(p => ({
      ...p,
      control: inferControlType(p, ONTOLOGY),
    })).map(p => enrichWithOptions(p, ONTOLOGY));

    let wrapped = wrapByConfirmation(intent, id, parameters, { projection, ontology: ONTOLOGY, projections: opts.projections });
    if (wrapped === null) continue;

    // Strategy: override control type
    if (strategy?.preferControl) {
      const preferred = strategy.preferControl(intent, wrapped.type);
      if (preferred !== wrapped.type && preferred === "quick-action-pair") {
        wrapped = { ...wrapped, quickAction: true, patternHint: preferred };
      }
    }

    const isPerItem = isPerItemIntent(intent, projection);
    const isComposerEntry = wrapped.type === "composerEntry";
    let hasOverlay = wrapped.trigger && wrapped.overlay;
    const isCreator = normalizeCreates(intent.creates) === projection.mainEntity;

    // inlineSearch — всегда в toolbar как projection-level utility.
    // Salience 90 — выше edit (60), ниже explicit "primary" (100) — чтобы
    // не зарываться ниже creator-кнопок, но уступать явно помеченным primary.
    if (wrapped.type === "inlineSearch") {
      slots.toolbar.push({ ...wrapped, salience: 90, declarationOrder });
      continue;
    }

    // heroCreate — inline-создатель mainEntity над списком. Перехватывается
    // прежде обычного fab, даёт человеческий UX «ввёл название — Enter».
    // UX-паттерн: только ОДИН hero на каталог. Первый побеждает (обычно
    // основной create-интент), остальные re-wrap'ятся как обычные кнопки
    // и проходят через стандартную логику (per-item → fab → toolbar).
    //
    // Shape guard: для timeline/directory hero неуместен —
    // приоритет у контента (хронология/контакты), а не у создания.
    if (wrapped.type === "heroCreate") {
      const heroAllowed = shape !== "timeline" && shape !== "directory";
      if (heroAllowed && slots.hero.length === 0) {
        slots.hero.push(wrapped);
        continue;
      }
      // Re-wrap как обычный intentButton — пройдёт стандартную логику.
      wrapped = {
        type: "intentButton",
        intentId: id,
        label: intent.name,
        icon: getIntentIcon(id, intent),
      };
      hasOverlay = false;
    }

    if (isComposerEntry) continue;

    // Пропустить creator-интенты без collectable-параметров — за исключением
    // случая, когда wrapped имеет overlay (customCapture.entityPicker,
    // formModal и т.п.). Для customCapture «параметр» — это выбор сущности
    // внутри виджета, inferParameters его не видит.
    if (isCreator && parameters.length === 0 && !hasOverlay) continue;

    // Creator главной сущности → toolbar (iOS "+"-паттерн, не FAB)
    if (isCreator && !isPerItem) {
      const salience = computeSalience(intent, projection.mainEntity).value;
      if (hasOverlay) {
        slots.overlay.push(wrapped.overlay);
        slots.toolbar.push({ ...wrapped.trigger, salience, declarationOrder });
      } else {
        slots.toolbar.push({ ...wrapped, salience, declarationOrder });
      }
      continue;
    }

    // per-item с overlay
    if (isPerItem && hasOverlay) {
      slots.overlay.push(wrapped.overlay);
      addItemIntent({
        intentId: id,
        opens: "overlay",
        overlayKey: wrapped.overlay.key,
        label: intent.name,
        icon: getIntentIcon(id, intent),
        conditions: buildItemConditions(intent, projection, ONTOLOGY),
      });
      continue;
    }

    // per-item простая кнопка
    if (isPerItem && wrapped.type === "intentButton") {
      addItemIntent({
        intentId: id,
        label: intent.name,
        icon: getIntentIcon(id, intent),
        conditions: buildItemConditions(intent, projection, ONTOLOGY),
      });
      continue;
    }

    // projection-level с overlay
    if (hasOverlay) {
      const salience = computeSalience(intent, projection.mainEntity).value;
      slots.toolbar.push({ ...wrapped.trigger, salience, declarationOrder });
      slots.overlay.push(wrapped.overlay);
      continue;
    }

    // projection-level простой click
    if (wrapped.type === "intentButton") {
      const salience = computeSalience(intent, projection.mainEntity).value;
      slots.toolbar.push({ ...wrapped, salience, declarationOrder });
    }
  }

  // Когда body authored — не трогаем его item-binding. Автор сам
  // декларирует interactions (e.g. DataGrid.onItemClick).
  if (!hasBodyOverride && slots.body.item) {
    slots.body.item.intents = itemIntents;
  }

  // Строим ctx для weighted-sum salience при сортировке toolbar.
  // intentUsage: если в онтологии нет usageCount — 1 для всех (равный вес).
  const intentUsage = Object.fromEntries(
    Object.entries(INTENTS).map(([id, intent]) => [id, intent.particles?.usageCount || 1])
  );
  const salienceCtx = { projection, ONTOLOGY, intentUsage };

  // Сортировка toolbar по salience desc перед overflow cutoff — семантически
  // primary intent'ы попадают в visible, остальные — в overflow. Используем
  // weighted-sum через ctx для более семантически точного порядка.
  slots.toolbar.sort((a, b) => bySalienceDesc(a, b, salienceCtx));

  const tiedWitnesses = detectTiedGroups(slots.toolbar, { slot: "toolbar", projection: projection.id });
  if (tiedWitnesses.length > 0) {
    slots._witnesses = [...(slots._witnesses || []), ...tiedWitnesses];
  }

  if (slots.toolbar.length > 5) {
    const overflow = slots.toolbar.splice(5);
    slots.toolbar.push({ type: "overflow", children: overflow });
  }

  // Body-mutations (shape, strategy.itemLayout/emphasisFields/aggregateHeader/
  // extraSlots) применяются к derived body. Authored bodyOverride
  // оставляется as-is — автор знает что декларирует.
  if (!hasBodyOverride && shape && shape !== "default" && slots.body) {
    slots.body.shape = shape;
  }

  // Strategy metadata для renderer
  if (!hasBodyOverride && strategy) {
    if (strategy.itemLayout) slots.body.itemLayout = strategy.itemLayout(projection.mainEntity, []);
    if (strategy.emphasisFields) {
      const fieldNames = (projection.witnesses || []).map(w => typeof w === "string" ? w : w.field);
      const fieldRoles = {};
      const entity = ONTOLOGY?.entities?.[projection.mainEntity];
      if (entity?.fields && typeof entity.fields === "object") {
        for (const [name, def] of Object.entries(entity.fields)) {
          const role = def?.fieldRole || inferFieldRole(name, def)?.role;
          if (role) fieldRoles[name] = role;
        }
      }
      slots.body.emphasisFields = strategy.emphasisFields(fieldNames, fieldRoles);
    }
    if (strategy.aggregateHeader) {
      const agg = strategy.aggregateHeader();
      if (agg) slots.body.aggregateHeader = agg;
    }
    if (strategy.extraSlots) {
      const extras = strategy.extraSlots();
      if (Object.keys(extras).length > 0) slots.body.extras = extras;
    }
  }

  // Phase 2d: opt-in diagnostic — emit witness 'joint-solver-alternative'
  // если derived assignment расходится с jointSolver Hungarian. Не меняет
  // existing behavior — только witness emission в opts.witnesses.
  if (opts?.diagnoseAlternate && Array.isArray(opts.witnesses)) {
    const altWitness = diagnoseAssignment({
      INTENTS, projection, ONTOLOGY,
      derivedSlots: slots,
      role: opts.role,
      solver: opts.alternateSolver,
    });
    if (altWitness) opts.witnesses.push(altWitness);
  }

  return slots;
}

function isPerItemIntent(intent, projection) {
  const mainEntity = projection.mainEntity;
  if (!mainEntity) return false;
  const mainLower = mainEntity.toLowerCase();
  const intentEntities = (intent.particles?.entities || [])
    .map(e => e.split(":").pop().trim().replace(/\[\]$/, ""));
  if (!intentEntities.includes(mainEntity)) return false;

  // Creator-интент НИКОГДА не per-item — он создаёт новую сущность,
  // а не оперирует существующей. Проверяем ДО witnesses/conditions.
  if (normalizeCreates(intent.creates) === mainEntity) return false;

  const witnesses = intent.particles?.witnesses || [];
  const hasDottedMainWitness = witnesses.some(w => {
    const base = w.split(".")[0];
    return base === mainLower || base === mainEntity;
  });
  if (hasDottedMainWitness) return true;

  const conditions = intent.particles?.conditions || [];
  const hasMainCondition = conditions.some(c => c.toLowerCase().startsWith(mainLower + "."));
  if (hasMainCondition) return true;

  return true;
}

function pluralizeLower(entity) {
  const lower = entity.toLowerCase();
  if (lower.endsWith("y")) return lower.slice(0, -1) + "ies";
  if (lower.endsWith("s")) return lower + "es";
  return lower + "s";
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Собрать conditions для per-item intent. К декларированным в намерении
 * условиям добавляется synthetic ownership check, если intent меняет
 * mainEntity (его эффекты — replace/remove на mainEntity.*) и
 * mainEntity — User-подобная сущность с ownerField="id".
 *
 * Без этой проверки per-item кнопки "Редактировать профиль" / "Сменить
 * статус" появились бы под каждой карточкой User в people_list, но
 * фактическое применение на чужом User было бы запрещено (и ломало бы
 * ожидания UX). Пока hardcoded для User (M3.5b) — в M4 ownerField
 * должен жить в ontology и работать для Message/Participant и др.
 */
function buildItemConditions(intent, projection, ONTOLOGY) {
  const conditions = [...(intent.particles?.conditions || [])];
  const mainEntity = projection.mainEntity;
  if (!mainEntity) return conditions;

  const lower = mainEntity.toLowerCase();
  const effects = intent.particles?.effects || [];
  const mutatesMain = effects.some(e =>
    (e.α === "replace" || e.α === "remove") &&
    typeof e.target === "string" &&
    (e.target === lower || e.target.startsWith(lower + "."))
  );

  if (mutatesMain) {
    const ownerField = ONTOLOGY?.entities?.[mainEntity]?.ownerField;
    if (ownerField) {
      conditions.push(`${lower}.${ownerField} = me.id`);
    } else if (mainEntity === "User") {
      // backward-compat: User не имеет ownerField, но self-owned по id
      conditions.push(`${lower}.id = me.id`);
    }
  }

  return conditions;
}

// Предотвращаем появление creator-intent другого main entity в catalog,
// НО разрешаем cross-entity creators если intent явно ссылается на
// mainEntity в particles.entities (пример: create_direct_chat создаёт
// Conversation, но работает как per-item action на User в people_list).
function isCreatorOfOther(intent, mainEntity) {
  const c = normalizeCreates(intent.creates);
  if (!c || !mainEntity || c === mainEntity) return false;
  // Cross-entity creator разрешён, если mainEntity есть в entities intent'а
  const intentEntities = (intent.particles?.entities || [])
    .map(e => e.split(":").pop().trim().replace(/\(.*\)/, "").replace(/\[\]/, ""));
  if (intentEntities.includes(mainEntity)) return false;
  return true;
}

export function buildCatalogBody(projection, ONTOLOGY) {
  const mainEntity = projection.mainEntity;
  const source = mainEntity ? pluralizeLower(mainEntity) : "items";

  // Определяем titleField из ontology: name | title | id. Нормализуем
  // оба формата (legacy array и типизированный объект).
  const entity = ONTOLOGY?.entities?.[mainEntity];
  const fields = entity?.fields;
  const fieldNames = Array.isArray(fields)
    ? fields
    : (fields ? Object.keys(fields) : []);
  const titleField =
    fieldNames.includes("name") ? "name"
    : fieldNames.includes("title") ? "title"
    : "id";
  const subtitleField =
    fieldNames.includes("lastMessage") ? "lastMessage"
    : fieldNames.includes("email") ? "email"
    : fieldNames.includes("status") ? "status"
    : null;

  // projection.emptyState — authored богатый empty-state (UI-gap #8).
  // Legacy автор emitted `{ type: "text", content: "Пусто" }` автоматически;
  // теперь можно декларативно положить title / hint / illustration / cta.
  // Object спэдится в node с фиксированным type:"emptyState", чтобы
  // SlotRenderer подхватил соответствующий primitive.
  const emptyNode = projection.emptyState
    ? { type: "emptyState", ...projection.emptyState }
    : { type: "text", content: "Пусто", style: "muted" };

  // projection.tabs (UI-gap #1) — filter-views как табы над catalog body.
  // Нормализуем массив, dropping entries без id. Renderer List применяет
  // activeTab.filter поверх base filter (composition AND).
  const tabs = Array.isArray(projection.tabs)
    ? projection.tabs.filter(t => t && t.id).map(t => ({
        id: t.id,
        label: t.label,
        filter: t.filter,
      }))
    : null;

  // projection.witnesses (Workzilla dogfood findings P0-3 / backlog §8.3) —
  // strict contract на flat-list layout'ах: если автор задал witnesses,
  // item.children генерируются по этому списку через inferFieldRole (title,
  // money, deadline, badge, heroImage → соответствующие primitive'ы). Для
  // grid-layout'ов используется отдельный buildCardSpec (ниже), чтобы
  // не ломать существующий grid-card-layout pattern.
  const useWitnessChildren =
    Array.isArray(projection.witnesses) &&
    projection.witnesses.length > 0 &&
    projection.layout !== "grid";

  let itemChildren;
  if (useWitnessChildren) {
    const witnessNodes = buildWitnessChildren(projection.witnesses, mainEntity, ONTOLOGY);
    const heroImage = findHeroImageWitness(projection.witnesses, mainEntity, ONTOLOGY);
    if (heroImage) {
      // Аватар (heroImage witness) в левой колонке, остальные witnesses —
      // справа в column. Sybтitle/metric/badge стекаются вертикально.
      const rightNodes = witnessNodes.filter(n => !(n.type === "avatar" && n.bind === heroImage.bind));
      itemChildren = [
        {
          type: "row",
          gap: 10,
          children: [
            { type: "avatar", bind: heroImage.bind, nameBind: titleField, size: 40 },
            { type: "column", sx: { flex: 1 }, children: rightNodes },
          ],
        },
      ];
    } else {
      // Нет heroImage в witness'ах — плоская column со всеми witness'ами.
      itemChildren = [{ type: "column", gap: 6, children: witnessNodes }];
    }
  } else {
    // Legacy fallback: avatar + title + subtitle (auto-derive).
    itemChildren = [
      {
        type: "row",
        gap: 10,
        children: [
          // Avatar: если item.avatar — data URL/URL, показывается картинка;
          // иначе инициал берётся из nameBind (titleField).
          { type: "avatar", bind: "avatar", nameBind: titleField, size: 40 },
          {
            type: "column",
            sx: { flex: 1 },
            children: [
              { type: "text", bind: titleField, style: "heading" },
              subtitleField
                ? { type: "text", bind: subtitleField, style: "secondary" }
                : null,
            ].filter(Boolean),
          },
        ],
      },
    ];
  }

  const body = {
    type: "list",
    source,
    gap: 8,
    empty: emptyNode,
    ...(tabs && tabs.length > 0 ? { tabs, defaultTab: projection.defaultTab } : {}),
    item: {
      type: "card",
      children: itemChildren,
      intents: [],
    },
  };
  if (projection.filter) body.filter = projection.filter;
  if (projection.sort) body.sort = projection.sort;
  if (projection.layout) body.layout = projection.layout;

  // cardSpec: декларативное описание карточки для grid-layout.
  // Вынесено в buildCardSpec (cardSpec.js) — тот же helper использует
  // grid-card-layout pattern.structure.apply.
  if (projection.layout === "grid" && projection.witnesses) {
    const cardSpec = buildCardSpec(projection.witnesses, mainEntity, ONTOLOGY);
    if (Object.keys(cardSpec).length > 0) body.cardSpec = cardSpec;
  }

  return body;
}
