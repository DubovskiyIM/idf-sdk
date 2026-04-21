import { useMemo, useState } from "react";
import ParameterControl from "../parameters/index.jsx";
import EmptyState from "../primitives/EmptyState.jsx";
import { getAdaptedComponent } from "../adapters/registry.js";

/**
 * Form-архетип: редактирование одной сущности через композитную форму.
 *
 * Проекция автогенерируется кристаллизатором из detail-проекции + replace-intents
 * (см. formGrouping.js). Body содержит formSpec: { fields, mainEntity, editIntents }.
 *
 * Save → execBatch собирает все изменённые поля в atomic batch-эффект
 * (α:"batch", §11 манифеста).
 */
export default function ArchetypeForm({ slots, ctx: parentCtx, projection }) {
  const body = slots.body; // { type: "formBody", mainEntity, fields, editIntents, mode, creatorIntent }
  const isCreateMode = body?.mode === "create";

  // Резолв target entity из route params (как в detail-архетипе).
  // В create-режиме target отсутствует — пропускаем lookup.
  const target = useMemo(() => {
    if (isCreateMode) return null;
    const mainEntity = projection?.mainEntity;
    const idParam = projection?.idParam;
    if (!mainEntity || !idParam) return null;
    const collection = pluralize(mainEntity.toLowerCase());
    const list = parentCtx.world?.[collection] || [];
    const id = parentCtx.routeParams?.[idParam];
    if (!id) return null;
    return list.find(e => e.id === id) || null;
  }, [isCreateMode, projection, parentCtx.world, parentCtx.routeParams]);

  // Initial values — из target (edit) или пустые / field.default (create)
  const [values, setValues] = useState(() => {
    const initial = {};
    if (target) {
      for (const field of body.fields || []) {
        initial[field.name] = target[field.name] ?? "";
      }
    } else if (isCreateMode) {
      for (const field of body.fields || []) {
        initial[field.name] = field.default ?? "";
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // В edit-режиме без target — показываем EmptyState-пояснение.
  // Create-режим не нуждается в target (новая запись).
  if (!target && !isCreateMode) {
    const id = parentCtx.routeParams?.[projection?.idParam];
    const entityName = projection?.name || "Запись";
    if (!id) {
      return (
        <EmptyState
          icon="👈"
          title="Выбери, что редактировать"
          hint={`Открой конкретный ${entityName.toLowerCase()} из списка, чтобы внести изменения.`}
        />
      );
    }
    return (
      <EmptyState
        icon="🔍"
        title="Ничего не найдено"
        hint={`${entityName} с этим идентификатором отсутствует — возможно, был удалён.`}
      />
    );
  }

  // Ownership check: только в edit-режиме (в create'е owner проставится
  // сервером из viewer'а). Если target не принадлежит viewer'у — отказ.
  const viewerId = parentCtx.viewer?.id;
  const ownerFields = ["clientId", "organizerId", "userId", "authorId", "sellerId", "openedBy", "id"];
  const isOwner = isCreateMode || (viewerId && target && ownerFields.some(f => target[f] === viewerId));
  if (!isOwner) {
    return (
      <div style={{
        padding: 40, textAlign: "center", color: "var(--idf-text-muted)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--idf-text)" }}>
          Нет доступа к редактированию
        </div>
        <div style={{ fontSize: 12 }}>
          Вы можете редактировать только собственный профиль.
        </div>
        <button
          onClick={() => parentCtx.back ? parentCtx.back() : parentCtx.navigate?.(projection.sourceProjection, parentCtx.routeParams || {})}
          style={{
            marginTop: 8, padding: "8px 16px", borderRadius: 6,
            border: "1px solid #d1d5db", background: "#fff",
            color: "#374151", cursor: "pointer", fontSize: 13,
          }}
        >← Назад</button>
      </div>
    );
  }

  // Какие поля изменены (edit: value !== target[field]; create: value не пустой)
  const dirtyFields = (body.fields || []).filter(f => {
    if (!f.editable) return false;
    if (isCreateMode) {
      const v = values[f.name];
      return v !== "" && v !== null && v !== undefined;
    }
    return values[f.name] !== target[f.name];
  });

  const goBack = () => {
    if (parentCtx.navigate) {
      // Try navigate back через стек — но navigate только push'ит.
      // back() живёт в V2UI через useProjectionRoute. Для form-архетипа
      // пока используем ctx.back если доступен, иначе навигируем в source.
      if (parentCtx.back) {
        parentCtx.back();
      } else if (projection?.sourceProjection) {
        parentCtx.navigate(projection.sourceProjection, parentCtx.routeParams || {});
      }
    }
  };

  const onSave = async () => {
    // Валидация required полей
    const newErrors = {};
    for (const f of body.fields || []) {
      if (f.editable && f.required && !values[f.name]) {
        newErrors[f.name] = "Обязательное поле";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    if (dirtyFields.length === 0) {
      goBack();
      return;
    }

    setSubmitting(true);
    try {
      if (isCreateMode) {
        // Create: один intent (creatorIntent), все dirty-поля как ctx.
        const creatorIntentId = body.creatorIntent || projection?.creatorIntent;
        if (!creatorIntentId) {
          console.warn("[ArchetypeForm] create-mode без creatorIntent — skip save");
          return;
        }
        const payload = {};
        for (const f of dirtyFields) {
          payload[f.name] = values[f.name];
        }
        await parentCtx.exec(creatorIntentId, payload);
        goBack();
        return;
      }

      // Edit: группируем dirty-поля по intentId (один intent может
      // покрывать несколько полей — отправляем одним вызовом).
      const byIntent = {};
      for (const f of dirtyFields) {
        if (!byIntent[f.intentId]) byIntent[f.intentId] = {};
        byIntent[f.intentId][f.name] = values[f.name];
      }
      const subs = Object.entries(byIntent).map(([intentId, fields]) => ({
        intentId,
        ctx: { id: target.id, ...fields },
      }));

      if (parentCtx.execBatch) {
        parentCtx.execBatch(projection.sourceProjection || "edit_form", subs);
      } else {
        for (const sub of subs) {
          await parentCtx.exec(sub.intentId, sub.ctx);
        }
      }
      goBack();
    } finally {
      setSubmitting(false);
    }
  };

  // backlog §9.4 / 9.5: header — adapter-aware. Если адаптер предоставил
  // `shell.formHeader` — используем его; иначе neutral-fallback через
  // CSS-vars. Название projection'а фоллбэкается на artifact.name
  // (projection может быть не передана host'ом — §9.5 guard).
  const AdaptedFormHeader = getAdaptedComponent("shell", "formHeader");
  const AdaptedPrimary   = getAdaptedComponent("button", "primary");
  const AdaptedSecondary = getAdaptedComponent("button", "secondary");
  const saveLabel   = submitting ? "…" : (isCreateMode ? "Создать" : "Сохранить");
  const cancelLabel = "Отмена";
  const titleText   = projection?.name || parentCtx?.artifact?.name || "";
  const canSave     = !submitting && dirtyFields.length > 0;

  let header;
  if (AdaptedFormHeader) {
    header = (
      <AdaptedFormHeader
        title={titleText}
        saveLabel={saveLabel}
        cancelLabel={cancelLabel}
        onSave={canSave ? onSave : undefined}
        onCancel={goBack}
        disabled={!canSave}
      />
    );
  } else if (AdaptedPrimary && AdaptedSecondary) {
    // Neutral adapter-rendered header (antd / mantine).
    header = (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--idf-border, #e5e7eb)",
        background: "var(--idf-card, #fff)",
      }}>
        <AdaptedSecondary onClick={goBack}>← {cancelLabel}</AdaptedSecondary>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, flex: 1, textAlign: "center", color: "var(--idf-text, #1f2937)" }}>
          {titleText}
        </h1>
        <AdaptedPrimary onClick={canSave ? onSave : undefined} disabled={!canSave}>
          {saveLabel}
        </AdaptedPrimary>
      </div>
    );
  } else {
    // Native fallback (без адаптера) — минимум стилей через CSS-vars.
    header = (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--idf-border, #e5e7eb)",
        background: "var(--idf-card, #fff)",
      }}>
        <button onClick={goBack} style={{
          padding: "6px 10px", border: "1px solid var(--idf-border, #d1d5db)",
          borderRadius: 6, background: "transparent",
          color: "var(--idf-text, #374151)", cursor: "pointer", fontSize: 13,
        }}>← {cancelLabel}</button>
        <h1 style={{
          margin: 0, fontSize: 16, fontWeight: 600, flex: 1,
          textAlign: "center", color: "var(--idf-text, #1f2937)",
        }}>
          {titleText}
        </h1>
        <button
          onClick={canSave ? onSave : undefined}
          disabled={!canSave}
          style={{
            padding: "6px 14px", border: "none", borderRadius: 6,
            background: canSave ? "var(--idf-primary, #2563eb)" : "var(--idf-muted, #d1d5db)",
            color: "#fff", fontWeight: 600, fontSize: 13,
            cursor: canSave ? "pointer" : "default",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {saveLabel}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--idf-surface, #f8f9fa)",
      fontFamily: "var(--idf-font, system-ui, -apple-system, sans-serif)",
    }}>
      {header}

      {/* Form content — iOS grouped inset style */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {body.sections ? (
            body.sections.map(section => (
              <div key={section.id} style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 13, fontWeight: 400, textTransform: "uppercase",
                  letterSpacing: "-0.08px",
                  color: "var(--idf-text-muted, #8e8e93)",
                  marginBottom: 8, paddingLeft: 16,
                  fontFamily: "inherit",
                }}>{section.title}</div>
                <div style={{
                  background: "var(--idf-card, rgba(255,255,255,0.85))",
                  borderRadius: "var(--idf-radius, 10px)",
                  border: "0.5px solid var(--idf-border, rgba(60,60,67,0.12))",
                  overflow: "hidden",
                }}>
                  {section.fields.filter(f => f.editable).map((field, i, arr) => (
                    <div key={field.name} style={{
                      padding: "4px 16px",
                      borderBottom: i < arr.length - 1
                        ? "0.5px solid var(--idf-border, rgba(60,60,67,0.12))"
                        : "none",
                    }}>
                      <FormField field={field} values={values} setValues={setValues} errors={errors} world={parentCtx.world} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              background: "var(--idf-card, rgba(255,255,255,0.85))",
              borderRadius: "var(--idf-radius, 10px)",
              border: "0.5px solid var(--idf-border, rgba(60,60,67,0.12))",
              overflow: "hidden",
            }}>
              {(body.fields || []).filter(f => f.editable).map((field, i, arr) => (
                <div key={field.name} style={{
                  padding: "4px 16px",
                  borderBottom: i < arr.length - 1
                    ? "0.5px solid var(--idf-border, rgba(60,60,67,0.12))"
                    : "none",
                }}>
                  <FormField field={field} values={values} setValues={setValues} errors={errors} world={parentCtx.world} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ field, values, setValues, errors, world }) {
  let control = mapFieldTypeToControl(field.type);
  let options = field.options;

  // entityRef → select с options из world. Поле fooId → коллекция foos.
  if (field.type === "entityRef" && !options && world) {
    control = "select";
    const refName = field.name.replace(/Id$/, "").toLowerCase();
    const collName = refName.endsWith("y") ? refName.slice(0, -1) + "ies"
      : refName.endsWith("s") ? refName + "es" : refName + "s";
    const items = world[collName] || [];
    options = items.map(it => ({
      value: it.id,
      label: it.name || it.title || it.id,
    }));
  }

  return (
    <div style={{ marginBottom: 0 }}>
      <ParameterControl
        spec={{
          name: field.name,
          label: field.label || field.name,
          control,
          required: field.required,
          options,
        }}
        value={values[field.name]}
        onChange={v => setValues(p => ({ ...p, [field.name]: v }))}
        error={errors[field.name]}
      />
    </div>
  );
}

function mapFieldTypeToControl(type) {
  const map = {
    text: "text",
    textarea: "textarea",
    datetime: "datetime",
    date: "datetime",
    image: "image",
    multiImage: "multiImage",
    file: "file",
    email: "email",
    tel: "tel",
    url: "url",
    number: "number",
    enum: "select",
    id: "text",
  };
  return map[type] || "text";
}

function pluralize(word) {
  if (!word) return word;
  if (word.endsWith("y")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s")) return word + "es";
  return word + "s";
}
