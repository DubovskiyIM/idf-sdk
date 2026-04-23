/**
 * jsdom polyfills для AntD v6 компонентов. AntD использует matchMedia
 * для responsive breakpoints и getComputedStyle для scrollbar-size.
 * Без stub'ов Table / Steps / Grid падают при render() в jsdom.
 *
 * Импортируется через vitest `setupFiles` в vitest.config.js.
 */

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// matchMedia — для antd/lib/_util/responsiveObserver.js
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},     // deprecated API — оставлен для legacy callers
    removeListener: () => {},  // deprecated API
    onchange: null,
    dispatchEvent: () => false,
  });
}

// getComputedStyle — jsdom возвращает стаб, но AntD Table через
// rc-component util вызывает его на pseudo-elements → падает с
// "Not implemented". Wrap'аем чтобы pseudo-elements возвращали пустой
// CSSStyleDeclaration-like объект.
if (typeof window !== "undefined") {
  const original = window.getComputedStyle;
  window.getComputedStyle = function wrappedGetComputedStyle(elt, pseudoElt) {
    try {
      return original.call(this, elt, pseudoElt);
    } catch (err) {
      // fallback — минимальный stub через прокси поверх пустого объекта
      return new Proxy({}, {
        get(target, prop) {
          if (prop === "getPropertyValue") return () => "";
          if (prop === Symbol.iterator) return function*() {};
          return "";
        },
      });
    }
  };
}

// ResizeObserver — AntD Select/Table иногда используют (для auto-width).
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Автоматический cleanup между тестами — чтобы элементы не накапливались
// в document.body (AntD Popover/Modal используют portals).
afterEach(() => {
  cleanup();
});
