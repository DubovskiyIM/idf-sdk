/**
 * AuthForm primitive (backlog 3.5).
 *
 * Shared UI для логина/регистрации, читающий IDF Token Bridge (--idf-*).
 * Позволяет host-приложениям (idf/, standalone/) не дублировать AuthGate.
 *
 * Контракт:
 *   <AuthForm
 *     mode="login" | "register" | "both"
 *     onSubmit={({ email, password, confirm }) => Promise<void>}
 *     error={string?}
 *     busy={boolean?}
 *     title={string?}
 *   />
 *
 * Адаптер-агностичный: использует getAdaptedComponent для text/email/
 * password-инпутов и button.primary. Если адаптер не выставлен,
 * делает plain HTML с --idf-* токенами.
 */
import { useState, useMemo } from "react";
import { getAdaptedComponent } from "../adapters/registry.js";

const TOKEN_BG = "var(--idf-surface, #fff)";
const TOKEN_BORDER = "var(--idf-border, #e5e7eb)";
const TOKEN_TEXT = "var(--idf-text, #111)";
const TOKEN_ACCENT = "var(--idf-accent, #6366f1)";
const TOKEN_MUTED = "var(--idf-text-muted, #6b7280)";

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: TOKEN_MUTED }}>{label}</span>
      {children}
    </label>
  );
}

function FallbackInput({ type = "text", value, onChange, required, autoComplete }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      autoComplete={autoComplete}
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        border: `1px solid ${TOKEN_BORDER}`,
        background: TOKEN_BG,
        color: TOKEN_TEXT,
        fontSize: 14,
      }}
    />
  );
}

export function AuthForm({
  mode: initialMode = "both",
  onSubmit,
  error,
  busy,
  title,
}) {
  const [mode, setMode] = useState(initialMode === "both" ? "login" : initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const AdaptedPrimary = getAdaptedComponent("button", "primary");
  const AdaptedText = getAdaptedComponent("parameter", "email");
  const AdaptedInput = getAdaptedComponent("parameter", "text");

  const canSwitchMode = initialMode === "both";
  const isRegister = mode === "register";

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!onSubmit) return;
    if (isRegister && password !== confirm) return;
    onSubmit({ email, password, ...(isRegister ? { confirm } : {}), mode });
  };

  const heading = title || (isRegister ? "Регистрация" : "Вход");

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 24,
        maxWidth: 380,
        width: "100%",
        background: TOKEN_BG,
        border: `1px solid ${TOKEN_BORDER}`,
        borderRadius: 10,
        color: TOKEN_TEXT,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, color: TOKEN_TEXT }}>{heading}</h2>

      <Field label="Email">
        {AdaptedText ? (
          <AdaptedText
            spec={{ name: "email", type: "email" }}
            value={email}
            onChange={setEmail}
          />
        ) : (
          <FallbackInput type="email" value={email} onChange={setEmail} required autoComplete="email" />
        )}
      </Field>

      <Field label="Пароль">
        {AdaptedInput ? (
          <AdaptedInput
            spec={{ name: "password", type: "text", control: "password" }}
            value={password}
            onChange={setPassword}
          />
        ) : (
          <FallbackInput
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        )}
      </Field>

      {isRegister && (
        <Field label="Повторите пароль">
          <FallbackInput
            type="password"
            value={confirm}
            onChange={setConfirm}
            required
            autoComplete="new-password"
          />
        </Field>
      )}

      {error && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            background: "var(--idf-danger-bg, #fee2e2)",
            color: "var(--idf-danger, #b91c1c)",
            fontSize: 13,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {AdaptedPrimary ? (
        <AdaptedPrimary onClick={handleSubmit} disabled={busy}>
          {busy ? "…" : isRegister ? "Создать аккаунт" : "Войти"}
        </AdaptedPrimary>
      ) : (
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            border: "none",
            background: TOKEN_ACCENT,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "…" : isRegister ? "Создать аккаунт" : "Войти"}
        </button>
      )}

      {canSwitchMode && (
        <button
          type="button"
          onClick={() => setMode(isRegister ? "login" : "register")}
          style={{
            background: "none",
            border: "none",
            color: TOKEN_ACCENT,
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
            alignSelf: "flex-start",
          }}
        >
          {isRegister ? "У меня уже есть аккаунт" : "Создать аккаунт"}
        </button>
      )}
    </form>
  );
}
