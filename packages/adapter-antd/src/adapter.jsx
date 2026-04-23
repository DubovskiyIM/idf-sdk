/**
 * Ant Design UI-адаптер (§17 манифеста — адаптивный слой).
 *
 * Fintech-ориентированный адаптер для домена invest (4-й адаптер после
 * Mantine, shadcn, Apple visionOS-glass). Родной для enterprise/банкинга:
 * Statistic, ProTable, @ant-design/charts. Регистрируется через
 * registerUIAdapter(antdAdapter) + оборачивается ConfigProvider'ом.
 *
 * Категории:
 *   - parameter / button / shell / primitive / icon (как у остальных)
 *   - chart (НОВАЯ): первая категория primitive, выходящая за
 *     текст/картинка/контейнер. Декларативный spec проекции → AntD Charts.
 */

import {
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Button as AntButton,
  Modal,
  Tabs,
  Typography,
  Tag,
  Avatar,
  Card,
  Dropdown,
  Statistic,
  Menu,
  Breadcrumb as AntBreadcrumb,
  Table as AntTable,
  Steps as AntSteps,
  Popover as AntPopover,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
  PaperClipOutlined,
  AudioOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  PushpinOutlined,
  CopyOutlined,
  TranslationOutlined,
  BellOutlined,
  PhoneOutlined,
  SearchOutlined,
  MoreOutlined,
  SwapOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  NotificationOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  KeyOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  SaveOutlined,
  LinkOutlined,
  ScissorOutlined,
  DragOutlined,
  MessageOutlined,
  WarningOutlined,
  StopFilled,
  StarOutlined,
  FilterOutlined,
  DownloadOutlined,
  UploadOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  PieChartOutlined,
  FundOutlined,
  StockOutlined,
  WalletOutlined,
  BankOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Icon, labels } from "@intent-driven/renderer";
import { AntdChart, AntdSparkline } from "./charts.jsx";

const { humanLabel } = labels;
const { Title, Text } = Typography;

// ============================================================
// Icon map: emoji → AntD icon component
// ============================================================

const EMOJI_TO_ANTD = {
  "✎": EditOutlined,
  "🗑": DeleteOutlined,
  "➕": PlusOutlined,
  "+": PlusOutlined,
  "✓": CheckOutlined,
  "✕": CloseOutlined,
  "×": CloseOutlined,
  "📤": SendOutlined,
  "📎": PaperClipOutlined,
  "🎤": AudioOutlined,
  "🎙": AudioOutlined,
  "🖼": PictureOutlined,
  "🎬": VideoCameraOutlined,
  "📍": EnvironmentOutlined,
  "📌": PushpinOutlined,
  "🗳": CheckOutlined,
  "↗": SendOutlined,
  "⭐": StarOutlined,
  "☆": StarOutlined,
  "⎘": CopyOutlined,
  "🌐": TranslationOutlined,
  "🔇": BellOutlined,
  "🔔": BellOutlined,
  "📞": PhoneOutlined,
  "📹": VideoCameraOutlined,
  "📵": PhoneOutlined,
  "🔍": SearchOutlined,
  "⋯": MoreOutlined,
  "…": MoreOutlined,
  "⇅": SwapOutlined,
  "⚙": SettingOutlined,
  "👤": UserOutlined,
  "👥": TeamOutlined,
  "📢": NotificationOutlined,
  "✉": SendOutlined,
  "⬆": ArrowUpOutlined,
  "⬇": ArrowDownOutlined,
  "🔑": KeyOutlined,
  "🚪": LogoutOutlined,
  "←": LogoutOutlined,
  "→": LogoutOutlined,
  "ℹ": InfoCircleOutlined,
  "⚡": ThunderboltOutlined,
  "●": EyeOutlined,
  "💬": MessageOutlined,
  "🔒": LockOutlined,
  "💡": BulbOutlined,
  "⏰": ClockCircleOutlined,
  "🔄": ReloadOutlined,
  "▶": PlayCircleOutlined,
  "⏸": PauseCircleOutlined,
  "⏹": StopOutlined,
  "💾": SaveOutlined,
  "🔗": LinkOutlined,
  "✂": ScissorOutlined,
  "✥": DragOutlined,
  "🚫": StopFilled,
  "⚠": WarningOutlined,
  "📦": WalletOutlined,
  "🔥": ThunderboltOutlined,
  "📊": LineChartOutlined,
  "📈": RiseOutlined,
  "📉": FallOutlined,
  "💰": DollarOutlined,
  "💵": DollarOutlined,
  "🥧": PieChartOutlined,
  "🏦": BankOutlined,
  "💼": FundOutlined,
  "🕯": StockOutlined,
  "👁": EyeOutlined,
  "🙈": EyeInvisibleOutlined,
  "🗂": FilterOutlined,
  "📥": DownloadOutlined,
};

function resolveAntdIcon(emoji) {
  return EMOJI_TO_ANTD[emoji] || null;
}

// Normalize: emoji-string → React node (для leftSection кнопок)
function normalizeIcon(icon) {
  if (!icon) return undefined;
  if (typeof icon === "string") return <Icon emoji={icon} size={14} />;
  return icon;
}

// ============================================================
// Parameter controls
// ============================================================

function labelWrap(label, children) {
  if (!label) return children;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, color: "rgba(0,0,0,0.65)" }}>{label}</label>
      {children}
    </div>
  );
}

function AntdTextInput({ spec, value, onChange, error }) {
  return labelWrap(
    humanLabel(spec.name, spec.label),
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={spec.placeholder}
      status={error ? "error" : undefined}
      maxLength={spec.maxLength}
      minLength={spec.minLength}
      pattern={spec.pattern}
    />
  );
}

function AntdEmail({ spec, value, onChange, error }) {
  return labelWrap(
    humanLabel(spec.name, spec.label),
    <Input
      type="email"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={spec.placeholder || "name@example.com"}
      status={error ? "error" : undefined}
    />
  );
}

function AntdUrl({ spec, value, onChange, error }) {
  return labelWrap(
    humanLabel(spec.name, spec.label),
    <Input
      type="url"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={spec.placeholder}
      status={error ? "error" : undefined}
    />
  );
}

function AntdTel({ spec, value, onChange, error }) {
  return labelWrap(
    humanLabel(spec.name, spec.label),
    <Input
      type="tel"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={spec.placeholder}
      status={error ? "error" : undefined}
    />
  );
}

function AntdTextarea({ spec, value, onChange, error }) {
  return labelWrap(
    humanLabel(spec.name, spec.label),
    <Input.TextArea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={spec.placeholder}
      autoSize={{ minRows: 2, maxRows: 6 }}
      status={error ? "error" : undefined}
    />
  );
}

function AntdNumber({ spec, value, onChange, error }) {
  // Финансовый number: форматтер по fieldRole. SDK inferFieldRole маппит
  // money → "price" (для PriceBlock primitive), поэтому принимаем оба.
  const isMoney =
    spec.fieldRole === "money" ||
    spec.fieldRole === "price" ||
    /price|amount|cost|fee|value/i.test(spec.name || "");
  const isPct = spec.fieldRole === "percentage" || /percent|rate|allocation/i.test(spec.name || "");

  return labelWrap(
    humanLabel(spec.name, spec.label),
    <InputNumber
      value={value === "" || value == null ? null : value}
      onChange={(v) => onChange(v == null ? "" : v)}
      placeholder={spec.placeholder}
      status={error ? "error" : undefined}
      style={{ width: "100%" }}
      prefix={isMoney ? "₽" : undefined}
      suffix={isPct ? "%" : undefined}
      formatter={isMoney ? (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : undefined}
      parser={isMoney ? (v) => v?.replace(/\s/g, "") : undefined}
    />
  );
}

function AntdDateTime({ spec, value, onChange, error }) {
  const name = spec.name || "";
  const label = humanLabel(name, spec.label);
  const isTimeOnly = /time/i.test(name) && !/date/i.test(name);

  if (isTimeOnly) {
    return labelWrap(
      label,
      <TimePicker
        value={value ? dayjs(value, "HH:mm") : null}
        onChange={(v) => onChange(v ? v.format("HH:mm") : "")}
        format="HH:mm"
        style={{ width: "100%" }}
        status={error ? "error" : undefined}
      />
    );
  }

  // Авто-детекция «нужно ли время»:
  //   - spec.withTime === true
  //   - spec.precision ∈ {"minute","second"}
  //   - spec.control === "datetime-local"
  //   - type === "datetime" по ontology (через fieldRole="timestamp" или kind)
  // Без этих сигналов остаёмся на date-only — чтобы не регрессить birthDate etc.
  const wantsTime =
    spec.withTime === true ||
    spec.precision === "minute" ||
    spec.precision === "second" ||
    spec.control === "datetime-local";

  const showTime = wantsTime ? { minuteStep: 5, format: "HH:mm" } : false;
  const format = wantsTime ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY";
  const outFormat = wantsTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD";

  return labelWrap(
    label,
    <DatePicker
      value={value ? dayjs(value) : null}
      onChange={(v) => onChange(v ? v.format(outFormat) : "")}
      showTime={showTime}
      format={format}
      style={{ width: "100%" }}
      placeholder={wantsTime ? "Выберите дату и время" : "Выберите дату"}
      status={error ? "error" : undefined}
    />
  );
}

function AntdSelect({ spec, value, onChange, error }) {
  const options = (spec.options || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return labelWrap(
    humanLabel(spec.name, spec.label),
    <Select
      value={value ?? undefined}
      onChange={(v) => onChange(v ?? "")}
      options={options}
      placeholder={spec.placeholder || "Выберите…"}
      style={{ width: "100%" }}
      allowClear
      status={error ? "error" : undefined}
    />
  );
}

// ============================================================
// Buttons
// ============================================================

// Backlog 2.1: принимаем label ИЛИ children. Приоритет label (explicit domain spec)
// над children (декларативный API, как у renderer/controls/FormModal).
function buttonContent(label, children) {
  if (label != null && label !== "") return label;
  return children;
}

function AntdPrimaryButton({ label, icon, onClick, disabled, title, size, children }) {
  return (
    <AntButton
      type="primary"
      onClick={onClick}
      disabled={disabled}
      title={title}
      icon={normalizeIcon(icon)}
      size={size === "lg" ? "large" : size === "sm" ? "small" : "middle"}
    >
      {buttonContent(label, children)}
    </AntButton>
  );
}

function AntdSecondaryButton({ label, icon, onClick, disabled, title, size, children }) {
  return (
    <AntButton
      onClick={onClick}
      disabled={disabled}
      title={title}
      icon={normalizeIcon(icon)}
      size={size === "lg" ? "large" : size === "sm" ? "small" : "middle"}
    >
      {buttonContent(label, children)}
    </AntButton>
  );
}

function AntdDangerButton({ label, icon, onClick, disabled, title, size, children }) {
  return (
    <AntButton
      danger
      onClick={onClick}
      disabled={disabled}
      title={title}
      icon={normalizeIcon(icon)}
      size={size === "lg" ? "large" : size === "sm" ? "small" : "middle"}
    >
      {buttonContent(label, children)}
    </AntButton>
  );
}

/**
 * IntentButton-адаптер. Зеркалит логику Mantine:
 *  - длинный label → icon-only (AntButton type="text" size="large" без label)
 *  - danger → type="primary" danger
 *  - primary variant → type="primary"
 *  - default → type="default"
 */
function AntdIntentButton({ spec, onClick, disabled }) {
  const label = spec.label || spec.intentId;
  const LABEL_MAX = 14;
  const showLabel = label.length <= LABEL_MAX;

  const isDanger = spec.variant === "danger" || spec.irreversibility === "high";
  const isPrimary = spec.variant === "primary";

  const type = isDanger || isPrimary ? "primary" : "default";
  const danger = isDanger || undefined;
  const iconNode = spec.icon ? <Icon emoji={spec.icon} size={14} /> : undefined;

  if (!showLabel || !label) {
    return (
      <AntButton
        type="text"
        shape="circle"
        onClick={onClick}
        disabled={disabled}
        title={label}
        danger={danger}
        icon={iconNode || <Icon emoji={spec.icon || "⋯"} size={16} />}
      />
    );
  }

  return (
    <AntButton
      type={type}
      danger={danger}
      onClick={onClick}
      disabled={disabled}
      title={label}
      size="middle"
      icon={iconNode}
    >
      {label}
    </AntButton>
  );
}

/**
 * Overflow menu — AntD Dropdown с items-API.
 * items: [{ key, label, icon, onClick }]
 */
function AntdOverflowMenu({ items, triggerIcon, triggerLabel }) {
  if (!items || items.length === 0) return null;

  const menuItems = items.map((item) => {
    if (item.divider) return { type: "divider", key: item.key };
    return {
      key: item.key,
      label: item.label,
      icon: item.icon ? <Icon emoji={item.icon} size={14} /> : undefined,
      onClick: item.onClick,
    };
  });

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
      <AntButton
        type="text"
        shape="circle"
        size="large"
        title={triggerLabel || "Ещё"}
        icon={<Icon emoji={triggerIcon || "⋯"} size={16} />}
      />
    </Dropdown>
  );
}

// ============================================================
// Primitives
// ============================================================

function AntdHeading({ level = 2, children }) {
  const lvl = Math.min(5, Math.max(1, level));
  return <Title level={lvl} style={{ marginBottom: 8 }}>{children}</Title>;
}

const TEXT_PRESETS = {
  body: {},
  secondary: { type: "secondary" },
  muted: { type: "secondary" },
  heading: { strong: true },
  accent: { strong: true },
  danger: { type: "danger" },
  success: { type: "success" },
};

function AntdText({ children, preset, style }) {
  const props = (preset && TEXT_PRESETS[preset]) || {};
  return <Text {...props} style={style}>{children}</Text>;
}

function AntdBadge({ children, color }) {
  return <Tag color={color || "blue"}>{children}</Tag>;
}

function AntdAvatar({ src, name, size = 40 }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Avatar src={src || undefined} size={size}>
      {!src && initials}
    </Avatar>
  );
}

function AntdPaper({ children, padding, withBorder, style }) {
  return (
    <Card
      size={padding === "sm" ? "small" : "medium"}
      variant={withBorder !== false ? "bordered" : "borderless"}
      style={{ borderRadius: 8, ...(style || {}) }}
      styles={{ body: { padding: padding ?? 16 } }}
    >
      {children}
    </Card>
  );
}

/**
 * Breadcrumbs — делегация на AntD native <Breadcrumb>.
 * Node-shape совпадает с renderer primitive (Breadcrumbs.jsx):
 *   { type: "breadcrumbs", items: [{label, projection?, params?, current?}], separator? }
 *
 * AntD сам обрабатывает current (последний item без href = active, bold).
 * Custom `current: true` на не-последнем — AntD не поддерживает нативно,
 * реализуем через items.slice() + `active` flag на соответствующем item'е.
 */
function AntdBreadcrumbs({ node, ctx }) {
  const items = Array.isArray(node?.items) ? node.items : [];
  if (items.length === 0) return null;
  const separator = node?.separator;

  // Explicit current override — помечаем не-последний item как current,
  // всё после него становится просто текстом (AntD их в item-hierarchy
  // не отрендерит как активные). Backward-compat с primitive-behavior:
  // если current === true указан mid-chain — остальные после current
  // показываем как subtle-текст без навигации.
  const explicitCurrentIdx = items.findIndex(it => it.current === true);
  const currentIdx = explicitCurrentIdx >= 0 ? explicitCurrentIdx : items.length - 1;

  const antdItems = items.map((item, i) => {
    const isCurrent = i === currentIdx;
    if (isCurrent) {
      return { title: item.label };
    }
    if (i < currentIdx) {
      return {
        title: item.label,
        onClick: (e) => {
          e.preventDefault();
          if (ctx?.navigate && item.projection) ctx.navigate(item.projection, item.params || {});
        },
        href: "#",
      };
    }
    // post-current items — subtle (not active, not clickable)
    return { title: item.label };
  });

  return <AntBreadcrumb items={antdItems} separator={separator} />;
}

/**
 * DataGrid — native AntD Table с column sort/filter вместо built-in primitive.
 * Node-shape тот же что у primitive renderer/src/primitives/DataGrid.jsx.
 * AntD даёт: sortable (native), filterDropdown, column resize (indirect),
 * virtualized scrolling при pagination/scroll.y.
 */
function AntdDataGrid({ node, ctx }) {
  const items = Array.isArray(node?.items) ? node.items : [];
  const columns = Array.isArray(node?.columns) ? node.columns : [];
  const emptyLabel = node?.emptyLabel ?? "Нет данных";

  const antColumns = columns.map(col => ({
    key: col.key,
    dataIndex: col.key,
    title: col.label || col.key,
    align: col.align,
    width: col.width,
    sorter: col.sortable !== false
      ? (a, b) => {
          const av = a[col.key], bv = b[col.key];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === "number" && typeof bv === "number") return av - bv;
          return String(av).localeCompare(String(bv));
        }
      : undefined,
    filters: col.filter === "enum" && Array.isArray(col.values)
      ? col.values.map(v => ({ text: v, value: v }))
      : undefined,
    onFilter: col.filter === "enum" && Array.isArray(col.values)
      ? (value, record) => String(record[col.key]) === String(value)
      : undefined,
    render: (value) => renderCellValue(value, col),
  }));

  const handleRow = node?.onItemClick
    ? (record) => ({
        onClick: () => {
          if (typeof node.onItemClick === "function") {
            node.onItemClick(record);
          } else if (node.onItemClick.action === "navigate" && ctx?.navigate) {
            const params = {};
            const spec = node.onItemClick.params || {};
            for (const [k, v] of Object.entries(spec)) {
              params[k] = (typeof v === "string" && v.startsWith("item."))
                ? record[v.slice(5)]
                : v;
            }
            ctx.navigate(node.onItemClick.to, params);
          }
        },
        style: { cursor: "pointer" },
      })
    : undefined;

  return (
    <AntTable
      size="small"
      columns={antColumns}
      dataSource={items.map((it, i) => ({ ...it, key: it.id ?? i }))}
      pagination={items.length > 20 ? { pageSize: 20, size: "small" } : false}
      locale={{ emptyText: emptyLabel }}
      onRow={handleRow}
    />
  );
}

function renderCellValue(value, col) {
  if (value == null) return <span style={{ color: "#9ca3af" }}>—</span>;

  // Explicit format overrides
  if (col.format === "badge") return <Tag>{String(value)}</Tag>;
  if (col.format === "date" || col.format === "datetime") {
    return <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{formatDateTime(value, col.format)}</span>;
  }
  if (col.format === "number" || col.format === "currency") {
    return <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(value, col)}</span>;
  }
  if (col.format === "code" || col.format === "mono") {
    return <code style={{ fontSize: 11, color: "#374151", background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>{String(value)}</code>;
  }

  // Type-based rendering
  if (typeof value === "boolean") {
    return value
      ? <Tag color="green" style={{ marginRight: 0 }}>✓</Tag>
      : <Tag color="default" style={{ marginRight: 0, color: "#9ca3af" }}>✗</Tag>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "#9ca3af" }}>—</span>;
    const shown = value.slice(0, 3);
    const rest = value.length - shown.length;
    // Variant inferred from column (policy / role / tag) if provided
    const tagColor = col.chipVariant === "policy" ? "gold" : col.chipVariant === "role" ? "purple" : undefined;
    return (
      <span>
        {shown.map((v, i) => {
          const label = typeof v === "object" ? (v.name || v.id || JSON.stringify(v).slice(0, 20)) : String(v);
          return <Tag key={i} color={tagColor} style={{ marginRight: 4 }}>{label}</Tag>;
        })}
        {rest > 0 && <span style={{ color: "#9ca3af", fontSize: 11 }}>+{rest}</span>}
      </span>
    );
  }
  if (typeof value === "object") {
    // Compact JSON blob with expandable tooltip, visually different from plain text
    return <code style={{ fontSize: 11, color: "#6b7280" }} title={JSON.stringify(value)}>{JSON.stringify(value).slice(0, 40)}…</code>;
  }
  // Heuristic: ISO date-string detection
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{formatDateTime(value, "datetime")}</span>;
  }
  return String(value);
}

function formatDateTime(value, mode) {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    if (mode === "date") return d.toISOString().slice(0, 10);
    // datetime — YYYY-MM-DD HH:mm
    return d.toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return String(value);
  }
}

function formatNumber(value, col) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (col.format === "currency") {
    const currency = col.currency || "USD";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  }
  // Default number — tabular with commas
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

/**
 * Wizard — native AntD Steps + form area + nav buttons.
 * Inherits shape от built-in Wizard primitive. testConnection control
 * работает через ctx.testConnection (adapter не trogает). Native Steps
 * дают progress bar + click-to-step navigation.
 */
function AntdWizard({ node, ctx, value: initialValue, onSubmit }) {
  const steps = Array.isArray(node?.steps) ? node.steps : [];
  const [values, setValues] = useStateHook(initialValue || node?.value || {});
  const [currentIdx, setCurrentIdx] = useStateHook(0);

  const activeSteps = steps.filter(step => {
    const cond = step.dependsOn;
    if (!cond || typeof cond !== "object") return true;
    for (const [k, expected] of Object.entries(cond)) {
      if (values[k] !== expected) return false;
    }
    return true;
  });

  const safeIdx = Math.min(currentIdx, Math.max(activeSteps.length - 1, 0));
  const currentStep = activeSteps[safeIdx];
  const isLast = safeIdx === activeSteps.length - 1;
  const isFirst = safeIdx === 0;

  if (steps.length === 0) {
    return <div style={{ padding: 16, color: "#9ca3af", textAlign: "center" }}>Нет шагов</div>;
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
      <AntSteps
        current={safeIdx}
        size="small"
        items={activeSteps.map(s => ({ title: s.title || s.id }))}
        style={{ marginBottom: 20 }}
      />
      {currentStep && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {currentStep.description && <p style={{ color: "#6b7280", margin: 0 }}>{currentStep.description}</p>}
          {(currentStep.fields || []).map(field => (
            <WizardField
              key={field.name}
              field={field}
              value={values[field.name] ?? ""}
              onChange={(v) => setValues({ ...values, [field.name]: v })}
            />
          ))}
          {currentStep.testConnection && (
            <WizardTestConnection spec={currentStep.testConnection} values={values} ctx={ctx} />
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
        <AntButton disabled={isFirst} onClick={() => setCurrentIdx(i => Math.max(i - 1, 0))}>
          ← Назад
        </AntButton>
        {isLast ? (
          <AntButton type="primary" onClick={() => onSubmit && onSubmit(values)}>
            Создать
          </AntButton>
        ) : (
          <AntButton type="primary" onClick={() => setCurrentIdx(i => Math.min(i + 1, activeSteps.length - 1))}>
            Далее →
          </AntButton>
        )}
      </div>
    </div>
  );
}

function WizardField({ field, value, onChange }) {
  const { Text: TextType } = Typography;
  const common = {
    value: value ?? "",
    onChange: (e) => onChange(e?.target ? e.target.value : e),
    placeholder: field.placeholder,
    size: "middle",
    style: { width: "100%" },
  };
  let input;
  if (field.type === "select" && Array.isArray(field.options)) {
    input = (
      <Select
        value={value ?? undefined}
        onChange={onChange}
        placeholder={field.placeholder || "—"}
        style={{ width: "100%" }}
        options={field.options.map(opt => {
          const v = typeof opt === "object" ? opt.value : opt;
          const label = typeof opt === "object" ? opt.label : opt;
          return { value: v, label };
        })}
      />
    );
  } else if (field.type === "textarea") {
    input = <Input.TextArea {...common} rows={3} />;
  } else if (field.type === "number") {
    input = <InputNumber value={value} onChange={onChange} style={{ width: "100%" }} placeholder={field.placeholder} />;
  } else if (field.type === "boolean") {
    input = <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  } else {
    input = <Input {...common} />;
  }
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
        {field.label || field.name}
        {field.required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {input}
      {field.hint && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{field.hint}</div>}
    </div>
  );
}

function WizardTestConnection({ spec, values, ctx }) {
  const [state, setState] = useStateHook({ status: "idle" });
  const run = async () => {
    setState({ status: "loading" });
    try {
      if (typeof ctx?.testConnection !== "function") {
        setState({ status: "error", message: "ctx.testConnection не реализован" });
        return;
      }
      const r = await ctx.testConnection(spec.intent, values);
      if (r?.ok) setState({ status: "ok", message: r.message || "Соединение успешно" });
      else setState({ status: "error", message: r?.message || "Ошибка" });
    } catch (err) {
      setState({ status: "error", message: err?.message || String(err) });
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
      <AntButton onClick={run} loading={state.status === "loading"}>
        {spec.label || "Test Connection"}
      </AntButton>
      {state.status === "ok" && <span style={{ color: "#059669", fontSize: 12 }}>✓ {state.message}</span>}
      {state.status === "error" && <span style={{ color: "#dc2626", fontSize: 12 }}>✗ {state.message}</span>}
    </div>
  );
}

/**
 * PropertyPopover — native AntD Popover с key-value списком.
 */
function AntdPropertyPopover({ node, ctx }) {
  const value = node?.value != null ? node.value : node;
  // node.value может отсутствовать если используется через body-atom binding.
  // В этом случае value — сам node (fallback). Реальный case для field-primitive hint
  // через binding: renderer передаст value как prop.
  const entries = (value && typeof value === "object" && !Array.isArray(value))
    ? Object.entries(value).filter(([k]) => k !== "type" && k !== "maxInline" && k !== "summary")
    : [];
  if (entries.length === 0) {
    return <span style={{ color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>Нет properties</span>;
  }
  const summary = node?.summary || `${entries.length} properties`;
  const content = (
    <div style={{ maxHeight: 320, overflowY: "auto", minWidth: 260 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 12, padding: "2px 0", fontSize: 12 }}>
          <span style={{ flex: "0 0 auto", minWidth: 100, color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>{k}</span>
          <span style={{ flex: 1, fontFamily: "ui-monospace, monospace", wordBreak: "break-word" }}>
            {formatPopoverValue(v)}
          </span>
        </div>
      ))}
    </div>
  );
  return (
    <AntPopover content={content} title={summary} trigger="click" placement="bottomLeft">
      <Tag style={{ cursor: "pointer" }}>⋯ {summary}</Tag>
    </AntPopover>
  );
}

function formatPopoverValue(v) {
  if (v == null) return "—";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    try { return JSON.stringify(v).slice(0, 80); } catch { return String(v); }
  }
  return String(v);
}

/**
 * ChipList — native AntD Tag'и вместо built-in span'ов.
 */
function AntdChipList({ node, ctx }) {
  // node.value fallback к node если renderer передаёт value как node
  const value = node?.value != null ? node.value : (Array.isArray(node) ? node : null);
  const items = Array.isArray(value) ? value : (Array.isArray(node) ? node : []);
  const variant = node?.variant || "tag";
  const maxVisible = node?.maxVisible ?? 5;
  const emptyLabel = node?.emptyLabel ?? "Нет";
  if (items.length === 0) {
    return <span style={{ color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>{emptyLabel}</span>;
  }
  const visible = items.slice(0, maxVisible);
  const overflow = items.length - visible.length;
  const tagColor = variant === "policy" ? "gold" : variant === "role" ? "purple" : "default";
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {visible.map((item, i) => {
        const label = typeof item === "object" ? (item.label || item.name || JSON.stringify(item)) : String(item);
        const icon = typeof item === "object" ? item.icon : undefined;
        const onClick = node?.onItemClick ? () => node.onItemClick(item) : undefined;
        return (
          <Tag
            key={i}
            color={typeof item === "object" && item.color ? item.color : tagColor}
            style={onClick ? { cursor: "pointer" } : undefined}
            onClick={onClick}
            closable={!!node?.onDetach}
            onClose={node?.onDetach ? () => node.onDetach(item, i) : undefined}
          >
            {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
            {label}
          </Tag>
        );
      })}
      {overflow > 0 && <span style={{ color: "#6b7280", fontSize: 11 }}>+{overflow}</span>}
    </span>
  );
}

// React hooks binding (обходим обязательный import для минимальности
// изменений — React уже в scope через jsx transform).
import { useState as useStateHook } from "react";

/**
 * Statistic — финансовая метрика (value + prefix/suffix + trend).
 * Доменный код декларирует: { kind: "statistic", value, prefix, suffix, trend }
 * trend: "up" | "down" | null → зелёная/красная стрелка
 */
function AntdStatistic({ title, value, prefix, suffix, trend, precision = 0 }) {
  let valueStyle = undefined;
  let prefixNode = prefix;

  if (trend === "up") {
    valueStyle = { color: "#3f8600" };
    prefixNode = prefix ? <>{prefix} <ArrowUpOutlined /></> : <ArrowUpOutlined />;
  } else if (trend === "down") {
    valueStyle = { color: "#cf1322" };
    prefixNode = prefix ? <>{prefix} <ArrowDownOutlined /></> : <ArrowDownOutlined />;
  }

  return (
    <Statistic
      title={title}
      value={value}
      precision={precision}
      valueStyle={valueStyle}
      prefix={prefixNode}
      suffix={suffix}
    />
  );
}

// ============================================================
// Shell: Modal + Tabs
// ============================================================

function AntdModalShell({ onClose, children, title }) {
  return (
    <Modal open onCancel={onClose} title={title} footer={null} centered width={560} destroyOnClose>
      {children}
    </Modal>
  );
}

/**
 * Form header AntD-style (backlog §9.4): Cancel / Title / Save.
 * Используется ArchetypeForm через getAdaptedComponent("shell","formHeader")
 * когда адаптер зарегистрирован — даёт antd tonality вместо iOS-glass.
 */
function AntdFormHeader({ title, saveLabel, cancelLabel, onSave, onCancel, disabled }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid rgba(5,5,5,0.06)",
      background: "#fff",
    }}>
      <AntButton onClick={onCancel} size="middle">
        ← {cancelLabel || "Отмена"}
      </AntButton>
      <h1 style={{
        margin: 0, fontSize: 16, fontWeight: 600, flex: 1,
        textAlign: "center", color: "rgba(0,0,0,0.88)",
      }}>
        {title}
      </h1>
      <AntButton type="primary" onClick={onSave} disabled={disabled} size="middle">
        {saveLabel || "Сохранить"}
      </AntButton>
    </div>
  );
}

function AntdTabs({ items, active, onSelect, extra }) {
  const tabItems = items.map((it) => ({ key: it.value, label: it.label }));
  return (
    <Tabs
      activeKey={active || undefined}
      onChange={(k) => onSelect && onSelect(k)}
      items={tabItems}
      tabBarExtraContent={extra}
      style={{ paddingLeft: 16, paddingRight: 16 }}
    />
  );
}

// ============================================================
// Affinity декларации — для scoring-based выбора компонента
// через renderer.pickAdaptedComponent (matching.js). Используются
// как opt-in: renderer может продолжать звать getAdaptedComponent
// и получит прежний lookup.
// ============================================================

AntdNumber.affinity = {
  roles: ["money", "price", "percentage"],
  types: ["number"],
  fields: ["amount", "total", "price", "fee", "balance"],
};

AntdDateTime.affinity = {
  roles: ["timestamp", "datetime"],
  types: ["datetime"],
  features: ["withTime"],
};

AntdTel.affinity = {
  types: ["tel"],
  fields: ["phone", "phoneNumber", "mobile"],
};

AntdEmail.affinity = {
  types: ["email"],
  fields: ["email", "contactEmail"],
};

// ───────────────────────────────────────────────────────────
// Primitive affinities (Stage 8 polish) — дают pickBest-scoring
// преимущество AntD-нативным delegations над generic SVG-fallback'ом,
// когда renderer проходит через matching/ranking pipeline.
// ───────────────────────────────────────────────────────────

AntdDataGrid.affinity = {
  types: ["json", "array"],
  // Catalog.tags/policies, User/Group.roles, Role.securableObjects —
  // всё это collection-поля; при shape-layer "table" катализируется
  // в DataGrid приоритетнее generic list.
  fields: ["columns", "tags", "policies", "items", "rows"],
  roles: ["table-shape", "column-schema"],
};

AntdWizard.affinity = {
  // Wizard — projection-level; affinity помогает когда ontology
  // декларирует field-level primitive hint "wizard" (rare).
  types: ["json"],
  roles: ["wizard-flow"],
};

AntdPropertyPopover.affinity = {
  types: ["json", "map"],
  // properties — общее имя для key-value metadata на Metalake/Catalog/
  // Schema/Table и т.п. metadata-based доменах.
  fields: ["properties", "metadata", "labels", "attributes", "tags"],
};

AntdChipList.affinity = {
  types: ["json", "array"],
  // roles (массив имён ролей на User/Group), tags (array of tag-objects),
  // policies — все chip-friendly collections.
  fields: ["roles", "tags", "policies", "labels", "permissions"],
};

/**
 * AntD Sidebar — enterprise-fintech dense-style через antd Menu с
 * SubMenu для секций. Plays well with dark-mode-friendly темами и
 * tight-spacing layout'ами invest-домена.
 */
function AntdSidebar({ sections, active, onSelect, projectionNames }) {
  const items = (sections || []).map(sec => ({
    key: `__section:${sec.section}`,
    label: sec.section,
    icon: sec.icon ? <span aria-hidden>{sec.icon}</span> : null,
    type: "group",
    children: (sec.items || []).map(projId => ({
      key: projId,
      label: projectionNames?.[projId] || projId,
    })),
  }));
  return (
    <div style={{
      width: 240, flexShrink: 0, height: "100%", overflow: "auto",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      background: "var(--ant-color-bg-container, #1f1f1f)",
    }}>
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={active ? [active] : []}
        onClick={({ key }) => {
          if (key && !key.startsWith("__section:") && onSelect) onSelect(key);
        }}
        items={items}
        style={{ border: "none", background: "transparent", fontSize: 13 }}
      />
    </div>
  );
}

// ============================================================
// Adapter export
// ============================================================

export const antdAdapter = {
  name: "antd",
  // §26.4 + §26.6: capability surface. Проекции могут читать через
  // getCapability/supportsVariant и gracefully fallback при несоответствии.
  capabilities: {
    primitive: {
      chart: { chartTypes: ["line", "pie", "column", "bar", "area"] },
      sparkline: true,
      statistic: true,
      heading: true, text: true, badge: true, avatar: true, paper: true,
      breadcrumbs: true,
      dataGrid: { sort: true, filter: true, pagination: true },
      wizard: { steps: true, testConnection: true },
      propertyPopover: true,
      chipList: { variants: ["tag", "policy", "role"] },
    },
    shell: { modal: true, tabs: true, sidebar: true },
    button: { primary: true, secondary: true, danger: true, intent: true, overflow: true },
  },
  parameter: {
    text: AntdTextInput,
    textarea: AntdTextarea,
    email: AntdEmail,
    url: AntdUrl,
    tel: AntdTel,
    number: AntdNumber,
    datetime: AntdDateTime,
    select: AntdSelect,
  },
  button: {
    primary: AntdPrimaryButton,
    secondary: AntdSecondaryButton,
    danger: AntdDangerButton,
    intent: AntdIntentButton,
    overflow: AntdOverflowMenu,
  },
  shell: {
    modal: AntdModalShell,
    formHeader: AntdFormHeader,
    tabs: AntdTabs,
    sidebar: AntdSidebar,
  },
  primitive: {
    heading: AntdHeading,
    text: AntdText,
    badge: AntdBadge,
    avatar: AntdAvatar,
    paper: AntdPaper,
    statistic: AntdStatistic,
    chart: AntdChart,
    sparkline: AntdSparkline,
    breadcrumbs: AntdBreadcrumbs,
    dataGrid: AntdDataGrid,
    wizard: AntdWizard,
    propertyPopover: AntdPropertyPopover,
    chipList: AntdChipList,
  },
  icon: {
    resolve: resolveAntdIcon,
  },
};
