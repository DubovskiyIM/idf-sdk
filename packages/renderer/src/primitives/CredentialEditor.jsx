import { useMemo, useState } from "react";

/**
 * CredentialEditor — multi-kind credential viewer/editor (P-K-C Keycloak).
 *
 * Discriminator-driven primitive: каждый credential имеет `type`
 * (password / otp / webauthn / x509 / ...). По type выбирается sub-view
 * с type-specific полями (rotate-password / TOTP QR / WebAuthn device /
 * X509 cert subject).
 *
 * Shape (`value`):
 *   [
 *     { id, type: "password", userLabel, createdDate, algorithm?, hashIterations? },
 *     { id, type: "otp", userLabel, createdDate, digits, period, algorithm, counter? },
 *     { id, type: "webauthn", userLabel, createdDate, device, credentialData? },
 *     { id, type: "x509", userLabel, createdDate, credentialData? },
 *     { id, type: "<custom>", ... }
 *   ]
 *
 * Props:
 *   - value — массив credentials
 *   - selectedId? — controlled выбор активной credential
 *   - onSelect?(id) — notify выбора
 *   - onAction?(action, credential) — actions: "rotate" / "delete" /
 *     "setPrimary" / "revealSecret". Host обрабатывает через intent.exec.
 *   - readOnly (default true) — v1 только view + actions. inline-edit — future.
 *   - actionsByType? — map type → enabled action-keys (default:
 *     password→[rotate,delete], otp→[delete,revealSecret], webauthn→[delete],
 *     x509→[delete])
 *
 * Use-cases: Keycloak User.credentials, AWS IAM access-keys, SSH-keys.
 */

const DEFAULT_ACTIONS_BY_TYPE = {
  password: ["rotate", "delete"],
  otp: ["revealSecret", "delete"],
  webauthn: ["delete"],
  x509: ["delete"],
};

const TYPE_LABELS = {
  password: "Пароль",
  otp: "OTP / TOTP",
  webauthn: "WebAuthn / Passkey",
  x509: "X.509 сертификат",
};

const TYPE_ICONS = {
  password: "🔑",
  otp: "📱",
  webauthn: "🔐",
  x509: "📜",
};

const ACTION_LABELS = {
  rotate: "Сбросить пароль",
  delete: "Удалить",
  setPrimary: "Сделать основным",
  revealSecret: "Показать secret",
};

export default function CredentialEditor({
  value,
  selectedId,
  onSelect,
  onAction,
  readOnly = true,
  actionsByType = DEFAULT_ACTIONS_BY_TYPE,
}) {
  const credentials = useMemo(
    () => (Array.isArray(value) ? value.filter(c => c && typeof c === "object") : []),
    [value],
  );
  const [internalSelected, setInternalSelected] = useState(credentials[0]?.id || null);
  const activeId = selectedId !== undefined ? selectedId : internalSelected;
  const active = useMemo(
    () => credentials.find(c => c.id === activeId) || credentials[0] || null,
    [credentials, activeId],
  );

  const handleSelect = (id) => {
    if (onSelect) onSelect(id);
    else setInternalSelected(id);
  };

  if (credentials.length === 0) {
    return (
      <div style={emptyStyle}>
        Нет credentials. Добавьте через Reset / Setup.
      </div>
    );
  }

  const actions = active ? (actionsByType[active.type] || []) : [];

  return (
    <div style={rootStyle}>
      <aside style={listStyle} role="tablist" aria-label="Credentials">
        {credentials.map(c => {
          const isActive = c.id === active?.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelect(c.id)}
              style={listItemStyle(isActive)}
            >
              <span style={{ fontSize: 16 }}>{TYPE_ICONS[c.type] || "🔒"}</span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1, minWidth: 0 }}>
                <span style={listLabelStyle}>
                  {c.userLabel || TYPE_LABELS[c.type] || c.type || "credential"}
                </span>
                <span style={listTypeStyle}>
                  {TYPE_LABELS[c.type] || c.type}
                </span>
              </span>
            </button>
          );
        })}
      </aside>

      <div style={detailStyle}>
        {active ? (
          <>
            <div style={detailHeaderStyle}>
              <div>
                <div style={detailTitleStyle}>
                  {TYPE_ICONS[active.type] || "🔒"} {active.userLabel || TYPE_LABELS[active.type] || active.type}
                </div>
                {active.createdDate && (
                  <div style={detailMetaStyle}>
                    Создан: {formatDate(active.createdDate)}
                  </div>
                )}
              </div>
              {!readOnly && actions.length > 0 && onAction && (
                <div style={{ display: "flex", gap: 6 }}>
                  {actions.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onAction(a, active)}
                      style={a === "delete" ? actionDangerStyle : actionStyle}
                    >
                      {ACTION_LABELS[a] || a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <TypeView credential={active} />
          </>
        ) : (
          <div style={emptyStyle}>Выберите credential</div>
        )}
      </div>
    </div>
  );
}

/**
 * TypeView — per-type sub-renderer. Показывает type-specific поля.
 * Password → hashed storage + algorithm (read-only, никогда не показываем plain).
 * OTP → digits/period/algorithm + counter (для HOTP).
 * WebAuthn → device + credential-id хеш.
 * X509 → certificate subject / issuer / notAfter (parsed из credentialData).
 * Unknown type → fallback таблица ключ-значение.
 */
function TypeView({ credential: c }) {
  if (c.type === "password") {
    return (
      <div style={rowsStyle}>
        <KV label="Тип" value="Хешированный пароль" />
        <KV label="Алгоритм" value={c.algorithm || "—"} />
        <KV label="Итерации" value={c.hashIterations ? String(c.hashIterations) : "—"} />
        <KV label="Временный" value={c.temporary ? "Да" : "Нет"} />
        <div style={noticeStyle}>
          🛡 Plain-password не хранится. Для смены — действие «Сбросить пароль».
        </div>
      </div>
    );
  }
  if (c.type === "otp") {
    return (
      <div style={rowsStyle}>
        <KV label="Тип" value={c.period ? "TOTP" : "HOTP"} />
        <KV label="Алгоритм" value={c.algorithm || "—"} />
        <KV label="Digits" value={c.digits ? String(c.digits) : "6"} />
        <KV label="Period (s)" value={c.period ? String(c.period) : "—"} />
        {c.counter != null && <KV label="Counter (HOTP)" value={String(c.counter)} />}
        {c.device && <KV label="Устройство" value={c.device} />}
        <div style={noticeStyle}>
          🔒 Secret seed хранится зашифрованным. «Показать secret» → одноразовое раскрытие для re-provisioning.
        </div>
      </div>
    );
  }
  if (c.type === "webauthn") {
    return (
      <div style={rowsStyle}>
        <KV label="Тип" value="Passkey / WebAuthn" />
        {c.device && <KV label="Устройство" value={c.device} />}
        {c.credentialData && <KV label="Credential ID" value={truncateHash(c.credentialData)} monospace />}
      </div>
    );
  }
  if (c.type === "x509") {
    return (
      <div style={rowsStyle}>
        <KV label="Тип" value="X.509 сертификат" />
        {c.device && <KV label="Subject" value={c.device} />}
        {c.credentialData && <KV label="Certificate (DER)" value={truncateHash(c.credentialData)} monospace />}
      </div>
    );
  }
  // Fallback: unknown type, показываем всё что есть
  return (
    <div style={rowsStyle}>
      <KV label="Тип" value={c.type || "unknown"} />
      {Object.entries(c)
        .filter(([k]) => !["id", "type", "userLabel", "createdDate"].includes(k))
        .slice(0, 10)
        .map(([k, v]) => (
          <KV key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
        ))}
    </div>
  );
}

function KV({ label, value, monospace }) {
  return (
    <div style={kvRowStyle}>
      <span style={kvLabelStyle}>{label}</span>
      <span style={monospace ? kvValueMonoStyle : kvValueStyle}>{value}</span>
    </div>
  );
}

function truncateHash(s) {
  if (typeof s !== "string") return String(s);
  if (s.length <= 24) return s;
  return `${s.slice(0, 12)}…${s.slice(-8)} (${s.length} chars)`;
}

function formatDate(d) {
  if (typeof d === "number") return new Date(d).toLocaleDateString("ru-RU");
  if (typeof d === "string") {
    const ts = Date.parse(d);
    return isNaN(ts) ? d : new Date(ts).toLocaleDateString("ru-RU");
  }
  return String(d);
}

const rootStyle = {
  display: "flex",
  gap: 12,
  minHeight: 240,
  border: "1px solid var(--idf-border, #e5e7eb)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--idf-card, #ffffff)",
};
const listStyle = {
  display: "flex",
  flexDirection: "column",
  width: 220,
  flexShrink: 0,
  borderRight: "1px solid var(--idf-border, #e5e7eb)",
  background: "var(--idf-surface-soft, #f9fafb)",
};
const listItemStyle = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  border: "none",
  background: active ? "var(--idf-accent-light, #eef5ff)" : "transparent",
  borderLeft: `3px solid ${active ? "var(--idf-accent, #1677ff)" : "transparent"}`,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 13,
});
const listLabelStyle = {
  fontWeight: 600,
  color: "var(--idf-text, #1a1a2e)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 170,
};
const listTypeStyle = {
  fontSize: 10,
  color: "var(--idf-text-muted, #6b7280)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
};
const detailStyle = {
  flex: 1,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
};
const detailHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid var(--idf-border-subtle, #f3f4f6)",
  paddingBottom: 10,
};
const detailTitleStyle = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--idf-text, #1a1a2e)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const detailMetaStyle = {
  fontSize: 11,
  color: "var(--idf-text-muted, #6b7280)",
  marginTop: 4,
};
const rowsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const kvRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "4px 0",
  borderBottom: "1px dotted var(--idf-border-subtle, #f3f4f6)",
  fontSize: 13,
};
const kvLabelStyle = {
  color: "var(--idf-text-muted, #6b7280)",
  fontWeight: 500,
};
const kvValueStyle = {
  color: "var(--idf-text, #1a1a2e)",
  textAlign: "right",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const kvValueMonoStyle = {
  ...{
    color: "var(--idf-text, #1a1a2e)",
    textAlign: "right",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 11,
};
const noticeStyle = {
  padding: "8px 10px",
  background: "var(--idf-bg-subtle, #f3f4f6)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--idf-text-muted, #6b7280)",
  marginTop: 4,
};
const actionStyle = {
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 500,
  border: "1px solid var(--idf-border, #d1d5db)",
  borderRadius: 5,
  background: "var(--idf-card, #ffffff)",
  cursor: "pointer",
};
const actionDangerStyle = {
  ...{
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 5,
    cursor: "pointer",
  },
  border: "1px solid #fca5a5",
  background: "#fef2f2",
  color: "#b91c1c",
};
const emptyStyle = {
  padding: "24px 16px",
  color: "var(--idf-text-muted, #9ca3af)",
  fontSize: 13,
  fontStyle: "italic",
  textAlign: "center",
};
