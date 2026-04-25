import type { ComponentType } from "react";

export type HeaderSlotName =
  | "primary"
  | "secondary"
  | "search"
  | "notifications"
  | "user-menu"
  | "breadcrumbs"
  | "context-actions";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string | ComponentType<{ size?: number }>;
  visible?: boolean | (() => boolean);
  badge?: string | number;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  label?: string;
  order?: number;
  items: NavItem[];
}

export interface RouteConfig {
  path: string;
  component?: ComponentType<unknown>;
  beforeLoad?: () => void | Promise<void>;
  validateSearch?: (search: unknown) => unknown;
  search?: Record<string, unknown>;
}

export interface CommandConfig {
  id: string;
  label: string;
  description?: string;
  hotkey?: string;
  group?: string;
  run: () => void | Promise<void>;
}

export interface LoadingTipConfig {
  id: string;
  text: string;
  weight?: number;
}

export interface DocLink {
  id: string;
  label: string;
  href: string;
  description?: string;
}

export interface AppModuleManifest {
  id: string;
  name?: string;
  basePath: string;
  version?: string;
  navSections: NavSection[];
  routes: RouteConfig[];
  settingsPanel?: ComponentType<unknown>;
  headerSlots?: Partial<Record<HeaderSlotName, ComponentType<unknown>>>;
  commands?: CommandConfig[];
  loadingTips?: LoadingTipConfig[];
  docs?: DocLink[];
}

export interface AuthAPI {
  token: string | null;
  user: { id: string; email?: string; roles?: string[] } | null;
  onTokenRefresh?: (listener: (token: string | null) => void) => () => void;
}

export interface I18nInstance {
  t: (key: string, params?: Record<string, unknown>) => string;
  language: string;
  changeLanguage?: (lang: string) => void | Promise<void>;
}

export interface ThemeAPI {
  current: string;
  available?: string[];
  onChange?: (listener: (theme: string) => void) => () => void;
  setTheme?: (theme: string) => void;
}

export interface ToastAPI {
  show: (input: { kind?: "info" | "success" | "warning" | "error"; text: string; duration?: number }) => void;
  dismiss?: (id?: string) => void;
}

export interface EventBus {
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, listener: (payload?: unknown) => void) => () => void;
  off?: (event: string, listener: (payload?: unknown) => void) => void;
}

export interface ShellContext {
  auth: AuthAPI;
  i18n: I18nInstance;
  theme: ThemeAPI;
  navigate: (path: string) => void;
  events: EventBus;
  toast: ToastAPI;
  setHeaderSlot?: (slot: HeaderSlotName, component: ComponentType<unknown> | null) => void;
  clearHeaderSlot?: (slot: HeaderSlotName) => void;
  registerCommands?: (commands: CommandConfig[]) => () => void;
  env?: Record<string, string | undefined>;
  permissions?: { has: (permission: string) => boolean; list: () => string[] };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateModuleManifest(manifest: unknown): ValidationResult;
export function mergeNavSections(...sectionsLists: NavSection[][]): NavSection[];
export const HEADER_SLOTS: readonly HeaderSlotName[];
