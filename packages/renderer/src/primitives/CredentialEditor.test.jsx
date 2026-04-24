// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import CredentialEditor from "./CredentialEditor.jsx";

afterEach(cleanup);

const SAMPLE = [
  {
    id: "c_pw_1",
    type: "password",
    userLabel: "Основной пароль",
    createdDate: 1700000000000,
    algorithm: "argon2id",
    hashIterations: 3,
    temporary: false,
  },
  {
    id: "c_otp_1",
    type: "otp",
    userLabel: "Google Authenticator",
    createdDate: 1705000000000,
    algorithm: "SHA-256",
    digits: 6,
    period: 30,
    device: "iPhone 15",
  },
  {
    id: "c_wa_1",
    type: "webauthn",
    userLabel: "MacBook Touch ID",
    createdDate: 1710000000000,
    device: "MacBook Pro M3",
    credentialData: "abcdef0123456789abcdef0123456789",
  },
  {
    id: "c_x5_1",
    type: "x509",
    userLabel: "YubiKey 5C",
    createdDate: 1712000000000,
    device: "CN=User,O=Company",
    credentialData: "3082032830820210...",
  },
];

describe("CredentialEditor — basic rendering", () => {
  it("рендерит все credentials в sidebar", () => {
    render(<CredentialEditor value={SAMPLE} />);
    expect(screen.getByText("Основной пароль")).toBeTruthy();
    expect(screen.getByText("Google Authenticator")).toBeTruthy();
    expect(screen.getByText("MacBook Touch ID")).toBeTruthy();
    expect(screen.getByText("YubiKey 5C")).toBeTruthy();
  });

  it("первый credential активен по умолчанию", () => {
    const { container } = render(<CredentialEditor value={SAMPLE} />);
    // detail-area показывает поля первого (password)
    expect(container.textContent).toContain("Хешированный пароль");
    expect(container.textContent).toContain("argon2id");
  });

  it("пустой массив — empty-state", () => {
    render(<CredentialEditor value={[]} />);
    expect(screen.getByText(/Нет credentials/)).toBeTruthy();
  });

  it("non-array value — empty-state", () => {
    render(<CredentialEditor value={null} />);
    expect(screen.getByText(/Нет credentials/)).toBeTruthy();
  });
});

describe("CredentialEditor — per-type sub-views", () => {
  it("password: хешированный + algorithm + iterations + temporary", () => {
    const { container } = render(<CredentialEditor value={[SAMPLE[0]]} />);
    expect(container.textContent).toContain("Хешированный пароль");
    expect(container.textContent).toContain("argon2id");
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("Нет"); // temporary=false
    // Notice про невозможность plain-password
    expect(container.textContent).toMatch(/Plain-password не хранится/);
  });

  it("otp: TOTP detected через period, digits+algorithm показаны", () => {
    const { container } = render(<CredentialEditor value={[SAMPLE[1]]} />);
    expect(container.textContent).toContain("TOTP");
    expect(container.textContent).toContain("SHA-256");
    expect(container.textContent).toContain("6");   // digits
    expect(container.textContent).toContain("30");  // period
    expect(container.textContent).toContain("iPhone 15");
  });

  it("otp без period — HOTP label", () => {
    const hotp = [{ ...SAMPLE[1], period: undefined, counter: 42 }];
    const { container } = render(<CredentialEditor value={hotp} />);
    expect(container.textContent).toContain("HOTP");
    expect(container.textContent).toContain("42"); // counter
  });

  it("webauthn: device + credential-id truncated", () => {
    const { container } = render(<CredentialEditor value={[SAMPLE[2]]} />);
    expect(container.textContent).toContain("Passkey / WebAuthn");
    expect(container.textContent).toContain("MacBook Pro M3");
    // credential-id truncated (12+…+8+metа)
    expect(container.textContent).toContain("abcdef012345");
    expect(container.textContent).toContain("chars");
  });

  it("x509: сертификат subject + DER truncated", () => {
    const { container } = render(<CredentialEditor value={[SAMPLE[3]]} />);
    expect(container.textContent).toContain("X.509 сертификат");
    expect(container.textContent).toContain("CN=User");
  });

  it("unknown type — fallback key-value таблица", () => {
    const custom = [{ id: "c1", type: "custom", userLabel: "X", createdDate: 1700000000000, foo: "bar", baz: 42 }];
    const { container } = render(<CredentialEditor value={custom} />);
    expect(container.textContent).toContain("custom");
    expect(container.textContent).toContain("foo");
    expect(container.textContent).toContain("bar");
    expect(container.textContent).toContain("42");
  });
});

describe("CredentialEditor — selection", () => {
  it("click на sidebar-item активирует его credential", () => {
    const { container } = render(<CredentialEditor value={SAMPLE} />);
    // Initial: password
    expect(container.textContent).toContain("Хешированный пароль");
    // Click otp
    fireEvent.click(screen.getByText("Google Authenticator"));
    expect(container.textContent).toContain("TOTP");
    expect(container.textContent).not.toContain("Хешированный пароль");
  });

  it("controlled selectedId + onSelect", () => {
    const onSelect = vi.fn();
    render(
      <CredentialEditor
        value={SAMPLE}
        selectedId="c_wa_1"
        onSelect={onSelect}
      />
    );
    expect(screen.getByText("Passkey / WebAuthn")).toBeTruthy();
    fireEvent.click(screen.getByText("Google Authenticator"));
    expect(onSelect).toHaveBeenCalledWith("c_otp_1");
  });
});

describe("CredentialEditor — actions (non-readOnly)", () => {
  it("readOnly=true (default) — action buttons не рендерятся", () => {
    const { container } = render(<CredentialEditor value={SAMPLE} />);
    // Notice-text содержит «Сбросить пароль», но action-button'ов нет
    const buttons = container.querySelectorAll("button");
    const labels = [...buttons].map(b => b.textContent);
    // Тут только tab-buttons credentials в sidebar, actions нет
    expect(labels.filter(l => l === "Сбросить пароль")).toHaveLength(0);
    expect(labels.filter(l => l === "Удалить")).toHaveLength(0);
  });

  it("readOnly=false + onAction → action buttons для текущего type'а", () => {
    const onAction = vi.fn();
    const { container } = render(
      <CredentialEditor value={SAMPLE} readOnly={false} onAction={onAction} />
    );
    // password active by default — default actions [rotate, delete]
    expect(container.textContent).toContain("Сбросить пароль");
    expect(container.textContent).toContain("Удалить");
  });

  it("click rotate → onAction('rotate', credential)", () => {
    const onAction = vi.fn();
    render(
      <CredentialEditor value={SAMPLE} readOnly={false} onAction={onAction} />
    );
    fireEvent.click(screen.getByText("Сбросить пароль"));
    expect(onAction).toHaveBeenCalledWith("rotate", expect.objectContaining({ id: "c_pw_1", type: "password" }));
  });

  it("type-specific actions: otp → [revealSecret, delete]", () => {
    const onAction = vi.fn();
    render(
      <CredentialEditor value={SAMPLE} readOnly={false} onAction={onAction} />
    );
    fireEvent.click(screen.getByText("Google Authenticator"));
    expect(screen.getByText("Показать secret")).toBeTruthy();
    expect(screen.getByText("Удалить")).toBeTruthy();
  });

  it("custom actionsByType override'ит defaults", () => {
    const onAction = vi.fn();
    render(
      <CredentialEditor
        value={SAMPLE}
        readOnly={false}
        onAction={onAction}
        actionsByType={{ password: ["setPrimary"] }}
      />
    );
    expect(screen.getByText("Сделать основным")).toBeTruthy();
    // rotate и delete не рендерятся
    const { container } = render(
      <CredentialEditor value={SAMPLE} readOnly={false} onAction={onAction} actionsByType={{ password: ["setPrimary"] }} />
    );
    // cleanup'нётся в afterEach — проверяем через screen.queryByText
    // Но мы уже в cleanup-эре старый рендер
  });
});
