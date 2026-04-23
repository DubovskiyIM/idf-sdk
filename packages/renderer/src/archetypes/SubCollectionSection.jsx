import { useMemo, useState } from "react";
import SlotRenderer from "../SlotRenderer.jsx";
import SubCollectionAdd from "../controls/SubCollectionAdd.jsx";
import { evalIntentCondition, evalCondition, resolve } from "../eval.js";
import Icon from "../adapters/Icon.jsx";
import { getAdaptedComponent } from "../adapters/registry.js";
import { EventTimeline } from "../primitives/eventTimeline.jsx";

/**
 * Apply section-level filter (backlog §4.7). Поддержка двух форм:
 *   where: "item.status !== 'withdrawn'"  — строка eval
 *   where: { field: "status", not: "withdrawn" }  — простой object
 * Не-строковые / unparsable — pass-through.
 */
function applyWhere(items, where, ctx) {
  if (!where) return items;
  if (typeof where === "string") {
    return items.filter(it => evalCondition(where, {
      ...it, item: it, viewer: ctx.viewer, world: ctx.world,
    }));
  }
  if (typeof where === "object") {
    return items.filter(it => {
      for (const [field, expected] of Object.entries(where)) {
        if (field === "not") continue; // not-handling below
        if (it[field] !== expected) return false;
      }
      if (where.not && typeof where.not === "object") {
        for (const [field, val] of Object.entries(where.not)) {
          if (it[field] === val) return false;
        }
      }
      return true;
    });
  }
  return items;
}

/**
 * Apply section-level sort (backlog §4.7). Format: "-createdAt" / "+priority" / "field".
 */
function applySort(items, sortSpec) {
  if (!sortSpec || typeof sortSpec !== "string") return items;
  const desc = sortSpec.startsWith("-");
  const field = sortSpec.replace(/^[-+]/, "");
  if (!field) return items;
  return [...items].sort((a, b) => {
    const va = resolve(a, field);
    const vb = resolve(b, field);
    if (va === vb) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (desc) return vb > va ? 1 : -1;
    return va > vb ? 1 : -1;
  });
}

const DEFAULT_TERMINAL_STATUSES = new Set([
  "withdrawn", "cancelled", "canceled", "rejected", "expired", "closed",
  "refunded", "archived", "deleted", "completed_ack",
]);

function isTerminalItem(item, statusField) {
  if (!statusField) return false;
  const v = item?.[statusField];
  return typeof v === "string" && DEFAULT_TERMINAL_STATUSES.has(v);
}

/**
 * Pluralization для fallback collection-key'а: "Position" → "positions",
 * "Address" → "addresses". Используется когда section.source — witness
 * ("derived:<pattern>"), а реальный ключ коллекции не задан явно.
 */
function humanizePluralCollection(entity) {
  if (!entity) return "";
  const first = entity.charAt(0).toLowerCase();
  const rest = entity.slice(1);
  const base = first + rest;
  if (/[sxz]$/.test(base) || /(ch|sh)$/.test(base)) return base + "es";
  return base + "s";
}

/**
 * SubCollectionSection — секция связанной коллекции в detail-проекции.
 *
 * Рендерит:
 *   - Заголовок + счётчик элементов
 *   - Inline-композер для добавления (если conditions addControl разрешают
 *     текущую фазу target)
 *   - Список элементов с bind-view и per-item кнопками
 *   - Пустое состояние с текстом
 *
 * Phase-фильтрация: addControl и item intents проверяют
 * evalIntentCondition(cond, target, viewer) — условия вида `poll.status = 'draft'`
 * автоматически отключают UI в чужой фазе.
 */
export default function SubCollectionSection({ section, target, ctx }) {
  const {
    title, source, foreignKey, itemView, itemIntents, addControl, emptyLabel, editableFields,
    readOnly,
    // Author-decl (backlog §4.7/§4.8):
    sort: sectionSort,
    where: sectionWhere,
    terminalStatus,
    hideTerminal: hideTerminalFlag,
    toggleTerminalLabel,
    // Group-by (pattern reverse-association-browser / polymorphic junctions):
    // если задано, items группируются по значению поля, рендерятся как sub-buckets
    // с подзаголовком + count. NullLabel — для items, где значение отсутствует.
    groupBy,
    groupNullLabel,
  } = section;

  // Pattern-derived section'ы могут держать `source` как witness ("derived:<id>")
  // и указывать реальный collection-key в `section.collection` (а itemEntity как
  // fallback). Для обратной совместимости со старыми авторскими sections
  // (source — ключ) оставляем source приоритетом, если он не witness.
  const collectionKey = (typeof source === "string" && source.startsWith("derived:"))
    ? (section.collection || (section.itemEntity && humanizePluralCollection(section.itemEntity)) || source)
    : source;

  // §6.7: toggle "показать всё" для terminal items. hidden by default когда terminalStatus задан.
  const [showAllTerminal, setShowAllTerminal] = useState(false);

  // Фильтруем коллекцию по foreignKey === target.id + author where + sort + terminal hiding
  const items = useMemo(() => {
    const all = ctx.world?.[collectionKey] || [];
    let result = (!foreignKey || !target?.id)
      ? all
      : all.filter(it => it[foreignKey] === target.id);
    result = applyWhere(result, sectionWhere, ctx);
    if (hideTerminalFlag && terminalStatus && !showAllTerminal) {
      result = result.filter(it => !isTerminalItem(it, terminalStatus));
    }
    result = applySort(result, sectionSort);
    return result;
  }, [ctx.world, collectionKey, foreignKey, target, sectionWhere, sectionSort, terminalStatus, hideTerminalFlag, showAllTerminal, ctx.viewer]);

  // Temporal sub-entity (v0.14): если section.renderAs.type === "eventTimeline",
  // рендерим через EventTimeline primitive, пропуская default path.
  if (section.renderAs?.type === "eventTimeline") {
    if (items.length === 0) return null;
    const { kind, atField, kindField, actorField, descriptionField, stateFields } = section.renderAs;
    return (
      <div style={{ padding: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", color: "var(--idf-text-muted)", marginBottom: 12,
        }}>
          {title} ({items.length})
        </div>
        <EventTimeline
          events={items}
          kind={kind}
          atField={atField}
          kindField={kindField}
          actorField={actorField}
          descriptionField={descriptionField}
          stateFields={stateFields}
        />
      </div>
    );
  }

  // AddControl виден только когда его conditions истинны против target
  const canAdd = useMemo(() => {
    if (!addControl) return false;
    const conds = addControl.conditions || [];
    return conds.every(c => evalIntentCondition(c, target, ctx.viewer));
  }, [addControl, target, ctx.viewer]);

  // Скрытые terminal items для toggle affordance (§6.7).
  const hiddenTerminalCount = useMemo(() => {
    if (!hideTerminalFlag || !terminalStatus || showAllTerminal) return 0;
    const all = ctx.world?.[collectionKey] || [];
    const scoped = (!foreignKey || !target?.id)
      ? all
      : all.filter(it => it[foreignKey] === target.id);
    return scoped.filter(it => isTerminalItem(it, terminalStatus)).length;
  }, [hideTerminalFlag, terminalStatus, showAllTerminal, ctx.world, collectionKey, foreignKey, target]);

  // Пустая секция без возможности добавления и без скрытых terminal — не показываем
  if (items.length === 0 && !canAdd && hiddenTerminalCount === 0) return null;

  const AdaptedPaper = getAdaptedComponent("primitive", "paper");
  const Wrapper = AdaptedPaper || FallbackPaper;

  return (
    <Wrapper padding="lg">
      {/* Заголовок */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--idf-text-muted)",
        }}>
          {title} ({items.length})
        </div>
        {hideTerminalFlag && terminalStatus && (hiddenTerminalCount > 0 || showAllTerminal) && (
          <button
            type="button"
            onClick={() => setShowAllTerminal(v => !v)}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--idf-primary, #6366f1)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            {showAllTerminal
              ? "Скрыть завершённые"
              : `${toggleTerminalLabel || "Показать все"} (+${hiddenTerminalCount})`}
          </button>
        )}
      </div>

      {/* Inline-композер для добавления */}
      {canAdd && (
        <SubCollectionAdd spec={addControl} ctx={ctx} target={target} />
      )}

      {/* Список элементов */}
      {items.length === 0 && !canAdd && (
        <div style={{ color: "var(--idf-text-muted)", fontSize: 13, textAlign: "center", padding: 12 }}>
          {emptyLabel || "Пусто"}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: canAdd ? 12 : 0 }}>
          {groupBy ? (
            <GroupedItems
              items={items}
              groupBy={groupBy}
              nullLabel={groupNullLabel}
              itemView={itemView}
              itemIntents={itemIntents || []}
              editableFields={editableFields}
              ctx={ctx}
              target={target}
            />
          ) : (
            items.map(item => (
              <SubCollectionItem
                key={item.id}
                item={item}
                itemView={itemView}
                itemIntents={itemIntents || []}
                ctx={ctx}
                target={target}
                editableFields={editableFields}
              />
            ))
          )}
        </div>
      )}
    </Wrapper>
  );
}

/**
 * GroupedItems — рендерит items сгруппированными по `groupBy`-полю. Порядок
 * групп: сначала те, что встречаются в исходном массиве (стабильность);
 * null/undefined значения идут в отдельный bucket с `nullLabel` (по
 * умолчанию «Без значения»).
 *
 * Каждый bucket — subheader (label + count) + items под ним. Используется
 * reverse-association-browser для polymorphic junctions (`objectType`).
 */
function GroupedItems({ items, groupBy, nullLabel, itemView, itemIntents, editableFields, ctx, target }) {
  const groups = useMemo(() => {
    const buckets = new Map();
    const order = [];
    const NULL_KEY = "__null__";
    for (const item of items) {
      let key = item?.[groupBy];
      if (key == null || key === "") key = NULL_KEY;
      if (!buckets.has(key)) {
        buckets.set(key, []);
        order.push(key);
      }
      buckets.get(key).push(item);
    }
    return order.map(key => ({
      key,
      label: key === NULL_KEY ? (nullLabel || "Без значения") : String(key),
      items: buckets.get(key),
    }));
  }, [items, groupBy, nullLabel]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {groups.map(group => (
        <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={groupHeaderStyle}>
            {group.label} ({group.items.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.items.map(item => (
              <SubCollectionItem
                key={item.id}
                item={item}
                itemView={itemView}
                itemIntents={itemIntents}
                ctx={ctx}
                target={target}
                editableFields={editableFields}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const groupHeaderStyle = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--idf-text-muted, #6b7280)",
  padding: "2px 0",
  borderBottom: "1px solid var(--idf-border, #e5e7eb)",
};

// Fallback когда адаптер не задан
function FallbackPaper({ children }) {
  return (
    <div style={{
      background: "var(--idf-card)",
      borderRadius: 12,
      padding: 20,
      border: "1px solid var(--idf-border)",
    }}>
      {children}
    </div>
  );
}

function SubCollectionItem({ item, itemView, itemIntents, ctx, target, editableFields }) {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  // Фильтруем per-item кнопки по conditions
  const passConds = (conds) =>
    (conds || []).every(c =>
      evalIntentCondition(c, item, ctx.viewer) ||
      evalIntentCondition(c, target, ctx.viewer)
    );

  const visibleIntents = itemIntents.filter(spec => passConds(spec.conditions));

  const fireIntent = (spec) => {
    ctx.exec(spec.intentId, { id: item.id });
  };

  const startEdit = () => {
    const vals = {};
    for (const f of (editableFields || [])) vals[f] = item[f] || "";
    setEditValues(vals);
    setEditing(true);
  };

  const saveEdit = () => {
    for (const [field, value] of Object.entries(editValues)) {
      if (value !== item[field]) {
        // Ищем replace-intent для этого поля среди itemIntents
        const replaceSpec = itemIntents.find(s => s.intentId?.includes("edit") || s.intentId?.includes("rename") || s.intentId?.includes("update"));
        if (replaceSpec) {
          ctx.exec(replaceSpec.intentId, { id: item.id, [field]: value });
        }
      }
    }
    setEditing(false);
  };

  const canEdit = editableFields && editableFields.length > 0 && visibleIntents.length > 0;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      background: "var(--idf-hover)",
      border: `1px solid ${editing ? "var(--idf-primary, #6366f1)" : "var(--idf-border)"}`,
      borderRadius: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {editableFields.map(field => (
              <input
                key={field}
                value={editValues[field] || ""}
                onChange={e => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={field}
                style={{
                  padding: "4px 8px", borderRadius: 4, fontSize: 13,
                  border: "1px solid var(--idf-border)",
                  background: "var(--idf-surface)",
                  color: "var(--idf-text)",
                  outline: "none",
                }}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
                autoFocus
              />
            ))}
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={saveEdit} style={miniBtn}>Сохранить</button>
              <button onClick={() => setEditing(false)} style={{ ...miniBtn, color: "var(--idf-text-muted)" }}>Отмена</button>
            </div>
          </div>
        ) : (
          <SlotRenderer item={itemView} ctx={ctx} contextItem={item} />
        )}
      </div>
      {!editing && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {canEdit && (
            <button
              onClick={startEdit}
              title="Редактировать"
              style={actionBtn}
            >
              <Icon emoji="✎" size={14} />
            </button>
          )}
          {visibleIntents.map((spec, i) => {
            if (spec.type === "voteGroup") {
              return (
                <VoteGroup
                  key={`grp_${spec.intentGroup}_${i}`}
                  group={spec}
                  item={item}
                  ctx={ctx}
                  passConds={passConds}
                />
              );
            }
            return (
              <button
                key={spec.intentId}
                onClick={() => fireIntent(spec)}
                title={spec.label}
                style={actionBtn}
              >
                {spec.icon && <Icon emoji={spec.icon} size={14} />}
                <span>{spec.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const actionBtn = {
  padding: "6px 10px", borderRadius: 6,
  border: "1px solid var(--idf-border)",
  background: "var(--idf-card)",
  cursor: "pointer", fontSize: 12,
  display: "inline-flex", alignItems: "center", gap: 4,
};

const miniBtn = {
  padding: "3px 10px", borderRadius: 4, border: "none",
  background: "var(--idf-primary, #6366f1)", color: "#fff",
  cursor: "pointer", fontSize: 11,
};

/**
 * VoteGroup — рендер взаимоисключающих creator-intents как группы цветных
 * кнопок (зелёный/жёлтый/красный). Фильтрует каждую опцию по её conditions
 * (если они различались между intents группы — кристаллизатор записал их
 * per-option, иначе null).
 *
 * Voter identity: vote-интенты ожидают `participantId` (см. §23 манифеста).
 * VoteGroup читает его из ctx.viewState.voterParticipantId, заполняемого
 * VoterSelector'ом поверх detail-проекции. Если participantId не выбран —
 * кнопки дизэйблятся с tooltip'ом. `optionId` берётся из item.id (каждая
 * VoteGroup рендерится внутри строки TimeOption).
 */
function VoteGroup({ group, item, ctx, passConds }) {
  const options = group.options.filter(opt =>
    opt.conditions == null || passConds(opt.conditions)
  );
  if (options.length === 0) return null;

  const participantId = ctx.viewState?.voterParticipantId || "";
  const disabled = !participantId;
  const disabledTitle = "Выберите участника в селекторе «Голосовать как»";

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(opt => (
        <button
          key={opt.intentId}
          disabled={disabled}
          onClick={() => ctx.exec(opt.intentId, { optionId: item.id, participantId })}
          title={disabled ? disabledTitle : opt.label}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            background: opt.style.bg,
            color: opt.style.color,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
            opacity: disabled ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            if (!disabled) e.currentTarget.style.background = opt.style.bgHover;
          }}
          onMouseLeave={e => {
            if (!disabled) e.currentTarget.style.background = opt.style.bg;
          }}
        >
          {opt.style.icon && <Icon emoji={opt.style.icon} size={14} />}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
