import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { AuthForm } from "./AuthForm.jsx";

afterEach(cleanup);

describe("AuthForm primitive (backlog 3.5)", () => {
  it("mode=login — рендерит заголовок «Вход» + 2 поля", () => {
    render(<AuthForm mode="login" onSubmit={() => {}} />);
    expect(screen.getByText("Вход")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Пароль")).toBeTruthy();
  });

  it("mode=register — добавляет confirm-поле", () => {
    render(<AuthForm mode="register" onSubmit={() => {}} />);
    expect(screen.getByText("Регистрация")).toBeTruthy();
    expect(screen.getByText("Повторите пароль")).toBeTruthy();
  });

  it("mode=both — есть переключатель login/register", () => {
    render(<AuthForm mode="both" onSubmit={() => {}} />);
    expect(screen.getByText("Создать аккаунт")).toBeTruthy();
  });

  it("onSubmit получает {email, password, mode}", () => {
    const onSubmit = vi.fn();
    const { container } = render(<AuthForm mode="login" onSubmit={onSubmit} />);
    const emailInput = container.querySelector('input[type="email"]');
    const passwordInput = container.querySelector('input[type="password"]');
    fireEvent.change(emailInput, { target: { value: "u@e.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });
    const submitBtn = container.querySelector('button[type="submit"]');
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith({
      email: "u@e.com",
      password: "secret",
      mode: "login",
    });
  });

  it("register: password !== confirm → не вызывает onSubmit", () => {
    const onSubmit = vi.fn();
    const { container } = render(<AuthForm mode="register" onSubmit={onSubmit} />);
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "u@e.com" } });
    fireEvent.change(inputs[1], { target: { value: "abc" } });
    fireEvent.change(inputs[2], { target: { value: "xyz" } });
    fireEvent.click(container.querySelector('button[type="submit"]'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("error prop отображается как alert", () => {
    render(<AuthForm mode="login" onSubmit={() => {}} error="Неверный пароль" />);
    expect(screen.getByRole("alert").textContent).toContain("Неверный пароль");
  });

  it("busy=true блокирует submit-кнопку", () => {
    const { container } = render(<AuthForm mode="login" onSubmit={() => {}} busy />);
    expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  });
});
