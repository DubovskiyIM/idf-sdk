/**
 * Банк встроенных UX-паттернов. 5 базовых поведенческих паттернов,
 * покрывающих ~90% реальных UX-ситуаций.
 *
 * Каждый паттерн — набор взвешенных сигналов и threshold.
 * Домен может добавить свои через ontology.patterns[].
 */

export const BUILT_IN_PATTERNS = [
  {
    id: "execution",
    name: "Execution / Trading",
    description: "Быстрое исполнение действий с финансовым/ресурсным контекстом",
    signals: [
      { fn: "intentActionShape", match: "bidirectional-trade", weight: 3 },
      { fn: "fieldRoleCluster", match: ["money", "quantity"], weight: 3 },
      { fn: "entityTopology", match: "has-preapproval", weight: 2 },
      { fn: "entityTopology", match: "has-reference-asset", weight: 1 },
    ],
    threshold: 5,
  },
  {
    id: "triage",
    name: "Triage / Inbox",
    description: "Бинарные решения по очереди элементов",
    signals: [
      { fn: "intentPairSymmetry", match: "accept-reject", weight: 4 },
      { fn: "intentPairSymmetry", match: "ack-dismiss", weight: 4 },
      { fn: "intentActionShape", match: "binary-decision", weight: 2 },
      { fn: "effectDensity", match: "balanced", weight: 1 },
    ],
    threshold: 4,
  },
  {
    id: "monitoring",
    name: "Monitoring / Overview",
    description: "Пассивный обзор с KPI, thresholds и drill-down",
    signals: [
      { fn: "effectDensity", match: "write-sparse", weight: 3 },
      { fn: "fieldRoleCluster", match: ["money", "percentage"], weight: 2 },
      { fn: "intentActionShape", match: "read-dominant", weight: 2 },
    ],
    threshold: 4,
  },
  {
    id: "exploration",
    name: "Exploration / Browse",
    description: "Просмотр, поиск, сравнение справочных данных",
    signals: [
      { fn: "intentActionShape", match: "crud", weight: 2 },
      { fn: "entityTopology", match: "has-reference-asset", weight: 2 },
      { fn: "fieldRoleCluster", match: ["ticker"], weight: 1 },
      { fn: "effectDensity", match: "write-sparse", weight: 1 },
    ],
    threshold: 4,
  },
  {
    id: "configuration",
    name: "Configuration / Settings",
    description: "Настройка параметров через toggles и inline-setters",
    signals: [
      { fn: "intentActionShape", match: "replace-dominant", weight: 3 },
      { fn: "effectDensity", match: "write-dense", weight: 2 },
      { fn: "fieldRoleCluster", match: ["percentage"], weight: 1 },
    ],
    threshold: 4,
  },
];
