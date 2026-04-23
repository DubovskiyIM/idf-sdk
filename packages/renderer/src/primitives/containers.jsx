import { useState, useRef, useEffect } from "react";
import { resolveCompositions, evalFilter } from "@intent-driven/core";
import SlotRenderer from "../SlotRenderer.jsx";
import { resolve, evalCondition, evalIntentCondition } from "../eval.js";
import { resolveNavigateAction } from "../navigation/navigate.js";
import Icon from "../adapters/Icon.jsx";
import { getAdaptedComponent } from "../adapters/registry.js";
import RowAssociationChips from "./RowAssociationChips.jsx";

/**
 * RowAssociationsGroup — блок chip-ассоциаций под item в list/grid layout.
 * Рендерит все rowAssociations из ctx, каждую в stacked-layout (label сверху,
 * chips под ним). Ничего не рендерит если rowAssociations пусто или нет item.
 */
function RowAssociationsGroup({ item, ctx }) {
  const assocs = Array.isArray(ctx?.rowAssociations) ? ctx.rowAssociations : [];
  if (assocs.length === 0 || !item) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
      {assocs.map(assoc => (
        <RowAssociationChips
          key={assoc.id || assoc.junction}
          assoc={assoc}
          item={item}
          ctx={ctx}
          layout="stacked"
        />
      ))}
    </div>
  );
}

export function Row({ node, ctx, item }) {
  return (
    <div style={{
      display: "flex", alignItems: node.align || "center",
      gap: node.gap || 8, flexWrap: node.wrap ? "wrap" : "nowrap",
      ...(node.sx || {}),
    }}>
      {(node.children || []).map((child, i) => (
        <SlotRenderer key={i} item={child} ctx={ctx} contextItem={item} />
      ))}
    </div>
  );
}

export function Column({ node, ctx, item }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      gap: node.gap || 8, ...(node.sx || {}),
    }}>
      {(node.children || []).map((child, i) => (
        <SlotRenderer key={i} item={child} ctx={ctx} contextItem={item} />
      ))}
    </div>
  );
}

const MAX_VISIBLE_ITEM_INTENTS = 3;

function groupReactions(reactions) {
  const map = new Map();
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
  }
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }));
}

// Нормализует intent-спек: поддерживает старый формат (строка = intentId) и
// новый (объект {intentId, opens, overlayKey, label}).
function normalizeIntent(spec) {
  if (typeof spec === "string") return { intentId: spec, label: spec };
  return spec;
}

function fireItemIntent(spec, ctx, item) {
  if (spec.opens === "overlay") {
    if (ctx.openOverlay) {
      ctx.openOverlay(spec.overlayKey, { item });
    } else {
      console.warn(`[renderer] openOverlay не доступен для overlay key "${spec.overlayKey}"`);
    }
    return;
  }
  ctx.exec(spec.intentId, { id: item?.id, entity: item });

  // Post-exec navigation: create_direct_chat → navigate to chat_view.
  // Exec создаёт conversation синхронно в local effects (proposed → confirmed),
  // через ~50ms conversation появится в world. Ждём следующий tick и ищем
  // новую conversation по targetUserId.
  if (spec.intentId === "create_direct_chat" && ctx.navigate) {
    setTimeout(() => {
      const convs = ctx.world?.conversations || [];
      const existing = convs.find(c =>
        c.type === "direct" && Array.isArray(c.participantIds) &&
        c.participantIds.includes(item?.id)
      );
      if (existing) {
        ctx.navigate("chat_view", { conversationId: existing.id });
      }
    }, 100);
  }
}

/**
 * Группировка intents по иконке: если несколько intents имеют одну иконку,
 * они схлопываются в «группу», которая рендерится как одна кнопка-попап
 * с текстовыми подписями (пользователь не может различить одинаковые
 * иконки без label'ов).
 *
 * Возвращает массив { type: "intent" | "group", spec | specs }.
 */
function groupByIcon(intents) {
  const byIcon = new Map();
  const order = [];
  for (const spec of intents) {
    const key = spec.icon || `__${spec.intentId}__`;
    if (!byIcon.has(key)) {
      byIcon.set(key, []);
      order.push(key);
    }
    byIcon.get(key).push(spec);
  }
  return order.map(key => {
    const specs = byIcon.get(key);
    if (specs.length === 1) return { type: "intent", spec: specs[0] };
    return { type: "group", icon: specs[0].icon, specs };
  });
}

export function Card({ node, ctx, item }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isChat = node.variant === "chat";
  const isMine = isChat && item?.senderId && ctx.viewer?.id && item.senderId === ctx.viewer.id;

  const allIntents = (node.intents || [])
    .map(normalizeIntent)
    .filter(spec => {
      const conditions = spec.conditions || [];
      return conditions.every(c => evalIntentCondition(c, item, ctx.viewer));
    });
  const grouped = groupByIcon(allIntents);
  // Non-chat: все intents в overflow menu; chat: inline кнопки
  const effectiveMax = isChat ? MAX_VISIBLE_ITEM_INTENTS : 0;
  const visible = grouped.slice(0, effectiveMax);
  const hidden = grouped.slice(effectiveMax)
    .flatMap(g => g.type === "group" ? g.specs : [g.spec]);

  // Regular-вариант (не чат) — Mantine Paper с hover.
  // Chat-вариант — оставляем inline чтобы сохранить bubble-выравнивание и
  // специфичные цвета "мои"/"чужие" — это семантика, а не стиль.
  const AdaptedPaper = !isChat ? getAdaptedComponent("primitive", "paper") : null;

  const chatStyle = {
    background: isMine
      ? "var(--idf-hover)"
      : "var(--idf-card)",
    borderRadius: 12,
    padding: 10,
    border: isMine
      ? "2px solid var(--idf-primary-border, var(--idf-accent))"
      : "1px solid var(--idf-border)",
    color: "var(--idf-text)",
    maxWidth: "70%",
    alignSelf: isMine ? "flex-end" : "flex-start",
    ...(node.sx || {}),
  };

  const regularFallbackStyle = {
    background: "var(--idf-card)",
    borderRadius: 8, padding: 14,
    border: "1px solid var(--idf-border)",
    color: "var(--idf-text)",
    boxShadow: "0 1px 3px #0001",
    ...(node.sx || {}),
  };

  const reactions = item?.id ? (ctx.world?.reactions || []).filter(r => r.messageId === item.id) : [];
  const reactionGroups = reactions.length > 0 ? groupReactions(reactions) : [];

  // Overflow menu component (используется адаптерный или fallback)
  const AdaptedOverflow = getAdaptedComponent("button", "overflow");
  const overflowMenuItems = hidden.map(spec => ({
    key: spec.intentId,
    label: spec.label || spec.intentId,
    icon: spec.icon,
    onClick: () => fireItemIntent(spec, ctx, item),
  }));

  const content = (
    <>
      {item?.forwarded && (
        <div style={{
          fontSize: 11, color: "var(--idf-text-muted)",
          borderLeft: "2px solid var(--idf-primary-border, #6366f1)",
          paddingLeft: 6, marginBottom: 4,
        }}>
          ↗ Переслано от {item.originalSenderName || "неизвестного"}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {(node.children || []).map((child, i) => (
            <SlotRenderer key={i} item={child} ctx={ctx} contextItem={item} />
          ))}
        </div>
        {/* Overflow menu — inline с контентом для non-chat */}
        {!isChat && hidden.length > 0 && (
          AdaptedOverflow
            ? <AdaptedOverflow items={overflowMenuItems} />
            : <InlineOverflowMenu items={hidden} ctx={ctx} item={item} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        )}
      </div>
      {reactionGroups.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {reactionGroups.map(g => (
            <span key={g.emoji} style={{
              fontSize: 12, padding: "2px 6px", borderRadius: 10,
              background: "var(--idf-hover)",
              border: "1px solid var(--idf-border)",
              cursor: "default",
            }}>
              {g.emoji} {g.count > 1 ? g.count : ""}
            </span>
          ))}
        </div>
      )}
      {/* Chat: inline intent buttons */}
      {isChat && visible.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {visible.map((g, gi) => (
            g.type === "group"
              ? <ItemIntentGroup key={`grp_${gi}`} group={g} ctx={ctx} item={item} />
              : <ItemIntentButton key={g.spec.intentId} spec={g.spec} ctx={ctx} item={item} />
          ))}
          {hidden.length > 0 && (
            <InlineOverflowMenu items={hidden} ctx={ctx} item={item} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          )}
        </div>
      )}
    </>
  );

  // Финальная обёртка: Mantine Paper (regular) или inline div (chat).
  if (isChat) {
    return <div style={chatStyle}>{content}</div>;
  }
  if (AdaptedPaper) {
    return (
      <AdaptedPaper padding="md">
        {content}
      </AdaptedPaper>
    );
  }
  return <div style={regularFallbackStyle}>{content}</div>;
}

function ItemIntentGroup({ group, ctx, item }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const icon = group.icon;
  const count = group.specs.length;
  const AdaptedSecondary = getAdaptedComponent("button", "secondary");

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const triggerContent = <><Icon emoji={icon} size={14} /><span style={{ fontSize: 9, opacity: 0.6 }}>×{count}</span></>;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {AdaptedSecondary
        ? <AdaptedSecondary onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }} title={group.specs.map(s => s.label || s.intentId).join(", ")}>{triggerContent}</AdaptedSecondary>
        : <button
            onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
            title={group.specs.map(s => s.label || s.intentId).join(", ")}
            style={{
              padding: "6px 8px", borderRadius: 6,
              border: "1px solid var(--idf-border)",
              background: "var(--idf-card)",
              color: "var(--idf-text)",
              fontSize: 11, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
              lineHeight: 1,
            }}
          >{triggerContent}</button>
      }
      {open && (
        <div
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "var(--idf-surface)",
            border: "1px solid var(--idf-border)",
            borderRadius: 8,
            boxShadow: "0 4px 12px #0002", padding: 4, zIndex: 10, minWidth: 180,
          }}
        >
          {group.specs.map(spec => (
            <button
              key={spec.intentId}
              onClick={(e) => { e.stopPropagation(); setOpen(false); fireItemIntent(spec, ctx, item); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", textAlign: "left",
                padding: "6px 10px", background: "transparent", border: "none",
                cursor: "pointer", fontSize: 12,
                color: "var(--idf-text)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--idf-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {spec.icon && <Icon emoji={spec.icon} size={14} />}
              <span>{spec.label || spec.intentId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemIntentButton({ spec, ctx, item }) {
  // Делегируем адаптеру — тот же MantineIntentButton, что в toolbar.
  // Этот путь используется для per-item кнопок в Card (list items).
  const AdaptedIntent = getAdaptedComponent("button", "intent");
  const onClick = (e) => {
    e.stopPropagation();
    fireItemIntent(spec, ctx, item);
  };

  if (AdaptedIntent) {
    return <AdaptedIntent spec={spec} onClick={onClick} />;
  }

  // Fallback — inline button с CSS variables.
  const label = spec.label || spec.intentId;
  const icon = spec.icon;
  const LABEL_MAX = 8;
  const showLabel = label.length <= LABEL_MAX;

  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: showLabel ? "4px 8px" : "6px 8px",
        borderRadius: 6,
        border: "1px solid var(--idf-border)",
        background: "var(--idf-card)",
        color: "var(--idf-text)",
        fontSize: 11,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        lineHeight: 1,
      }}
    >
      {icon && <Icon emoji={icon} size={13} />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

function InlineOverflowMenu({ items, ctx, item, menuOpen, setMenuOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, setMenuOpen]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
        style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "none",
          background: menuOpen ? "var(--idf-hover, rgba(0,0,0,0.04))" : "transparent",
          color: "var(--idf-text-muted)",
          fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
          fontFamily: "var(--idf-font, system-ui)",
        }}
        title="Действия"
      >⋯</button>
      {menuOpen && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0,
            background: "rgba(255, 255, 255, 0.97)",
            backdropFilter: "blur(60px) saturate(200%)",
            WebkitBackdropFilter: "blur(60px) saturate(200%)",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)", padding: 6, zIndex: 100, minWidth: 220,
            maxHeight: "50vh", overflowY: "auto",
            color: "var(--idf-text)",
            fontFamily: "var(--idf-font, system-ui)",
          }}
        >
          {items.map(spec => (
            <button
              key={spec.intentId}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); fireItemIntent(spec, ctx, item); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", textAlign: "left",
                padding: "10px 14px", background: "transparent", border: "none",
                cursor: "pointer", fontSize: 15,
                color: "var(--idf-text)", borderRadius: 8,
                fontFamily: "inherit", letterSpacing: "-0.24px",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--idf-hover, rgba(0,0,0,0.04))"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {spec.icon && <Icon emoji={spec.icon} size={18} />}
              <span>{spec.label || spec.intentId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function applyFilter(items, filter, ctx) {
  if (!filter) return items;
  if (typeof filter === "object") {
    return items.filter(it => evalFilter(filter, it, {
      viewer: ctx.viewer, world: ctx.world,
    }));
  }
  return items.filter(it => evalCondition(filter, {
    ...it, item: it, viewer: ctx.viewer, world: ctx.world,
    viewState: ctx.viewState || {},
  }));
}

export function List({ node, ctx }) {
  // projection.tabs (UI-gap #1): декларативные filter-варианты. Активный
  // tab хранится в локальном state (per-List), применяется ПОСЛЕ node.filter
  // (базовый фильтр) — composition: base && activeTab.
  const tabs = Array.isArray(node.tabs) && node.tabs.length > 0 ? node.tabs : null;
  const [activeTabId, setActiveTabId] = useState(() => {
    if (!tabs) return null;
    if (node.defaultTab && tabs.some(t => t.id === node.defaultTab)) return node.defaultTab;
    return tabs[0].id;
  });
  const activeTab = tabs ? tabs.find(t => t.id === activeTabId) : null;

  const source = node.source ? resolve(ctx.world, node.source) : [];
  let items = Array.isArray(source) ? [...source] : [];

  // R9: если artifact объявляет compositions, обогащаем items alias-полями
  // ДО filter/sort/render. Это позволяет использовать "task.title" в
  // witnesses, filter expressions, sort — по-настоящему end-to-end.
  // Spec: idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md
  const compositions = ctx?.artifact?.compositions;
  if (Array.isArray(compositions) && compositions.length > 0 && items.length > 0) {
    items = resolveCompositions(items, compositions, ctx.world);
  }

  // Base filter (node.filter) — structured (объект) или legacy string-expression.
  items = applyFilter(items, node.filter, ctx);
  // Tab-filter applied on top of base filter.
  if (activeTab?.filter) {
    items = applyFilter(items, activeTab.filter, ctx);
  }

  if (node.sort) {
    // Для direction:"bottom-up" сортируем ПО ВОЗРАСТАНИЮ (старое сверху,
    // новое внизу — классический чат). Для обычного списка — по убыванию
    // если sort начинается с "-".
    const desc = node.sort.startsWith("-");
    const field = node.sort.replace(/^-/, "");
    items.sort((a, b) => {
      const va = resolve(a, field), vb = resolve(b, field);
      return desc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
    });
  }

  // Rules-of-Hooks: все hooks вызываются ДО любого conditional
  // early-return. items.length меняется между рендерами — early-return
  // для пустого списка conditional. useRef/useEffect после него ломает
  // hook-order при переходе пустой ↔ не-пустой.
  const bottomUp = node.direction === "bottom-up";
  const scrollRef = useRef(null);
  // Автопрокрутка к последнему элементу для bottom-up
  useEffect(() => {
    if (bottomUp && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items.length, bottomUp]);

  if (items.length === 0 && node.empty) {
    return <SlotRenderer item={node.empty} ctx={ctx} />;
  }

  const onItemClick = node.onItemClick;

  const isGrid = node.layout === "grid";
  const kanbanLayout = (node.layout && typeof node.layout === "object" && node.layout.type === "kanban")
    ? node.layout
    : null;

  const containerStyle = isGrid
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: node.gap || 12,
        ...(node.sx || {}),
      }
    : {
        display: "flex", flexDirection: "column",
        gap: node.gap || 6,
        ...(bottomUp ? { minHeight: "100%", justifyContent: "flex-end" } : {}),
        ...(node.sx || {}),
      };

  const listBody = kanbanLayout ? (
    <KanbanBoard
      ref={scrollRef}
      layout={kanbanLayout}
      items={items}
      node={node}
      ctx={ctx}
      onItemClick={onItemClick}
    />
  ) : (
    <div ref={scrollRef} style={containerStyle}>
      {items.map((item, i) => {
        const content = isGrid
          ? <GridCard item={item} node={node} ctx={ctx} />
          : <SlotRenderer item={node.item} ctx={ctx} contextItem={item} />;
        // Pattern inline-chip-association: под каждым item рендерим chips per
        // rowAssociation (из ctx.rowAssociations). Пусто, если patttern не
        // сработал на эту projection.
        const withChips = (
          <>
            {content}
            <RowAssociationsGroup item={item} ctx={ctx} />
          </>
        );
        if (!onItemClick) return <div key={item.id || i}>{withChips}</div>;
        return (
          <ClickableItem key={item.id || i} action={onItemClick} item={item} ctx={ctx}>
            {withChips}
          </ClickableItem>
        );
      })}
    </div>
  );

  if (!tabs) return listBody;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TabBar tabs={tabs} activeId={activeTabId} onChange={setActiveTabId} />
      {listBody}
    </div>
  );
}

/**
 * KanbanBoard — horizontal columns, items группируются по layout.columnField.
 * Value каждого item в этом поле матчится с column.id. Unmatched items
 * попадают в последнюю колонку.
 *
 * Drag-to-replace status — TODO (HTML5 drag API + ctx.exec). Сейчас только
 * grouping + per-item click-navigation.
 */
function KanbanBoard({ layout, items, node, ctx, onItemClick }) {
  const columns = Array.isArray(layout.columns) ? layout.columns : [];
  const columnField = layout.columnField || "status";
  const columnIds = new Set(columns.map(c => c.id));
  const grouped = new Map();
  for (const col of columns) grouped.set(col.id, []);
  const overflow = [];
  for (const item of items) {
    const key = item?.[columnField];
    if (columnIds.has(key)) grouped.get(key).push(item);
    else overflow.push(item);
  }

  return (
    <div
      role="group"
      aria-label="Kanban"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 12,
        overflowX: "auto",
        minHeight: 200,
      }}
    >
      {columns.map(col => {
        const colItems = grouped.get(col.id) || [];
        const extra = col.id === columns[columns.length - 1]?.id ? overflow : [];
        const allItems = [...colItems, ...extra];
        return (
          <div
            key={col.id}
            data-column={col.id}
            style={{
              flex: "0 0 260px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 10,
              borderRadius: 8,
              background: "var(--idf-surface-soft, #f8fafb)",
              border: "1px solid var(--idf-border, #e5e7eb)",
              minHeight: 160,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--idf-text-muted, #6b7280)",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              <span>{col.label || col.id}</span>
              <span
                style={{
                  background: "var(--idf-surface, #fff)",
                  borderRadius: 12,
                  padding: "1px 8px",
                  fontSize: 11,
                }}
              >
                {allItems.length}
              </span>
            </div>
            {allItems.map((item, i) => {
              const content = (
                <>
                  <SlotRenderer item={node.item} ctx={ctx} contextItem={item} />
                  <RowAssociationsGroup item={item} ctx={ctx} />
                </>
              );
              if (!onItemClick) return <div key={item.id || i}>{content}</div>;
              return (
                <ClickableItem
                  key={item.id || i}
                  action={onItemClick}
                  item={item}
                  ctx={ctx}
                >
                  {content}
                </ClickableItem>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TabBar({ tabs, activeId, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 24,
        borderBottom: "1px solid var(--idf-border, #e5e7eb)",
        padding: "0 4px",
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: "10px 2px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${
                isActive ? "var(--idf-accent, #1677ff)" : "transparent"
              }`,
              color: isActive
                ? "var(--idf-text, #1a1a2e)"
                : "var(--idf-accent, #1677ff)",
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab.label || tab.id}
          </button>
        );
      })}
    </div>
  );
}

function GridCard({ item, node, ctx }) {
  const rawSpec = node.cardSpec;
  if (!rawSpec) return <GridCardLegacy item={item} node={node} />;

  // Polymorphic dispatch (v0.15): если spec содержит variants + discriminator,
  // выбираем per-variant spec по item[discriminator]. Fallback на первый variant
  // при unknown key + console.warn.
  let spec = rawSpec;
  if (rawSpec.variants && rawSpec.discriminator) {
    const variantKey = item[rawSpec.discriminator];
    const variantSpec = rawSpec.variants[variantKey];
    if (variantSpec) {
      spec = variantSpec;
    } else {
      const firstKey = Object.keys(rawSpec.variants)[0];
      spec = rawSpec.variants[firstKey] || {};
      if (variantKey) {
        console.warn(`[GridCard] unknown variant '${variantKey}' for discriminator '${rawSpec.discriminator}'; fallback to '${firstKey}'`);
      }
    }
  }

  const resolveField = (f) => f?.bind ? resolve(item, f.bind) : null;

  const rawImage = resolveField(spec.image);
  const image = Array.isArray(rawImage) ? rawImage[0] : rawImage;
  const title = resolveField(spec.title) || item.title || item.name || item.id;
  const priceRaw = resolveField(spec.price);
  const price = typeof priceRaw === "number" ? priceRaw.toLocaleString("ru") + (spec.price?.suffix || "") : priceRaw;
  const badge = resolveField(spec.badge);
  const locationVal = resolveField(spec.location);

  // Timer
  let timerText = null;
  const timerRaw = resolveField(spec.timer);
  if (timerRaw) {
    const target = typeof timerRaw === "number" ? timerRaw : new Date(timerRaw).getTime();
    const diff = target - Date.now();
    if (diff <= 0) timerText = "завершён";
    else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      timerText = days > 0 ? `${days}д ${hours}ч` : `${hours}ч`;
    }
  }

  const metrics = (spec.metrics || [])
    .map(m => ({ label: m.label, val: resolve(item, m.bind) }))
    .filter(m => m.val != null && m.val !== 0);

  const isValidImage = typeof image === "string" && (image.startsWith("data:") || image.startsWith("http") || image.startsWith("/"));

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--idf-border)",
      background: "var(--idf-card)",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      cursor: node.onItemClick ? "pointer" : "default",
    }}>
      <div style={{
        height: 160, background: "var(--idf-hover)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}>
        {isValidImage ? (
          <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.15 }}>📦</span>
        )}
        {price && (
          <span style={{
            position: "absolute", bottom: 8, right: 8,
            background: "var(--idf-surface)", color: "var(--idf-text)",
            padding: "3px 8px", borderRadius: 6, fontSize: 13, fontWeight: 700,
            boxShadow: "0 1px 4px #0002",
          }}>{price}</span>
        )}
      </div>
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "var(--idf-text)",
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{title}</div>
        {(badge || locationVal) && (
          <div style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--idf-text-muted)" }}>
            {badge && <span>{badge}</span>}
            {badge && locationVal && <span>·</span>}
            {locationVal && <span>📍 {locationVal}</span>}
          </div>
        )}
        {timerText && (
          <div style={{ fontSize: 11, color: "var(--idf-text-muted)" }}>⏰ {timerText}</div>
        )}
        {metrics.length > 0 && (
          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--idf-text-muted)" }}>
            {metrics.map((m, i) => <span key={i}>{m.label}: {m.val}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function GridCardLegacy({ item, node }) {
  const title = item.title || item.name || item.id;
  const rawImage = item.images || item.image || item.avatar;
  const image = Array.isArray(rawImage) ? rawImage[0] : rawImage;
  const price = item.currentPrice ?? item.price ?? item.startPrice;
  const subtitle = item.condition || item.status || "";
  const location = item.shippingFrom || item.location || "";

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid var(--idf-border)",
      background: "var(--idf-card)",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      cursor: node.onItemClick ? "pointer" : "default",
    }}>
      <div style={{
        height: 160, background: "var(--idf-hover)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}>
        {image && typeof image === "string" && image.startsWith("data:") ? (
          <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.15 }}>📦</span>
        )}
        {price != null && (
          <span style={{
            position: "absolute", bottom: 8, right: 8,
            background: "var(--idf-surface)", color: "var(--idf-text)",
            padding: "3px 8px", borderRadius: 6, fontSize: 13, fontWeight: 700,
            boxShadow: "0 1px 4px #0002",
          }}>
            {typeof price === "number" ? price.toLocaleString("ru") + " ₽" : price}
          </span>
        )}
      </div>
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "var(--idf-text)",
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{title}</div>
        {(subtitle || location) && (
          <div style={{ fontSize: 11, color: "var(--idf-text-muted)" }}>
            {subtitle}{subtitle && location ? " · " : ""}{location}
          </div>
        )}
      </div>
    </div>
  );
}

function ClickableItem({ action, item, ctx, children }) {
  const handleClick = () => {
    const resolved = resolveNavigateAction(action, item, ctx.viewer);
    if (resolved && ctx.navigate) {
      ctx.navigate(resolved.to, resolved.params);
    }
  };
  return (
    <div onClick={handleClick} style={{ cursor: "pointer" }}>
      {children}
    </div>
  );
}
