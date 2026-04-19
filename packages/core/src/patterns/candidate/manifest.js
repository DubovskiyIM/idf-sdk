// AUTO-GENERATED from candidate/bank/*.json by
// packages/core/scripts/generate-candidates-manifest.mjs — не редактируйте вручную.
// Для обновления: pnpm -F @intent-driven/core generate:candidates

export const CANDIDATE_PATTERNS = [
  {
    "id": "file-picker-attachment",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKeyTo": "mainEntity"
        },
        {
          "kind": "entity-field",
          "entity": "<sub-entity>",
          "field": "mimeType"
        },
        {
          "kind": "intent-creates",
          "entity": "<sub-entity>",
          "confirmation": "form"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Для sub-entity с полями (filename, url, mimeType, size) рендерит секцию 'Attachments' со списком файлов и кнопкой-триггером native file picker'а (<input type=file>). Не drag-drop-only — explicit button всегда доступен."
    },
    "rationale": {
      "hypothesis": "Drag-drop-only исключает touch/keyboard-пользователей и ситуации где файл уже в clipboard/explorer. Явная кнопка + native picker покрывает 100% сценариев; drag-drop — опциональная надстройка.",
      "evidence": [
        {
          "source": "linear-issue-detail",
          "description": "Attachments секция с кнопкой 'Attach file' → native picker, drag-drop как дополнительный affordance",
          "reliability": "high"
        },
        {
          "source": "github-issue-attach",
          "description": "'Paste, drop, or click' — все три способа явно указаны, click fallback всегда доступен",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "figma-drag-only-import",
          "description": "Figma полагается на drag-drop в canvas — работает потому что курсор уже в canvas-контексте, неприменимо к form-based detail",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Message-attachments: та же тройка filename/mimeType/size на sub-entity"
        },
        {
          "domain": "sales",
          "projection": "listing_edit",
          "reason": "Listing photos — file-picker pattern"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Нет файлового контента в invest-домене"
        },
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Poll не работает с файлами"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-17-linear-issue-detail-file-picker-attachment.json",
        "slot": "sections",
        "primarySource": "linear-issue-detail",
        "description": "Для sub-entity с полями (filename, url, mimeType, size) рендерит секцию 'Attachments' со списком файлов и кнопкой-триггером native file pick"
      }
    ]
  },
  {
    "id": "inline-subcollection-create",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKeyTo": "mainEntity"
        },
        {
          "kind": "intent-creates",
          "entity": "<sub-entity>",
          "confirmation": "enter"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "В секции subcollection показывает inline-строку ввода прямо под списком (без модалки), confirm=Enter. Отличается от composer-entry тем, что не фиксирован внизу детали, а встроен в секцию sub-entity."
    },
    "rationale": {
      "hypothesis": "Модалка для создания лёгкого sub-элемента (sub-issue, sub-task) — overkill: контекст parent'а теряется, user делает 1-2 клика впустую. Inline-ввод сохраняет контекст и поощряет быструю декомпозицию.",
      "evidence": [
        {
          "source": "linear-issue-detail",
          "description": "Кнопка '+ Add sub-issue' разворачивается в inline-input в той же секции, Enter создаёт, Esc отменяет",
          "reliability": "high"
        },
        {
          "source": "notion-nested-pages",
          "description": "Вложенные страницы создаются inline через '/' без модалки",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "jira-sub-task",
          "description": "Jira открывает полную форму — ощущается тяжёлым для decomposition, но оправдано когда sub-task требует обязательных полей (estimate, reporter)",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "TimeOption в Poll — быстрая ad-hoc декомпозиция вариантов"
        },
        {
          "domain": "workflow",
          "projection": "workflow_detail",
          "reason": "Node внутри Workflow — inline-add в списке узлов (альтернатива canvas)"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Task под Goal — lightweight sub-task creation"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Position создаётся через формальную buy-транзакцию, inline-create неадекватен риск-профилю"
        },
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "OrderItem добавляется до confirm, не inline из detail"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-17-linear-issue-detail-inline-subcollection-create.json",
        "slot": "sections",
        "primarySource": "linear-issue-detail",
        "description": "В секции subcollection показывает inline-строку ввода прямо под списком (без модалки), confirm=Enter. Отличается от composer-entry тем, что "
      }
    ]
  },
  {
    "id": "properties-sidebar-panel",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "α": "replace",
          "targetPrefix": "<entity>.",
          "min": 3
        },
        {
          "kind": "intent-confirmation",
          "value": "click"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Группирует 3+ single-field replace-интентов (priority, assignee, labels, project, cycle, estimate) в sidebar-панель или properties-section справа от body. Каждое поле — click-to-edit popover/dropdown. Расширение footer-inline-setter на множественные поля."
    },
    "rationale": {
      "hypothesis": "Отдельный footer-inline-setter на каждое из 6 полей захламляет интерфейс. Группировка в одну панель даёт пользователю scan-friendly обзор metadata и единую зону для правок без перепрыгивания по экрану.",
      "evidence": [
        {
          "source": "linear-issue-detail",
          "description": "Правая колонка со Status/Priority/Assignee/Labels/Project/Cycle/Estimate — каждое поле click-to-edit",
          "reliability": "high"
        },
        {
          "source": "jira-issue-view",
          "description": "Details-панель справа с аналогичной группировкой metadata",
          "reliability": "high"
        },
        {
          "source": "github-issue-sidebar",
          "description": "Assignees/Labels/Projects/Milestone в правом sidebar с gear-icon для редактирования",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "trello-card",
          "description": "Card modal прячет все metadata в action-меню справа; работает для card-based паттерна, но слабее в dense-list",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Listing с price/category/condition/shipping/visibility — классический кандидат на properties-панель"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Goal с sphere/priority/deadline/visibility/tags"
        },
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Portfolio с riskProfile/goal/currency/strategy"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "У Conversation мало editable metadata, panel избыточна"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "MoodEntry — feed-оriented, metadata inline внутри body"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-17-linear-issue-detail-properties-sidebar-panel.json",
        "slot": "sections",
        "primarySource": "linear-issue-detail",
        "description": "Группирует 3+ single-field replace-интентов (priority, assignee, labels, project, cycle, estimate) в sidebar-панель или properties-section с"
      }
    ]
  },
  {
    "id": "reusable-reference-multiselect",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "value": "reference"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "<entity>.<m2m-field>"
        },
        {
          "kind": "entity-field",
          "entity": "<reference>",
          "field": "color"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Для m2m reference-сущности (Label с color) рендерит цветные чипы в properties-панели; click открывает search-able multiselect popover со списком существующих + inline-creation нового. Отличается от footer-inline-setter тем, что работает с reusable reference-entity, а не с enum."
    },
    "rationale": {
      "hypothesis": "Labels/Tags переиспользуются между instance'ами mainEntity, поэтому dropdown enum не подходит (список растёт, нужен search). Цвет — семантический anchor, без него labels сливаются в текстовую кашу.",
      "evidence": [
        {
          "source": "linear-issue-detail",
          "description": "Labels — цветные чипы, picker с search и 'Create new label' inline",
          "reliability": "high"
        },
        {
          "source": "github-issues-labels",
          "description": "Тот же паттерн: список existing с search, inline-create через 'Edit labels'",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "notion-multi-select-no-color",
          "description": "Notion multi-select без color — работает только когда пул мал (<5 значений); при росте теряется scan-ability",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Category/tags как reusable reference с поиском"
        },
        {
          "domain": "lifequest",
          "projection": "task_detail",
          "reason": "Sphere-теги на Task — m2m reusable reference"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "Order не имеет reusable user-tags"
        },
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Portfolio не тегируется"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-17-linear-issue-detail-reusable-reference-multiselect.json",
        "slot": "sections",
        "primarySource": "linear-issue-detail",
        "description": "Для m2m reference-сущности (Label с color) рендерит цветные чипы в properties-панели; click открывает search-able multiselect popover со спи"
      }
    ]
  },
  {
    "id": "status-lifecycle-off-path",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "field": "status",
          "fieldRole": "status"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "<entity>.status"
        },
        {
          "kind": "field-role-present",
          "role": "status-ordered-with-terminal"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Рендерит ordered lifecycle (backlog→todo→in_progress→in_review→done) как прогрессирующую цепочку CTA, а off-path terminal (cancelled) — как отдельную secondary-кнопку вне цепочки. Расширение phase-aware-primary-cta: различает forward-flow и escape-hatch."
    },
    "rationale": {
      "hypothesis": "Plain enum select скрывает направление workflow. Chain-CTA делает 'следующий шаг' одним кликом, а off-path terminal отделён визуально — пользователь не случайно кликает cancel вместо done.",
      "evidence": [
        {
          "source": "linear-issue-detail",
          "description": "Status bar внизу показывает forward-flow как линейную цепочку, Cancelled отделён в kebab-меню/dropdown",
          "reliability": "high"
        },
        {
          "source": "github-issues",
          "description": "Open/Closed + 'Close as not planned' — аналогичная бифуркация forward/off-path",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "trello",
          "description": "Все колонки равноправны, нет seman­ticа forward vs terminal — паттерн не применим к kanban без жёсткого lifecycle",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "execution_detail",
          "reason": "Execution имеет pending→running→succeeded с failed/cancelled как off-path"
        },
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "Order: created→accepted→preparing→delivering→delivered, cancelled off-path"
        },
        {
          "domain": "sales",
          "projection": "order_detail",
          "reason": "Order lifecycle с disputed/refunded как off-path terminal"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "У Conversation нет lifecycle-статуса"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "MoodEntry не имеет workflow states"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-17-linear-issue-detail-status-lifecycle-off-path.json",
        "slot": "primaryCTA",
        "primarySource": "linear-issue-detail",
        "description": "Рендерит ordered lifecycle (backlog→todo→in_progress→in_review→done) как прогрессирующую цепочку CTA, а off-path terminal (cancelled) — как "
      }
    ]
  },
  {
    "id": "test-dry-run-candidate",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "$mainEntity"
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Auto-generated candidate"
    },
    "rationale": {
      "hypothesis": "Dry run",
      "evidence": [
        {
          "source": "test-dry-run",
          "description": "mock",
          "reliability": "low"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "test",
          "projection": "list",
          "reason": "mock"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "test",
          "projection": "detail",
          "reason": "mock"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-17-test-dry-run-test-dry-run-candidate.json",
        "slot": "hero",
        "primarySource": "test-dry-run",
        "description": "Auto-generated candidate"
      }
    ]
  },
  {
    "id": "bulk-action-toolbar",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "filter": {
            "idPrefix": "bulk_"
          },
          "minCount": 2
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Catalog получает checkbox-колонку + floating action bar, активирующийся при selection.size ≥ 1. Bar хостит все bulk_* намерения в виде batched-effect'ов; каждый bulk-intent исполняется по выбранной коллекции, не по одной сущности."
    },
    "rationale": {
      "hypothesis": "Bulk-intents в онтологии — явный signal, что domain ожидает операций-по-множеству. Без dedicated bar пользователю придётся исполнять один и тот же intent N раз подряд (дорогой loop), либо open-каждый-detail → contract нарушен. Toolbar'овый bar — каноничный fit: активируется по selection, исчезает при 0, не конкурирует с per-card actions.",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "Чекбоксы открывают bar с Move to Phase / Assign / Archive",
          "reliability": "high"
        },
        {
          "source": "linear-triage",
          "description": "Bulk selection-bar с move/assign/label actions",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "Canonical pattern: select → toolbar of archive/label/move",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "reflect",
          "description": "MoodEntry — однократные записи, bulk-операции не моделируются",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings-seller",
          "reason": "bulk_delist, bulk_edit_price уместны для крупного seller"
        },
        {
          "domain": "delivery",
          "projection": "orders-dispatcher",
          "reason": "bulk_assign_courier по zone — реальный use-case"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll-detail",
          "reason": "Vote — индивидуальное действие, bulk бессмыслен"
        },
        {
          "domain": "booking",
          "projection": "booking-detail",
          "reason": "Detail-view — одна сущность, bulk не применим"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-bulk-action-toolbar.json",
        "slot": "toolbar",
        "primarySource": "height-phase-board",
        "description": "Catalog получает checkbox-колонку + floating action bar, активирующийся при selection.size ≥ 1. Bar хостит все bulk_* намерения в виде batch"
      }
    ]
  },
  {
    "id": "kanban-phase-column-board",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "value": "mainEntity"
        },
        {
          "kind": "entity-field",
          "field": "status",
          "enumMinValues": 3
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "<mainEntity>.status",
          "confirmation": "click",
          "minCount": 1
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Catalog корневой layout превращается из grid в column-per-phase доску: по колонке на каждое значение status; основной способ исполнения replace-.status — drag-drop карточки между колонками (confirmation=click сводится к drop-gesture)."
    },
    "rationale": {
      "hypothesis": "Когда entity фактически живёт на state-machine с одним dominantным полем статуса и главное намерение — двигать сущность по фазам, пространственное расположение колонок кодирует сам workflow: позиция карточки = её фаза. Это устраняет необходимость открывать detail для смены статуса и делает загрузку каждой фазы визуально считываемой (количество, стагнации, балансы).",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "Колонки Backlog / Up next / In progress / In review / Done; drag-drop = replace task.status",
          "reliability": "high"
        },
        {
          "source": "linear-triage",
          "description": "Board layout по status как equal-citizen с list view",
          "reliability": "high"
        },
        {
          "source": "notion-database-views",
          "description": "Board view — native projection для select-поля",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "messenger",
          "description": "Conversation.status бинарно (open/archived), колонки дают 2 пустых бака — grid уместнее",
          "reliability": "medium"
        },
        {
          "source": "invest",
          "description": "Position.status (open/closed) — тоже 2 значения, column-layout избыточен; инвесторам важнее численные метрики, не spatial phase",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "executions",
          "reason": "Execution.status ∈ {queued, running, failed, succeeded} + replace на status — идеальный kanban-кандидат"
        },
        {
          "domain": "lifequest",
          "projection": "tasks-board",
          "reason": "Task.status ∈ {todo, doing, done} при наличии replace — board оправдан"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations",
          "reason": "Всего 2 статуса — колонки вырождены"
        },
        {
          "domain": "reflect",
          "projection": "mood-entries",
          "reason": "Нет фаз; дискриминатор mood не workflow-phase"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-kanban-phase-column-board.json",
        "slot": "body",
        "primarySource": "height-phase-board",
        "description": "Catalog корневой layout превращается из grid в column-per-phase доску: по колонке на каждое значение status; основной способ исполнения repl"
      }
    ]
  },
  {
    "id": "multi-facet-catalog-card",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "value": "mainEntity"
        },
        {
          "kind": "field-role-present",
          "anyOf": [
            "person-reference",
            "label",
            "progress",
            "date",
            "tag"
          ],
          "minDistinctRoles": 3
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Альтернативный card-spec рядом с grid-card-layout: когда у mainEntity нет image/money, но есть ≥3 разнородных semantic-ролей (people + labels + progress + date), рендерится композитная карточка с зональной разметкой — avatar-stack + tag-pills + progress-bar + date-chip — а не generic list-row."
    },
    "rationale": {
      "hypothesis": "grid-card-layout сегодня требует image или money/percentage; task-like entity без картинок, но с богатым набором fieldRole выпадает в плоский list-row и теряет scannability. Card с зонами под семантику (people/progress/time) — natural fit для операционных сущностей (tasks, issues, tickets).",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "Card: title + avatar-stack + label-pills + progress-bar + due-chip",
          "reliability": "high"
        },
        {
          "source": "linear-issues",
          "description": "Issue card: title + assignee avatar + priority icon + labels",
          "reliability": "high"
        },
        {
          "source": "asana",
          "description": "Task card с assignee avatars и due date",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "messenger",
          "description": "Conversation-list нуждается в preview-тексте и timestamp'е, не в multi-facet card",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "tasks",
          "reason": "Task: title + assignee + progress + dueDate — ≥3 ролей"
        },
        {
          "domain": "workflow",
          "projection": "workflows",
          "reason": "Workflow имеет name + author + nodes-count + lastRunAt"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood-entries",
          "reason": "MoodEntry = value + timestamp, одна роль"
        },
        {
          "domain": "invest",
          "projection": "positions",
          "reason": "Уже покрыт grid-card-layout через money-fields"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-multi-facet-catalog-card.json",
        "slot": "body",
        "primarySource": "height-phase-board",
        "description": "Альтернативный card-spec рядом с grid-card-layout: когда у mainEntity нет image/money, но есть ≥3 разнородных semantic-ролей (people + label"
      }
    ]
  },
  {
    "id": "sub-entity-progress-rollup",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "withField": "status"
        },
        {
          "kind": "entity-field",
          "entity": "<subEntity>",
          "field": "status",
          "hasValue": "done"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "На card'е catalog'а parent-сущности рендерится inline-индикатор прогресса sub-entity (N/M done или progress-bar), derived из child-entities. Это не detail-section (subcollections) — это derived-метрика на карточке."
    },
    "rationale": {
      "hypothesis": "subcollections даёт expanded-список child'ов в detail-view — но в catalog'е разворачивать весь child-list на каждой карточке бесмысленно. Aggregated progress bar — compact compression: parent-card показывает статус своих детей одним визуальным символом. Паттерн читабелен только если у sub-entity есть терминальный status (done/complete), из которого можно посчитать ratio.",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "Parent task card показывает 3/5 subtasks done inline",
          "reliability": "high"
        },
        {
          "source": "linear-issues",
          "description": "Parent issue отображает counter sub-issues completed",
          "reliability": "high"
        },
        {
          "source": "github-issues",
          "description": "Task-list в body ишью рендерится как progress-bar на card'е",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "messenger",
          "description": "Message не агрегирует child-entities с terminal-status",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "goals",
          "reason": "Goal имеет Habit'ы и Task'и с terminal-status — rollup читаем"
        },
        {
          "domain": "workflow",
          "projection": "workflows",
          "reason": "Workflow → Nodes с execution-status, aggregated pass-rate"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations",
          "reason": "Message — continuous, нет terminal-статуса для rollup"
        },
        {
          "domain": "reflect",
          "projection": "hypotheses",
          "reason": "Evidence-sub-entities без done/complete — просто коллекция"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-sub-entity-progress-rollup.json",
        "slot": "body",
        "primarySource": "height-phase-board",
        "description": "На card'е catalog'а parent-сущности рендерится inline-индикатор прогресса sub-entity (N/M done или progress-bar), derived из child-entities."
      }
    ]
  },
  {
    "id": "temporal-field-visual-signal",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "role": "date",
          "semanticHint": [
            "due",
            "deadline",
            "scheduledAt",
            "phaseEnteredAt"
          ]
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Рендер-трансформация (не контейнерная): temporal-поле превращается в чип/бейдж с цветовым сигналом, производным от now: overdue (past due) → red; near-due → amber; time-in-phase > threshold → stagnation-badge. Сигнал derivable — не хранится в Φ."
    },
    "rationale": {
      "hypothesis": "Abs-timestamp ('2026-04-18 17:00') требует ментальной арифметики — пользователь должен вычитать now. Relative-color-signal делает операционно важное свойство (просрочено / зависло) константно-видимым. Правило decidable: стандартные семантические роли (due/scheduledAt) → canonical-трансформация, адаптеру передаётся только tone.",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "Due-chip красный если overdue; time-in-phase badge сигнализирует стагнацию",
          "reliability": "high"
        },
        {
          "source": "linear-issues",
          "description": "Priority + due date окрашиваются при приближении deadline",
          "reliability": "high"
        },
        {
          "source": "github-issues",
          "description": "'opened N days ago' — derived relative-time",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "reflect",
          "description": "MoodEntry.createdAt — не дедлайн, цвет-сигнал неуместен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "bookings",
          "reason": "Booking.startAt — scheduled-time, подсветка near/past начала"
        },
        {
          "domain": "delivery",
          "projection": "orders-active",
          "reason": "promisedAt → overdue-signal критичен для диспатчера"
        },
        {
          "domain": "lifequest",
          "projection": "tasks",
          "reason": "Task.dueDate — классический overdue"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "sales",
          "projection": "listings",
          "reason": "Listing.createdAt — информационный, не actionable"
        },
        {
          "domain": "messenger",
          "projection": "messages",
          "reason": "Message.sentAt — нет deadline-семантики"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-temporal-field-visual-signal.json",
        "slot": "body",
        "primarySource": "height-phase-board",
        "description": "Рендер-трансформация (не контейнерная): temporal-поле превращается в чип/бейдж с цветовым сигналом, производным от now: overdue (past due) →"
      }
    ]
  },
  {
    "id": "universal-command-palette",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "filter": {
            "all": true
          },
          "minCount": 15
        }
      ]
    },
    "structure": {
      "slot": "overlay",
      "description": "Global ⌘K overlay — flat fuzzy-searchable entrypoint ко ВСЕМ intents домена (cross-archetype). Каждый intent.id становится command-row; параметризованные intents запрашивают параметры внутри палитры (nested form). Альтернатива button-spaghetti при высокой intent-density."
    },
    "rationale": {
      "hypothesis": "При intent-count > ~15 button-layout становится overwhelming: кнопки мигрируют в меню, меню вложенные, скорость исполнения падает. Command palette — плоский keyboard-first вход: O(1) доступ к любому intent по имени. Паттерн не заменяет archetype-specific UI — работает поверх любого projection'а как универсальный keyboard layer.",
      "evidence": [
        {
          "source": "linear",
          "description": "⌘K — primary entry-point, command для каждого intent",
          "reliability": "high"
        },
        {
          "source": "height-phase-board",
          "description": "⌘K + J/K navigation — всё управляется с клавиатуры",
          "reliability": "high"
        },
        {
          "source": "vscode",
          "description": "Command palette — canonical pattern для high-intent-count продуктов",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "lifequest-mobile",
          "description": "Mobile-first + <20 intents — bottom-tabs эффективнее, keyboard entrypoint неактуален",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "*",
          "reason": "225 intents — overload без палитры"
        },
        {
          "domain": "messenger",
          "projection": "*",
          "reason": "100 intents + keyboard-heavy пользователи"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll-detail",
          "reason": "17 intents — button-layout достаточен"
        },
        {
          "domain": "reflect",
          "projection": "mood-meter",
          "reason": "Mobile-first reflective flow, keyboard не primary"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-universal-command-palette.json",
        "slot": "overlay",
        "primarySource": "linear",
        "description": "Global ⌘K overlay — flat fuzzy-searchable entrypoint ко ВСЕМ intents домена (cross-archetype). Каждый intent.id становится command-row; пара"
      }
    ]
  },
  {
    "id": "view-swimlane-regrouping",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "view.swimlane",
          "minCount": 2
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Catalog получает второе (горизонтальное) группирование по выбираемому fieldRole (assignee / label / priority). Swimlanes ортогональны основному columns-layout — не заменяют его, а добавляют ось. Переключатель group-by в header."
    },
    "rationale": {
      "hypothesis": "View-level группировка, выраженная как intent на view.*, — явный контракт 'клиент может перегруппировать без мутации Φ'. Это не настоящая мутация world — это проекционная трансформация. Паттерн признаёт ортогональность: status остаётся колонками, swimlane становится строками → одна и та же Φ, три layout'а.",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "group_by_assignee / group_by_label пересобирают board без изменения tasks",
          "reliability": "high"
        },
        {
          "source": "linear-board",
          "description": "Group by status / priority / assignee — core view-spec",
          "reliability": "high"
        },
        {
          "source": "notion-database-views",
          "description": "Group-by как first-class view-property",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "messenger",
          "description": "Conversation-list нет естественного второго measure для swimlane",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "executions",
          "reason": "group_by author/status — valid"
        },
        {
          "domain": "delivery",
          "projection": "orders-dispatcher",
          "reason": "group_by zone / courier — dispatcher use-case"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood-entries",
          "reason": "Нет view.swimlane intent'ов"
        },
        {
          "domain": "invest",
          "projection": "position-detail",
          "reason": "Detail — одна сущность, swimlanes неприменимы"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-view-swimlane-regrouping.json",
        "slot": "body",
        "primarySource": "height-phase-board",
        "description": "Catalog получает второе (горизонтальное) группирование по выбираемому fieldRole (assignee / label / priority). Swimlanes ортогональны основн"
      }
    ]
  },
  {
    "id": "workflow-graph-constrained-cta",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "entity": "Phase",
          "field": "allowedNextPhases"
        },
        {
          "kind": "entity-field",
          "field": "status",
          "referencesEntity": "Phase"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "<mainEntity>.status",
          "minCount": 2
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Уточнение phase-aware-primary-cta: когда workflow задан явным directed graph через Phase.allowedNextPhases, рендерятся ТОЛЬКО те status-transitions, что разрешены из текущей фазы — не весь enum. Это делает UI отражением формального workflow, а не plain-select'а."
    },
    "rationale": {
      "hypothesis": "Static enum status даёт фиксированный набор transitions; workflow-graph с allowedNextPhases кодирует business-constraints (нельзя done → in_progress без reopen). Рендер всех n→n переходов нарушит эти constraints либо заставит валидатор гасить уже показанные кнопки, что плохой UX. Фильтрация по графу = single-source-of-truth рендеринг.",
      "evidence": [
        {
          "source": "height-phase-board",
          "description": "Кнопки CTA меняются по фазе: Start → Mark done → Reopen — а не все 6 transitions",
          "reliability": "high"
        },
        {
          "source": "jira",
          "description": "Workflow transitions — first-class concept; detail-view показывает только разрешённые",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "lifequest",
          "description": "Task.status ∈ {todo, doing, done} без Phase-сущности — plain-enum, все переходы валидны, граф не нужен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "execution-detail",
          "reason": "Execution имеет Node-graph с явными transitions"
        },
        {
          "domain": "booking",
          "projection": "booking-detail",
          "reason": "Booking.status pending→confirmed→completed|cancelled — directed graph, reverse не все"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "hypothesis-detail",
          "reason": "Hypothesis.status — plain enum без graph-определения"
        },
        {
          "domain": "invest",
          "projection": "position-detail",
          "reason": "Position.status binary, Phase-сущности нет"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-height-phase-board-workflow-graph-constrained-cta.json",
        "slot": "primaryCTA",
        "primarySource": "height-phase-board",
        "description": "Уточнение phase-aware-primary-cta: когда workflow задан явным directed graph через Phase.allowedNextPhases, рендерятся ТОЛЬКО те status-tran"
      }
    ]
  },
  {
    "id": "global-command-palette",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 15
        },
        {
          "kind": "has-role",
          "value": "owner"
        }
      ]
    },
    "structure": {
      "slot": "overlay",
      "description": "Cross-cutting overlay (⌘K / Ctrl+K) открывает fuzzy-search по всем intents и navigation-targets. Surface не привязан к архетипу; доступен из любого view и становится primary navigation для power-users."
    },
    "rationale": {
      "hypothesis": "Когда intent-поверхность разрастается (≥15 intents, множество projections), navigation через menu-trees становится O(depth) и теряет discoverability; palette даёт O(1) доступ через name-matching, снимает cognitive load по запоминанию иерархии.",
      "evidence": [
        {
          "source": "linear",
          "description": "⌘K объединяет 20+ actions + navigation commands + issue-search",
          "reliability": "high"
        },
        {
          "source": "vscode",
          "description": "⌘Shift+P — command palette для 500+ commands, primary path для power-users",
          "reliability": "high"
        },
        {
          "source": "slack",
          "description": "⌘K switcher объединяет navigation и actions",
          "reliability": "high"
        },
        {
          "source": "raycast",
          "description": "Весь UX строится вокруг palette-first paradigm",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "instagram",
          "description": "Consumer visual-first app с малой intent-поверхностью — palette избыточен",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "marketplace",
          "reason": "225 intents, power-user админ — палитра окупается"
        },
        {
          "domain": "messenger",
          "projection": "app-shell",
          "reason": "100 intents, множественные поверхности"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "specialist-list",
          "reason": "22 intents, casual consumer — palette overkill"
        },
        {
          "domain": "planning",
          "projection": "poll-vote",
          "reason": "17 intents, линейный single-task flow"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-issue-keyboard-flow-global-command-palette.json",
        "slot": "overlay",
        "primarySource": "linear",
        "description": "Cross-cutting overlay (⌘K / Ctrl+K) открывает fuzzy-search по всем intents и navigation-targets. Surface не привязан к архетипу; доступен из"
      },
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-global-command-palette.json",
        "slot": "overlay",
        "primarySource": "superhuman-inbox",
        "description": "Единый ⌘K overlay агрегирует три поверхности: search (query поверх сущностей), navigation (goto_folder / goto_entity) и command execution (i"
      }
    ]
  },
  {
    "id": "hotkey-namespace-shift-modifier",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "effect": "replace",
          "min": 6,
          "targetPrefix": "mainEntity"
        },
        {
          "kind": "intent-confirmation",
          "value": "click",
          "min": 6
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "При ≥6 property-setters single-letter namespace переполняется (collisions по starting letter); shift-modifier резервируется для вторичных setters (shift-P=project при занятом P=priority, shift-M=parent при M=move). Primary hotkey достаётся наиболее частому property."
    },
    "rationale": {
      "hypothesis": "Hotkey-namespace — conflict-prone shared resource. Без систематических правил назначения collisions создают memorability-долг и убивают keyboard-mastery; shift-modifier — canonical convention для «secondary namespace» (capital letters как shifted primary).",
      "evidence": [
        {
          "source": "linear",
          "description": "P=priority, Shift+P=project; M=move, Shift+M=parent — systematic disambiguation",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "E=archive, Shift+U=mark unread — shift для secondary actions",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "simple-todo-apps",
          "description": "Приложения с 3-4 hotkeys не нуждаются в shift-namespace — over-engineering",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing-admin",
          "reason": "Множество property-setters с collision-риском по начальным буквам"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "slot-book",
          "reason": "Мало intents, single-letter достаточно"
        },
        {
          "domain": "planning",
          "projection": "poll-vote",
          "reason": "Один главный action, hotkey-namespace не напряжён"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-issue-keyboard-flow-hotkey-namespace-shift-modifier.json",
        "slot": "sections",
        "primarySource": "linear",
        "description": "При ≥6 property-setters single-letter namespace переполняется (collisions по starting letter); shift-modifier резервируется для вторичных se"
      }
    ]
  },
  {
    "id": "inline-editable-hero",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "value": "replace",
          "target": "mainEntity.title"
        },
        {
          "kind": "intent-effect",
          "value": "replace",
          "target": "mainEntity.description"
        },
        {
          "kind": "intent-confirmation",
          "value": "enter"
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Title и description mainEntity рендерятся как inline-editable atoms в hero-слоте: click-to-edit без modal. Title — single-line, description — rich-text inline с preview. Enter или blur коммитит; Escape отменяет."
    },
    "rationale": {
      "hypothesis": "Edit-modal для hero-полей скрывает context (siblings, sub-entities, siblings' state), а inline-edit сохраняет его и сокращает путь «open modal → edit → save → close». Для identity-defining fields (title/body) контекст ценнее изоляции edit-поверхности.",
      "evidence": [
        {
          "source": "linear",
          "description": "Title и description Issue редактируются кликом in-place без modal",
          "reliability": "high"
        },
        {
          "source": "notion",
          "description": "Весь page-content inline-editable — modal считается антипаттерном",
          "reliability": "high"
        },
        {
          "source": "github-issues",
          "description": "Title inline-edit, description — markdown-area с preview",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "jira",
          "description": "Title/description за edit-modal — critiqued за friction",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "goal-detail",
          "reason": "Goal.title + Goal.description — user-authored identity fields"
        },
        {
          "domain": "workflow",
          "projection": "workflow-editor",
          "reason": "Workflow.name inline-edit как identity"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "position-detail",
          "reason": "Position без user-authored title/description — system-generated"
        },
        {
          "domain": "delivery",
          "projection": "order-tracker",
          "reason": "Order имеет системные поля, не user-content"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-issue-keyboard-flow-inline-editable-hero.json",
        "slot": "hero",
        "primarySource": "linear",
        "description": "Title и description mainEntity рендерятся как inline-editable atoms в hero-слоте: click-to-edit без modal. Title — single-line, description "
      }
    ]
  },
  {
    "id": "keyboard-property-popover",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "effect": "replace",
          "min": 4,
          "targetPrefix": "mainEntity"
        },
        {
          "kind": "intent-confirmation",
          "value": "click",
          "min": 4
        },
        {
          "kind": "field-role-present",
          "roles": [
            "status",
            "reference"
          ]
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Каждый property-setter mainEntity рендерится как sidebar-row с single-letter hotkey и inline fuzzy-popover, type-specific picker (calendar/ordered-list/multi-select-with-create). Click и keyboard-путь ведут к одному popover — dual-modal parity без дублирования UI."
    },
    "rationale": {
      "hypothesis": "Когда detail-entity имеет ≥4 scalar/reference свойств с replace-intent, модальные editors создают trip-to-modal friction и ломают context; sidebar+hotkey+inline-popover даёт keyboard-first power-users и click-first casual-users общий surface contract.",
      "evidence": [
        {
          "source": "linear",
          "description": "10 sidebar-свойств Issue (status S, priority P, assignee A, labels L, cycle Y, estimate E, due D) открываются single-letter hotkey ИЛИ click и приводят к одному popover с fuzzy-search",
          "reliability": "high"
        },
        {
          "source": "height",
          "description": "Аналогичный sidebar с hotkey-driven property editors на task-detail",
          "reliability": "medium"
        },
        {
          "source": "notion-database",
          "description": "Property-rows fuzzy-picker, дуальная клавиатура/мышь",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "jira-cloud",
          "description": "Sidebar-свойства с click-only модалкой без keyboard-equivalence — критикуется за скорость",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "position-detail",
          "reason": "Position имеет много reference-свойств (portfolio, asset) — fits"
        },
        {
          "domain": "sales",
          "projection": "listing-detail",
          "reason": "Listing с status/category/condition как keyboard-addressable sidebar"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation-thread",
          "reason": "feed-архетип без property-setters"
        },
        {
          "domain": "planning",
          "projection": "poll-vote",
          "reason": "Единственный action — голосование, property-sidebar не нужен"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-issue-keyboard-flow-keyboard-property-popover.json",
        "slot": "sections",
        "primarySource": "linear",
        "description": "Каждый property-setter mainEntity рендерится как sidebar-row с single-letter hotkey и inline fuzzy-popover, type-specific picker (calendar/o"
      }
    ]
  },
  {
    "id": "optimistic-replace-with-undo",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "value": "replace"
        },
        {
          "kind": "intent-confirmation",
          "value": "click"
        },
        {
          "kind": "intent-count",
          "effect": "replace",
          "min": 3
        }
      ]
    },
    "structure": {
      "slot": "overlay",
      "description": "Reversible replace-intent (без irreversibility=high) применяется оптимистически сразу после click/select; рендерится undo-toast в overlay-слоте на 5–10 секунд. Отдельный confirmation-step не показывается."
    },
    "rationale": {
      "hypothesis": "Confirmation на каждый property-change порождает modal-fatigue и тормозит power-user путь; для reversible операций дешевле скрыть подтверждение и предоставить undo, потому что latency ценнее accuracy. Этот паттерн — дуал к irreversible-confirm.",
      "evidence": [
        {
          "source": "linear",
          "description": "Status/priority/assignee apply без confirmation, undo-toast внизу экрана",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "Archive / move to folder с undo-toast — canonical pattern",
          "reliability": "high"
        },
        {
          "source": "notion",
          "description": "Inline-edits database cell apply optimistically, undo через ⌘Z",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "banking",
          "description": "Money-transfer — explicit confirmation обязателен; скорость уступает правильности",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "habit-list",
          "reason": "toggle habit completion — reversible replace"
        },
        {
          "domain": "invest",
          "projection": "watchlist",
          "reason": "add/remove watchlist — reversible mutations"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "delivery",
          "projection": "order-payment",
          "reason": "capture_payment irreversibility=high — требует confirm"
        },
        {
          "domain": "invest",
          "projection": "buy-order",
          "reason": "financial transaction не reversible — irreversible-confirm"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-issue-keyboard-flow-optimistic-replace-with-undo.json",
        "slot": "overlay",
        "primarySource": "linear",
        "description": "Reversible replace-intent (без irreversibility=high) применяется оптимистически сразу после click/select; рендерится undo-toast в overlay-сл"
      },
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-optimistic-replace-with-undo.json",
        "slot": "overlay",
        "primarySource": "superhuman-inbox",
        "description": "Деструктивный/статус-меняющий replace применяется оптимистично и показывает transient undo-toast (3–5с) вместо модального подтверждения; Cmd"
      }
    ]
  },
  {
    "id": "threaded-comment-stream",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "name": "Comment"
        },
        {
          "kind": "entity-field",
          "entity": "Comment",
          "field": "parentCommentId"
        },
        {
          "kind": "intent-creates",
          "value": "Comment"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity Comment с self-referencing parentCommentId рендерится как threaded stream section: root-comments — top-level, replies — indented под parent. Composer дуальный: inline-reply под веткой vs top-level composer в подвале секции (обычно биндится к разным hotkeys, напр. R/C)."
    },
    "rationale": {
      "hypothesis": "Flat comment-list теряет causality между вопросом и ответом; для sub-entity с self-reference (tree-структура) UI обязан отразить эту структуру, иначе обсуждение деградирует в несвязный feed и теряется context reply-цепочки.",
      "evidence": [
        {
          "source": "linear",
          "description": "Comments под issue nested по parentCommentId, reply inline внутри thread",
          "reliability": "high"
        },
        {
          "source": "github-pr",
          "description": "Review-comments threaded по line + conversation",
          "reliability": "high"
        },
        {
          "source": "slack",
          "description": "Threads как отдельная поверхность на parent message",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "youtube-legacy",
          "description": "Flat chronological comments — считается antipattern для многоуровневой дискуссии",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing-detail",
          "reason": "Если Message имеет self-referencing parentId — threaded rendering оправдан"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation",
          "reason": "Messages flat (feed-архетип), нет self-reference"
        },
        {
          "domain": "reflect",
          "projection": "mood-entry-detail",
          "reason": "Нет Comment sub-entity с self-reference"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-issue-keyboard-flow-threaded-comment-stream.json",
        "slot": "sections",
        "primarySource": "linear",
        "description": "Sub-entity Comment с self-referencing parentCommentId рендерится как threaded stream section: root-comments — top-level, replies — indented "
      }
    ]
  },
  {
    "id": "bulk-selection-toolbar",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 1,
          "where": {
            "idPrefix": "bulk_"
          }
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Включить multi-select (Shift+click range, click toggle). При ≥1 selected — toolbar с bulk_* intent'ами становится visible; unselect закрывает toolbar. Selection count — first-class индикатор."
    },
    "rationale": {
      "hypothesis": "Если bulk_* intent'ы присутствуют в namespace, это явное заявление, что пользователь обрабатывает items атомарно группой. UX должен поднять selection до first-class, не прятать в contextual menu.",
      "evidence": [
        {
          "source": "linear-triage",
          "description": "Shift+click range + bulk_take/bulk_decline",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "Checkbox-selection с bulk archive/label/delete",
          "reliability": "high"
        },
        {
          "source": "notion-database",
          "description": "Multi-row selection с bulk actions bar",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "single-entity-detail",
          "description": "Detail-экраны одного item — bulk бессмыслен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_inbox",
          "reason": "при добавлении bulk_archive/bulk_relist на Listing"
        },
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "bulk_mark_read/bulk_archive — стандарт мессенджеров"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "single-entity focus, bulk не применим"
        },
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "dashboard без list-items для multi-select"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-triage-view-bulk-selection-toolbar.json",
        "slot": "toolbar",
        "primarySource": "linear-triage",
        "description": "Включить multi-select (Shift+click range, click toggle). При ≥1 selected — toolbar с bulk_* intent'ами становится visible; unselect закрывае"
      }
    ]
  },
  {
    "id": "entity-promotion",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "!mainEntity",
          "description": "intent создаёт entity отличную от feed-entity"
        },
        {
          "kind": "intent-confirmation",
          "value": "form"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Dedicated CTA на item-level (или в detail-контексте) escalates одиночный item в higher-order entity. Форма предзаполняется из current item; исходный item linked/transitioned, не удаляется."
    },
    "rationale": {
      "hypothesis": "Промоция (issue→project, lead→deal, story→epic) — универсальный lifecycle в продуктах с иерархией сущностей. Это не create-from-scratch (hero-create), а conversion: UX должен отражать continuity (pre-filled form, link back), а не открывать пустую форму.",
      "evidence": [
        {
          "source": "linear-triage",
          "description": "convert_to_project создаёт Project из Issue-контекста",
          "reliability": "high"
        },
        {
          "source": "salesforce-lead-convert",
          "description": "Lead→Opportunity conversion flow с предзаполнением",
          "reliability": "medium"
        },
        {
          "source": "jira-epic-link",
          "description": "Story→Epic escalation",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "flat-entity-model",
          "description": "Если entity-hierarchy нет — promotion не применим",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_feed",
          "reason": "потенциально Listing→Auction promotion"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "booking_list",
          "reason": "нет higher-order entity выше Booking"
        },
        {
          "domain": "reflect",
          "projection": "mood_stream",
          "reason": "flat entity-model, escalation path отсутствует"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-triage-view-entity-promotion.json",
        "slot": "primaryCTA",
        "primarySource": "linear-triage",
        "description": "Dedicated CTA на item-level (или в detail-контексте) escalates одиночный item в higher-order entity. Форма предзаполняется из current item; "
      }
    ]
  },
  {
    "id": "keyboard-hotkey-triage",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 3,
          "where": {
            "confirmation": "click",
            "target": "mainEntity"
          }
        },
        {
          "kind": "has-role",
          "base": "owner"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Bind каждый click-confirmation intent к single-key hotkey; render contextual cheatsheet в footer при focus/selection. Снижает triage-cost до одной клавиши на item."
    },
    "rationale": {
      "hypothesis": "Когда пользователь обрабатывает десятки items за сессию, keyboard >> mouse. Hotkeys окупаются только при ≥3 click-intentов на item-тип и повторяющемся use-case (inbox/triage).",
      "evidence": [
        {
          "source": "linear-triage",
          "description": "T/P/D/X для take/priority/decline/discard без модалки, cheatsheet в bottom bar",
          "reliability": "high"
        },
        {
          "source": "superhuman",
          "description": "Email-triage на single-key hotkeys как ключевой value prop",
          "reliability": "high"
        },
        {
          "source": "gmail-shortcuts",
          "description": "J/K navigation + E/# для archive/delete у power users",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "consumer-feed",
          "description": "В Instagram/TikTok hotkeys не работают — нет power-use-case и touch-first контекст",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "≥3 click-intentов (archive/mute/pin) на Conversation, feed archetype"
        },
        {
          "domain": "reflect",
          "projection": "mood_stream",
          "reason": "множество быстрых click-intentов на MoodEntry в daily log"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "dashboard, не feed; intents form-heavy"
        },
        {
          "domain": "booking",
          "projection": "booking_form",
          "reason": "form-driven flow, single-key hotkeys неприменимы"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-triage-view-keyboard-hotkey-triage.json",
        "slot": "toolbar",
        "primarySource": "linear-triage",
        "description": "Bind каждый click-confirmation intent к single-key hotkey; render contextual cheatsheet в footer при focus/selection. Снижает triage-cost до"
      }
    ]
  },
  {
    "id": "saved-query-sidebar",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "hasFilterFields": true,
          "description": "вспомогательная entity с *Filter полями, описывающая сохранённый запрос к mainEntity"
        },
        {
          "kind": "intent-creates",
          "entity": "<filter-entity>"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Левая nav с saved views (instances вспомогательной filter-entity). Клик по view применяет filter к feed. 'Create filter' — последний item списка. Активный view подсвечивается. 'All' — implicit дефолтный view."
    },
    "rationale": {
      "hypothesis": "Пользовательские queries — не ad-hoc, они повторяются. Если пользователь явно создаёт Filter/Queue/View entity, это сигнал persistence; такие запросы должны быть one-click доступны в sidebar, а не скрыты в dropdown-inside-dropdown.",
      "evidence": [
        {
          "source": "linear-triage",
          "description": "TriageQueue по source/label/priority как sidebar items",
          "reliability": "high"
        },
        {
          "source": "gmail-labels",
          "description": "Labels левой nav = persistent saved filters",
          "reliability": "high"
        },
        {
          "source": "jira-filters",
          "description": "Starred filters в sidebar",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "ephemeral-search",
          "description": "Если пользователь не создаёт explicit saved entity — inline-search достаточно",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_inbox",
          "reason": "SavedSearch entity уже декларирована в ontology"
        },
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "если добавится ChatFolder с filter-полями"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "detail, не feed; нет filter-entity"
        },
        {
          "domain": "workflow",
          "projection": "workflow_canvas",
          "reason": "canvas archetype, sidebar занят palette/inspector"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-triage-view-saved-query-sidebar.json",
        "slot": "sections",
        "primarySource": "linear-triage",
        "description": "Левая nav с saved views (instances вспомогательной filter-entity). Клик по view применяет filter к feed. 'Create filter' — последний item сп"
      }
    ]
  },
  {
    "id": "source-provenance-card",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "source"
        },
        {
          "kind": "sub-entity-exists",
          "entity": "Source",
          "withDiscriminator": "kind"
        },
        {
          "kind": "field-role-present",
          "role": "icon",
          "onEntity": "Source"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Card-layout: source-icon leading + submitter avatar + title + excerpt. Icon — first-class визуальный маркер (размер ≥ avatar), не мелкий tag в metadata-строке."
    },
    "rationale": {
      "hypothesis": "Когда items приходят из разных каналов (email/Slack/widget/API), source — ключевой сигнал для triage-решения (доверие, приоритет, контекст). Прятать его в metadata-строку — терять cognitive-load benefit.",
      "evidence": [
        {
          "source": "linear-triage",
          "description": "Icon канала (email/slack/feedback) слева от title каждого issue",
          "reliability": "high"
        },
        {
          "source": "front-app",
          "description": "Shared inbox с channel-icon как primary visual",
          "reliability": "high"
        },
        {
          "source": "intercom-inbox",
          "description": "Source badge в списке conversations",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "homogeneous-source",
          "description": "Если все items идут из одного канала — icon избыточен, тратит слот",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "reflect",
          "projection": "mood_stream",
          "reason": "если MoodEntry приобретёт source (manual/prompt/reminder) с icon"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "Position не имеет polymorphic source-channel"
        },
        {
          "domain": "planning",
          "projection": "poll_feed",
          "reason": "Poll создаётся в одном канале, provenance неинформативен"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-triage-view-source-provenance-card.json",
        "slot": "body",
        "primarySource": "linear-triage",
        "description": "Card-layout: source-icon leading + submitter avatar + title + excerpt. Icon — first-class визуальный маркер (размер ≥ avatar), не мелкий tag"
      }
    ]
  },
  {
    "id": "undo-toast-irreversible",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 1,
          "where": {
            "irreversibility": "high",
            "confirmation": "click"
          }
        },
        {
          "kind": "intent-count",
          "min": 3,
          "where": {
            "confirmation": "click"
          },
          "description": "high-throughput контекст"
        }
      ]
    },
    "structure": {
      "slot": "overlay",
      "description": "Альтернатива irreversible-confirm: execute immediately + toast с N-секундным undo window. Undo откатывает effect до истечения timer; после — hard-commit. Сохраняет safety за счёт soft-commit окна, не блокируя keyboard speed."
    },
    "rationale": {
      "hypothesis": "В high-throughput feed (triage, inbox) modal-confirm на каждый destructive — friction killer. Если отменяемо optimistically И item не имеет external side-effect, undo-toast строго лучше modal.",
      "evidence": [
        {
          "source": "gmail-undo-send",
          "description": "Canonical undo-toast для irreversible send (30s window)",
          "reliability": "high"
        },
        {
          "source": "linear-triage",
          "description": "Decline/discard одним keystroke без модалки + undo toast",
          "reliability": "high"
        },
        {
          "source": "slack-delete-message",
          "description": "Delete без confirm + короткий undo",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "invest-trade-execute",
          "description": "Financial/high-stakes — нужен explicit confirm-modal (irreversible-confirm)",
          "reliability": "high"
        },
        {
          "source": "delivery-capture-payment",
          "description": "External effect (платёж) — undo физически невозможен, нужен modal",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "archive/delete conversation — reversible в transactional сроки"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "trade_execution",
          "reason": "high-stakes financial — irreversible-confirm с modal обязателен"
        },
        {
          "domain": "delivery",
          "projection": "payment_capture",
          "reason": "external side-effect (__irr), undo невозможен"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-linear-triage-view-undo-toast-irreversible.json",
        "slot": "overlay",
        "primarySource": "gmail-undo-send",
        "description": "Альтернатива irreversible-confirm: execute immediately + toast с N-секундным undo window. Undo откатывает effect до истечения timer; после —"
      },
      {
        "file": "2026-04-19-profi-ru-catalog-undo-toast-irreversible.json",
        "slot": "overlay",
        "primarySource": "profi.ru",
        "description": "После подтверждения irreversible-replace (reject_bid / delete_draft) показывается toast с undo-кнопкой на короткое окно (5-10s), откатывающи"
      }
    ]
  },
  {
    "id": "board-group-drag-write",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "Entry",
          "field": "status",
          "fieldType": "select"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "entry.status"
        },
        {
          "kind": "intent-confirmation",
          "confirmation": "click"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Board-archetype: группирует entries по select-property (status/priority) в колонки. Drag карточки между колонками = replace целевого поля. GroupBy target совпадает с target replace-intent'а."
    },
    "rationale": {
      "hypothesis": "Kanban сводит status-transition к single-gesture (drag) вместо two-step (open → field-select → save). Визуальное 'где' автоматически несёт семантическое 'какой статус' — zero extra UI.",
      "evidence": [
        {
          "source": "notion",
          "description": "Board view drag между колонками коммитит status",
          "reliability": "high"
        },
        {
          "source": "trello",
          "description": "Канбан-prototype: drag card между lists",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Board issues drag по status-columns",
          "reliability": "high"
        },
        {
          "source": "jira",
          "description": "Scrum/Kanban boards drag = status transition",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "free-form-text-status",
          "description": "Если status — свободный текст, group-by не стабилен, колонки фрагментируются",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "tasks_catalog",
          "reason": "Task.status — 4 discrete phases, board даёт progression-view"
        },
        {
          "domain": "workflow",
          "projection": "executions_catalog",
          "reason": "Execution.status как pipeline phase"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "messages_feed",
          "reason": "Message без enum-status, group-by бессмысленен"
        },
        {
          "domain": "invest",
          "projection": "positions_dashboard",
          "reason": "Position — continuous numeric, не discrete phases"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-board-group-drag-write.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Board-archetype: группирует entries по select-property (status/priority) в колонки. Drag карточки между колонками = replace целевого поля. G"
      }
    ]
  },
  {
    "id": "calendar-drag-reschedule",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "entity": "Entry",
          "role": "date"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "entry.dueDate"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Calendar-archetype: позиционирует entries на day/week/month grid по date-field. Drag в другой день = replace date. Требует mutable date-role field и intent на его замену."
    },
    "rationale": {
      "hypothesis": "Календарь единственный архетип, где геометрия ячейки прямо кодирует целевое значение. Drag вместо modal'а сворачивает rescheduling в один жест, альтернатива (open → date-picker → save) требует ≥3 кликов.",
      "evidence": [
        {
          "source": "notion",
          "description": "Calendar view + drag = replace entry.dueDate",
          "reliability": "high"
        },
        {
          "source": "google-calendar",
          "description": "Канонический drag-to-reschedule",
          "reliability": "high"
        },
        {
          "source": "airtable",
          "description": "Calendar view с drag support",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "immutable-events",
          "description": "Transaction.executedAt — исторический факт, не переносится",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "bookings_catalog",
          "reason": "Booking.startAt — mutable date, rescheduling = core use-case"
        },
        {
          "domain": "lifequest",
          "projection": "tasks_catalog",
          "reason": "Task.dueDate drag между днями"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "transactions_catalog",
          "reason": "Transaction.executedAt immutable"
        },
        {
          "domain": "messenger",
          "projection": "messages_feed",
          "reason": "Message.sentAt immutable"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-calendar-drag-reschedule.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Calendar-archetype: позиционирует entries на day/week/month grid по date-field. Drag в другой день = replace date. Требует mutable date-role"
      }
    ]
  },
  {
    "id": "inline-rename-on-enter",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "*.name"
        },
        {
          "kind": "intent-confirmation",
          "confirmation": "enter"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Name/title сущности рендерится как inline-editable в header: click → edit-mode, Enter коммитит, Esc откатывает. Без отдельной 'Rename' modal-form. Cursor-hover даёт affordance."
    },
    "rationale": {
      "hypothesis": "Rename — наиболее частая mutation над именем (view, document, project, goal). Modal для single-field — overkill. Inline-edit сохраняет focus и keyboard-первенство, коммит через Enter — conventional expectation.",
      "evidence": [
        {
          "source": "notion",
          "description": "View tab / page title rename inline click + type + enter",
          "reliability": "high"
        },
        {
          "source": "google-docs",
          "description": "Document name inline-editable в header-bar",
          "reliability": "high"
        },
        {
          "source": "figma",
          "description": "Layer name double-click rename, enter commit",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "compliance-regulated-fields",
          "description": "Поля, требующие validation/review (публичный title в sales) — inline без safeguard рискован",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "workflow_detail",
          "reason": "Workflow.name inline-rename в header"
        },
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Poll.title inline-rename"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "Portfolio.name mutable, но rename через settings-panel formal"
        },
        {
          "domain": "messenger",
          "projection": "conversation_feed",
          "reason": "DM без mutable name — group-conv rename отдельный flow"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-inline-rename-on-enter.json",
        "slot": "header",
        "primarySource": "notion",
        "description": "Name/title сущности рендерится как inline-editable в header: click → edit-mode, Enter коммитит, Esc откатывает. Без отдельной 'Rename' modal"
      }
    ]
  },
  {
    "id": "multi-archetype-view",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "View",
          "field": "archetype"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "view.archetype"
        },
        {
          "kind": "intent-creates",
          "creates": "View"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Рендерит tab-bar сохранённых view'ов + '+ Add view' (picker архетипа). Один projection spec переключается между table/board/calendar/gallery/timeline/list поверх одних данных; archetype — runtime-choice, а не compile-time."
    },
    "rationale": {
      "hypothesis": "Разные задачи требуют разных проекций одних и тех же данных (due-tracking → календарь, prioritization → board, bulk-edit → table). Жёсткая связь archetype↔projection заставляет пользователя дублировать данные или принимать субоптимальный вид.",
      "evidence": [
        {
          "source": "notion",
          "description": "Database tabs: table/board/list/calendar/gallery/timeline поверх одной collection, '+' открывает archetype picker",
          "reliability": "high"
        },
        {
          "source": "airtable",
          "description": "Views с archetype-switch: grid/kanban/calendar/gantt/gallery/form",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Issues: list ↔ board, saved views персистятся per-workspace",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "slack",
          "description": "Channel-feed монолитен — gallery/board ломает смысл conversational-thread",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "tasks_catalog",
          "reason": "Task выигрывает от board-by-status / calendar-by-dueDate / table"
        },
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Listings: grid-gallery ↔ list ↔ map — разные use-case'ы"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_feed",
          "reason": "Feed-сообщений не проецируется как board/calendar"
        },
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "Dashboard-архетип single-purpose, archetype-switching разрушает aggregation"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-multi-archetype-view.json",
        "slot": "header",
        "primarySource": "notion",
        "description": "Рендерит tab-bar сохранённых view'ов + '+ Add view' (picker архетипа). Один projection spec переключается между table/board/calendar/gallery"
      }
    ]
  },
  {
    "id": "open-detail-on-row-click",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "ui.openEntryId"
        },
        {
          "kind": "intent-confirmation",
          "confirmation": "click"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Catalog: click по row/card (но не по inline-control внутри него) открывает detail-modal/drawer/full-page для deep edit. Inline-control = shallow refine, row-click = explorative deep-dive. Жесты ортогональны."
    },
    "rationale": {
      "hypothesis": "Catalog-view даёт summary, detail нужен для long-form content, multi-field orchestration, related-entities. Разделение explorative-click ↔ inline-refine сохраняет information-density в catalog и глубину в detail.",
      "evidence": [
        {
          "source": "notion",
          "description": "Row/card click → full-page page-view, inline-edit для ячеек отдельный жест",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "Click thread → full thread view",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Click issue → full detail panel",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "pure-spreadsheet",
          "description": "В чистом spreadsheet detail отсутствует — всё inline",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Click listing → detail с описанием/photos"
        },
        {
          "domain": "lifequest",
          "projection": "tasks_catalog",
          "reason": "Click task → detail с content/subtasks"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "Dashboard — read-only aggregate, row-click семантически пуст"
        },
        {
          "domain": "messenger",
          "projection": "conversation_feed",
          "reason": "Message inline, нет отдельного detail"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-open-detail-on-row-click.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Catalog: click по row/card (но не по inline-control внутри него) открывает detail-modal/drawer/full-page для deep edit. Inline-control = sha"
      }
    ]
  },
  {
    "id": "per-view-query-state",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "View",
          "field": "filters"
        },
        {
          "kind": "entity-field",
          "entity": "View",
          "field": "sorts"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "view.filters"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "view.sorts"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Filters / sorts / groupBy живут per-view, не per-database. Toolbar/sidebar управляет query-state активной view; сохранённые view'ы = именованные query-shortcuts без дублирования данных."
    },
    "rationale": {
      "hypothesis": "Query-state (scope, order, grouping) — свойство намерения смотрящего, не данных. Персистентные именованные query экономят reconfiguration cost и дают команде shared vocabulary ('Sprint board', 'My inbox').",
      "evidence": [
        {
          "source": "notion",
          "description": "Filter/Sort/Group sidebar привязан к active view, коммит в view.filters",
          "reliability": "high"
        },
        {
          "source": "airtable",
          "description": "Каждая view хранит own filter/sort/group независимо",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Saved views с персистентным filter+grouping",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "simple-list-apps",
          "description": "Без named views query-state живёт в URL-params; per-view абстракция избыточна",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "tasks_catalog",
          "reason": "Filter-by-sphere / group-by-status — типовое query"
        },
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Saved searches выигрывают от per-view стейта"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "Dashboard про aggregation, не про фильтрацию"
        },
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Feed беседы не фильтруется как catalog"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-per-view-query-state.json",
        "slot": "toolbar",
        "primarySource": "notion",
        "description": "Filters / sorts / groupBy живут per-view, не per-database. Toolbar/sidebar управляет query-state активной view; сохранённые view'ы = именова"
      }
    ]
  },
  {
    "id": "polymorphic-rendering-by-discriminator",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "Entry",
          "field": "type",
          "fieldType": "select"
        },
        {
          "kind": "intent-count",
          "predicate": "α:add creates:Entry",
          "min": 2
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Entity с discriminator-field (type / kind) порождает per-type рендер-вариант в detail и catalog-card. Base-fields общие; specialized-fields условные per type. Create-flow разветвляется на choose-type → type-specific form."
    },
    "rationale": {
      "hypothesis": "Родственные сущности делят storage + queries + views, но отличаются в одном-двух полях. Discriminator избегает schema-fork'а при сохранении per-type specialization. Union-like polymorphism без type-explosion.",
      "evidence": [
        {
          "source": "notion",
          "description": "Task / Milestone / Doc в одной database, detail-render branches по type",
          "reliability": "high"
        },
        {
          "source": "jira",
          "description": "Issue types (Bug/Story/Epic) с per-type required fields",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Issue vs Project vs Milestone — discriminator-like",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "pure-homogeneous",
          "description": "Если все entries одной формы — discriminator усложняет ontology без value",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "assets_catalog",
          "reason": "Asset.type (stock/etf/crypto/bond) — разный рендер per-type"
        },
        {
          "domain": "planning",
          "projection": "polls_catalog",
          "reason": "Poll.kind (date/option) — две формы голосования"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_feed",
          "reason": "Conversation.kind (direct/group) — тонкое различие, не polymorphic render"
        },
        {
          "domain": "booking",
          "projection": "specialists_catalog",
          "reason": "Specialist — одна форма, discriminator отсутствует"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-polymorphic-rendering-by-discriminator.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Entity с discriminator-field (type / kind) порождает per-type рендер-вариант в detail и catalog-card. Base-fields общие; specialized-fields "
      }
    ]
  },
  {
    "id": "relation-chip-stack",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "entity": "Relation",
          "foreignKey": "fromEntryId"
        },
        {
          "kind": "entity-field",
          "entity": "Entry",
          "field": "relations",
          "multivalue": true
        },
        {
          "kind": "intent-creates",
          "creates": "Relation"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Multi-value relation рендерится как chip-stack: каждая связь = chip с title связанной сущности + inline remove-x. '+ Add' открывает inline-search с type-ahead для add-link; click-x коммитит unlink. Масштабируется от 0 до ~20 wrapping rows."
    },
    "rationale": {
      "hypothesis": "Показать title связанной сущности в месте ссылки — zero-navigation context. Chip-stack компактен, поддерживает direct-manipulation remove, деградирует gracefully при количестве. Альтернатива (список-таблица relations) избыточна для small-cardinality.",
      "evidence": [
        {
          "source": "notion",
          "description": "Relation property → chip-stack с linked page titles + remove-x",
          "reliability": "high"
        },
        {
          "source": "airtable",
          "description": "Linked record field = chip-stack pattern",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Labels / dependencies — chip-stack",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "single-fk",
          "description": "Position.asset — single FK, chip-stack избыточен (просто link + edit)",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Goal.habits — multi-relation"
        },
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Listing.tags / categories — multi-select labels"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "position_detail",
          "reason": "Position→Asset single FK, chip-stack избыточен"
        },
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Participants — assignment-entity, требует ролевой UX"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-relation-chip-stack.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Multi-value relation рендерится как chip-stack: каждая связь = chip с title связанной сущности + inline remove-x. '+ Add' открывает inline-s"
      }
    ]
  },
  {
    "id": "table-cell-inline-edit",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "predicate": "α:replace target:entry.* confirmation:enter",
          "min": 3
        },
        {
          "kind": "internal"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Table-archetype: каждое поле entity = колонка. Click на ячейку открывает type-specific inline-editor (select → pill-menu, date → popover-calendar, text → textarea, relation → search-picker). Enter коммитит, Esc откатывает, Tab идёт в следующую ячейку."
    },
    "rationale": {
      "hypothesis": "Bulk-editing требует массово менять одно поле across rows. Modal-per-row prohibitively slow. Inline cell-edit воспроизводит spreadsheet-idiom: keyboard-first, fast tabbing, zero per-row context switch.",
      "evidence": [
        {
          "source": "notion",
          "description": "Table view inline-edit per cell с type-aware редакторами",
          "reliability": "high"
        },
        {
          "source": "airtable",
          "description": "Spreadsheet-like inline edit — core differentiator",
          "reliability": "high"
        },
        {
          "source": "linear",
          "description": "Issues table click-to-edit priority/assignee/status",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "sales-critical-fields",
          "description": "Цены/валютные поля требуют explicit confirm, inline без safeguard опасен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "tasks_catalog",
          "reason": "Массовое editing title/status/priority выигрывает от табличного вида"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "transactions_catalog",
          "reason": "Transactions immutable — inline edit недопустим"
        },
        {
          "domain": "messenger",
          "projection": "conversation_feed",
          "reason": "Feed не табличен"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-table-cell-inline-edit.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Table-archetype: каждое поле entity = колонка. Click на ячейку открывает type-specific inline-editor (select → pill-menu, date → popover-cal"
      }
    ]
  },
  {
    "id": "timeline-range-drag",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "Entry",
          "field": "dateRange"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "entry.dateRange"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Timeline/Gantt-archetype: entries = bars вдоль горизонтальной временной оси по date-range field. Drag edges → replace start/end независимо, drag центра → shift обоих. Точка невозврата: требует range-тип, не точечный date."
    },
    "rationale": {
      "hypothesis": "Project-задачи имеют длительность, не момент. Gantt раскрывает overlap'ы и dependencies, недоступные в calendar (point-in-time). Drag-edges — прямой маппинг геометрии bar на значения start/end.",
      "evidence": [
        {
          "source": "notion",
          "description": "Timeline view с Gantt-bars, drag edges = replace start/end",
          "reliability": "high"
        },
        {
          "source": "asana-timeline",
          "description": "Drag-edges канонический Gantt-gesture",
          "reliability": "high"
        },
        {
          "source": "ms-project",
          "description": "Gantt как industry-standard для PM",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "todo-list",
          "description": "Point-in-time задачи (только dueDate) — timeline не даёт value, calendar достаточно",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "bookings_catalog",
          "reason": "Booking.start/end — естественный range для timeline"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "habits_catalog",
          "reason": "Habit — recurring-событие, не range"
        },
        {
          "domain": "messenger",
          "projection": "messages_feed",
          "reason": "Message — point-in-time"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-notion-database-views-schema-timeline-range-drag.json",
        "slot": "body",
        "primarySource": "notion",
        "description": "Timeline/Gantt-archetype: entries = bars вдоль горизонтальной временной оси по date-range field. Drag edges → replace start/end независимо, "
      }
    ]
  },
  {
    "id": "binary-check-badge-grid",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "kind"
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "result"
        },
        {
          "kind": "entity-kind",
          "entity": "<sub>",
          "statusValuesBinary": [
            "pass",
            "fail"
          ]
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity с бинарным статусом (pass/fail) и полем `kind` рендерится как compact badge-grid (иконка + метка kind + цвет по result), а не как text-list или table. Позволяет сканировать десятки проверок одним взглядом."
    },
    "rationale": {
      "hypothesis": "Binary-статус + discriminator (`kind`) — максимально плотный информационный формат. Badge-grid использует pre-attentive processing (цвет+иконка), освобождая когнитивный bandwidth для аномалий. Text-list теряет scan-ability при n > 5.",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "ComplianceCheck grid: AVS pass / CVC pass / 3DS pass / radar-score fail — rendered как coloured badge-grid",
          "reliability": "high"
        },
        {
          "source": "github-pr-checks",
          "description": "CI checks как vertical badge-list с green/red иконками",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "jenkins",
          "description": "Build steps с pass/fail, но с nested logs — требуется expandable list, не badge-grid",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "Если добавить DeliveryChecks (address-validated/payment-captured/zone-covered) — подходящий grid"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Vote статусы не binary pass/fail"
        },
        {
          "domain": "messenger",
          "projection": "message_detail",
          "reason": "Нет check-like sub-entity"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-binary-check-badge-grid.json",
        "slot": "sections",
        "primarySource": "stripe-dashboard",
        "description": "Sub-entity с бинарным статусом (pass/fail) и полем `kind` рендерится как compact badge-grid (иконка + метка kind + цвет по result), а не как"
      }
    ]
  },
  {
    "id": "causal-chain-timeline",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "causedById",
          "selfReference": true
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "timestamp"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity с self-referential FK (`causedById → self.id`) рендерится как causal tree/chain в хронологическом порядке, с visual-связями parent→child, а не как flat list. Root-события expanded, child-события indented/linked."
    },
    "rationale": {
      "hypothesis": "Self-referential causality несёт информацию, которая теряется при flat-рендере. User нужно видеть что `refunded` возник из-за `disputed`, а не независимо. Причинно-следственная связь — first-class структура, не декоративный attribute.",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "Payment timeline: capture → partial_refund → dispute_opened, где каждое событие указывает causedById на предыдущее",
          "reliability": "high"
        },
        {
          "source": "sentry",
          "description": "Event breadcrumbs показывают causal-chain с parent-child indentation",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "slack",
          "description": "Message thread: flat временная лента без causal-FK — паттерн не применим",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "execution_detail",
          "reason": "NodeResult с causedById указывает на upstream node — причинная цепочка"
        },
        {
          "domain": "invest",
          "projection": "position_detail",
          "reason": "Transaction.causedById для связанных операций (buy→rebalance→sell)"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Message без causedById — flat timeline"
        },
        {
          "domain": "reflect",
          "projection": "mood_history",
          "reason": "MoodEntry независимы, нет causal-FK"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-causal-chain-timeline.json",
        "slot": "sections",
        "primarySource": "stripe-dashboard",
        "description": "Sub-entity с self-referential FK (`causedById → self.id`) рендерится как causal tree/chain в хронологическом порядке, с visual-связями paren"
      }
    ]
  },
  {
    "id": "export-format-group",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "predicate": "creates-same-entity",
          "min": 2
        },
        {
          "kind": "entity-field",
          "entity": "<created>",
          "field": "format"
        },
        {
          "kind": "entity-field",
          "entity": "<created>",
          "field": "expiresAt"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Множественные intent'ы `creates:SameEntity` с варьирующимся параметром `format` группируются в single dropdown-control в toolbar (header-right). Каждый format — subaction, не отдельная кнопка."
    },
    "rationale": {
      "hypothesis": "Когда 3+ intent'а отличаются только форматом результата, рендер каждого как top-level CTA перегружает visual hierarchy. Группировка в dropdown сохраняет discoverability при низкой визуальной стоимости. Наличие `expiresAt` на created entity — сигнал что это materialization-токен (не transactional side-effect).",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "Export dropdown top-right: PDF receipt, CSV, audit log PDF, compliance report — все создают ExportToken с разным format",
          "reliability": "high"
        },
        {
          "source": "notion",
          "description": "Export-as: PDF / Markdown / HTML сгруппированы в single submenu",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "google-docs",
          "description": "File → Download — 6 форматов без expiresAt (прямой download, не share-link). Триггер expiresAt защищает от false-positive",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_detail_owner",
          "reason": "Multiple export/report intents создают ExportToken с format-param"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Множественные CTA ≠ export — share/edit/delete не format-variants"
        },
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Нет ExportToken-like entity с expiresAt"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-export-format-group.json",
        "slot": "toolbar",
        "primarySource": "stripe-dashboard",
        "description": "Множественные intent'ы `creates:SameEntity` с варьирующимся параметром `format` группируются в single dropdown-control в toolbar (header-rig"
      }
    ]
  },
  {
    "id": "immutable-snapshot-sidecar",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "capturedAt"
        },
        {
          "kind": "mirror",
          "entity": "<sub>"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Immutable point-in-time снимок связанной сущности (CustomerSnapshot, AddressSnapshot) рендерится как отдельный read-only card с явным timestamp-label «as of <capturedAt>», визуально отличающийся от live-entity (badge «snapshot», muted border)."
    },
    "rationale": {
      "hypothesis": "Snapshot vs live-Customer — принципиально разные сущности (правовой статус платежа привязан к state on capture, не current). Рендер как просто ещё один section теряет эту семантику и провоцирует ошибки («customer сменил email, почему в receipt старый?»). Визуальное отличие snapshot-card — компенсация семантики в UI.",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "Customer section в payment detail — snapshot с меткой «Customer at time of payment», отдельно от live-Customer link",
          "reliability": "high"
        },
        {
          "source": "shopify-admin",
          "description": "Order customer info с явным «Billing at order time» card",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "generic-crm",
          "description": "Contact в deal-detail — live-link, не snapshot (обновляется). Паттерн требует `capturedAt` как явный маркер immutability",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "Address snapshot на момент оформления — immutable, отличается от current address пользователя"
        },
        {
          "domain": "sales",
          "projection": "order_detail",
          "reason": "BuyerSnapshot на момент покупки — immutable legal record"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "Specialist info — live-reference, не snapshot"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Нет mirror-sub-entity"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-immutable-snapshot-sidecar.json",
        "slot": "sections",
        "primarySource": "stripe-dashboard",
        "description": "Immutable point-in-time снимок связанной сущности (CustomerSnapshot, AddressSnapshot) рендерится как отдельный read-only card с явным timest"
      }
    ]
  },
  {
    "id": "metadata-kv-readonly",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "field": "metadata",
          "semanticType": "json"
        },
        {
          "kind": "field-role-present",
          "role": "user-defined-key-value"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Поле `metadata` (открытая JSON key-value структура, задаваемая владельцем системы/integration'ом) рендерится как отдельная collapsible секция с monospace key-value list. Не inline в основном fields-block, не editable из observer-view."
    },
    "rationale": {
      "hypothesis": "Metadata — escape-hatch для интеграций, её keys заранее неизвестны и не semantic. Inline-рендер рядом с типизированными полями ломает visual hierarchy (пользователь не отличает системное поле от custom). Отдельная секция с monospace сигналит «это технический контракт, не human-content».",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "Payment.metadata как collapsed «Metadata» section с key-value monospace rows",
          "reliability": "high"
        },
        {
          "source": "kubernetes-dashboard",
          "description": "pod.metadata.labels — отдельный key-value block, не inline",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "airtable",
          "description": "Custom fields равноправны с built-in — там metadata это first-class content, не escape-hatch. Паттерн применяется только к opaque JSON, не к typed custom fields",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "transaction_detail",
          "reason": "Transaction.metadata от integration partners — opaque kv"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_detail",
          "reason": "Нет metadata-поля, а activities — typed entity"
        },
        {
          "domain": "messenger",
          "projection": "message_detail",
          "reason": "Нет opaque JSON-metadata"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-metadata-kv-readonly.json",
        "slot": "sections",
        "primarySource": "stripe-dashboard",
        "description": "Поле `metadata` (открытая JSON key-value структура, задаваемая владельцем системы/integration'ом) рендерится как отдельная collapsible секци"
      }
    ]
  },
  {
    "id": "observer-readonly-escape",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "has-role",
          "base": "observer"
        },
        {
          "kind": "intent-count",
          "scope": "role:observer",
          "predicate": "creates-entity",
          "max": 1
        },
        {
          "kind": "intent-effect",
          "scope": "role:observer",
          "irreversibility": "high"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Observer-видимый detail — read-only с единственным primaryCTA (high-irreversibility). Все остальные слоты без mutation-controls; единственный escape-hatch визуально выделен как terminal action."
    },
    "rationale": {
      "hypothesis": "Observer-роль не совершает транзакционных действий, но иногда нужен escape для компаенса / правового отклика. Единственный CTA снижает когнитивную нагрузку и делает terminal-действие очевидным (vs запрятанным в меню).",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "Payment detail для observer: read-only поля, единственный primary CTA «Dispute» с type-to-confirm",
          "reliability": "high"
        },
        {
          "source": "github-security-advisories",
          "description": "Read-only advisory view с единственной кнопкой «Report abuse»",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "linear-issue",
          "description": "Observer в Linear имеет два escape'а (report + subscribe) — паттерн требует max=1 чтобы не скатываться в кнопочный toolbar",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "position_detail_observer",
          "reason": "Observer видит position read-only с единственным dispute-like escape"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Owner-роль с множественными mutation-intents — паттерн не для owner"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Нет observer-роли и нет high-irreversibility escape"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-observer-readonly-escape.json",
        "slot": "primaryCTA",
        "primarySource": "stripe-dashboard",
        "description": "Observer-видимый detail — read-only с единственным primaryCTA (high-irreversibility). Все остальные слоты без mutation-controls; единственны"
      }
    ]
  },
  {
    "id": "raw-payload-developer-section",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "payload",
          "semanticType": "json"
        },
        {
          "kind": "entity-field",
          "entity": "<sub>",
          "field": "type"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity с полем `payload` (raw API object) рендерится в двух параллельных проекциях: human-readable timeline (type+actor+reason) сверху, collapsed «Raw events» с pretty-printed JSON снизу. Developer-toggle, не primary view."
    },
    "rationale": {
      "hypothesis": "Observer'у с dev-background нужен raw payload для debug / webhook-reconciliation, но human-user не должен тонуть в JSON. Дублирование проекций одного dataset'а закрывает оба запроса без context-switching в другой tool (Postman / API explorer).",
      "evidence": [
        {
          "source": "stripe-dashboard",
          "description": "Payment detail: «Timeline» (human) + «Events» (raw JSON payload, collapsed) — две проекции PaymentEvent",
          "reliability": "high"
        },
        {
          "source": "github-webhook-deliveries",
          "description": "Request/response payload как раскрываемый JSON-блок рядом с human summary",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "slack-message",
          "description": "Message.blocks — JSON есть, но developer-view через API, не inline в UI. Паттерн требует что raw-view — часть detail-projection, не deep-link",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "execution_detail",
          "reason": "NodeResult.payload — human log + raw-view нужны developer-пользователю"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "habit_detail",
          "reason": "HabitLog — human-only, нет developer-audience"
        },
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "Нет event-sub-entity с payload-полем"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-payments-observer-export-raw-payload-developer-section.json",
        "slot": "sections",
        "primarySource": "stripe-dashboard",
        "description": "Sub-entity с полем `payload` (raw API object) рендерится в двух параллельных проекциях: human-readable timeline (type+actor+reason) сверху, "
      }
    ]
  },
  {
    "id": "computed-preview-setter",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "mainEntity.durationField"
        },
        {
          "kind": "field-role-present",
          "roles": [
            "duration",
            "date"
          ],
          "minCount": 2
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "fields": [
            "trialEnd",
            "endDate",
            "expiresAt"
          ],
          "anyOf": true
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Setter для поля-длительности (days, intervalCount) рендерится рядом с live-preview вычисленной абсолютной даты (trialEnd = now + N days), давая пользователю подтверждение semantic-контракта."
    },
    "rationale": {
      "hypothesis": "Relative-input (количество дней) скрывает concrete outcome; показывая computed absolute date рядом с вводом, UI превращает implicit temporal contract в explicit.",
      "evidence": [
        {
          "source": "stripe-subscriptions",
          "description": "При выборе 14 days trial показывается «trialEnd: May 2, 2026»",
          "reliability": "high"
        },
        {
          "source": "github-pr-auto-merge",
          "description": "Scheduled merge показывает вычисленное время merge",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "slack-snooze",
          "description": "Snooze показывает только duration-button без computed time — пользователь доверяет коротким intervals",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "booking_create",
          "reason": "Duration slot → computed endTime"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Goal с deadline offset от now"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Duration-полей нет"
        },
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Price-поля не имеют temporal preview"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-subscriptions-preapproval-computed-preview-setter.json",
        "slot": "body",
        "primarySource": "stripe-subscriptions",
        "description": "Setter для поля-длительности (days, intervalCount) рендерится рядом с live-preview вычисленной абсолютной даты (trialEnd = now + N days), да"
      }
    ]
  },
  {
    "id": "grouped-reference-picker",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "targetMatches": ".*\\.[a-z]+Id$"
        },
        {
          "kind": "reference",
          "entity": "targetReference"
        },
        {
          "kind": "sub-entity-exists",
          "childOf": "targetReference",
          "viaForeignKey": true
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Picker для reference-поля группирует кандидатов по их parent-entity (через foreignKey), отображая parent как заголовок секции и child как выбираемые элементы с distinguishing-полями (recurringInterval, currency)."
    },
    "rationale": {
      "hypothesis": "Когда выбираемая сущность имеет FK на parent (Price→Product, Variant→Product, Option→Poll), плоский список теряет контекст; группировка по parent даёт семантическую иерархию и ускоряет поиск.",
      "evidence": [
        {
          "source": "stripe-subscriptions",
          "description": "Price picker показывает цены сгруппированными под Product-name, с badge интервала",
          "reliability": "high"
        },
        {
          "source": "shopify-variant-picker",
          "description": "Variant выбирается в рамках Product header'а",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "linear-assignee-picker",
          "description": "User picker плоский, без группировки по Team — имена уникальны и достаточны",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "asset_picker",
          "reason": "Asset имеет ticker+exchange иерархию — естественная группировка"
        },
        {
          "domain": "delivery",
          "projection": "menu_item_picker",
          "reason": "MenuItem сгруппирован по Merchant"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "contact_picker",
          "reason": "Contact — плоский список без parent-иерархии"
        },
        {
          "domain": "booking",
          "projection": "time_slot_picker",
          "reason": "TimeSlot группируется по дню, не по reference-entity"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-subscriptions-preapproval-grouped-reference-picker.json",
        "slot": "body",
        "primarySource": "stripe-subscriptions",
        "description": "Picker для reference-поля группирует кандидатов по их parent-entity (через foreignKey), отображая parent как заголовок секции и child как вы"
      }
    ]
  },
  {
    "id": "lifecycle-locked-parameters",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "childOf": "mainEntity",
          "nameMatches": ".*Preapproval$"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "status",
          "includes": "active"
        },
        {
          "kind": "intent-count",
          "min": 1,
          "filter": {
            "α": "replace",
            "targetPrefix": "mainEntity."
          }
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Preapproval-сущность (агентские лимиты, captured at creation) рендерится в mainEntity detail как read-only secondary section после status-транзиции в active, с явным «locked after activation» маркером."
    },
    "rationale": {
      "hypothesis": "Поля с lifecycle-contract (captured-at-create, immutable-after-activation) требуют двух режимов отображения: writable во время create-wizard, read-only с explainer после активации — иначе пользователь теряет visibility почему не может редактировать.",
      "evidence": [
        {
          "source": "stripe-subscriptions",
          "description": "Preapproval параметры (maxAmountPerCycle, maxCycles) собираются в create-wizard и потом отображаются read-only в subscription detail с пометкой «Set at creation»",
          "reliability": "high"
        },
        {
          "source": "aws-iam-role-trust-policy",
          "description": "Trust policy editable до attach, frozen после — UI меняет режим",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "notion-page-properties",
          "description": "Все properties всегда editable — нет lifecycle-lock",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "agent_preapproval_detail",
          "reason": "AgentPreapproval в invest — frozen после confirm"
        },
        {
          "domain": "delivery",
          "projection": "agent_preapproval_detail",
          "reason": "Delivery agent preapproval locked после активации"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Goal — все поля editable в течение lifecycle"
        },
        {
          "domain": "reflect",
          "projection": "hypothesis_detail",
          "reason": "Hypothesis не имеет preapproval / locked-after-activation семантики"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-subscriptions-preapproval-lifecycle-locked-parameters.json",
        "slot": "sections",
        "primarySource": "stripe-subscriptions",
        "description": "Preapproval-сущность (агентские лимиты, captured at creation) рендерится в mainEntity detail как read-only secondary section после status-тр"
      }
    ]
  },
  {
    "id": "resumable-wizard-with-draft",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 4,
          "filter": {
            "α": "replace",
            "targetPrefix": "subscriptionDraft."
          }
        },
        {
          "kind": "intent-creates",
          "entity": "mainEntity",
          "confirmation": "form"
        },
        {
          "kind": "intent-effect",
          "α": "add",
          "creates": "mainEntity",
          "idMatches": "save_draft_.*"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "status",
          "includes": "draft"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Оборачивает серию `replace` интентов на черновой сущности (xxxDraft.*) в линейный wizard с back-navigation и save-as-draft CTA, фиксируя финальный commit через form-confirmation на создающем intent."
    },
    "rationale": {
      "hypothesis": "Когда создание сущности требует ≥4 независимых параметров и финальный commit необратим, линейный wizard с сохранением черновика снижает когнитивную нагрузку и риск потери данных по сравнению с одностраничной формой или hero-create модалкой.",
      "evidence": [
        {
          "source": "stripe-subscriptions",
          "description": "Create Subscription разбит на 5 шагов (customer → price → trial → collection → metadata → review) с save-as-draft и back-navigation",
          "reliability": "high"
        },
        {
          "source": "shopify-admin",
          "description": "Product create в админке — multi-step wizard с автосохранением черновика",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "linear-issue-create",
          "description": "Issue создаётся одной inline-формой без wizard — 2-3 обязательных поля, irreversibility низкая",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_create",
          "reason": "Listing создаётся с много-параметровым flow (категория, цена, фото, описание, аукцион vs fixed) и черновиком"
        },
        {
          "domain": "workflow",
          "projection": "workflow_builder",
          "reason": "Workflow строится пошагово с возможностью save-as-draft"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_entry_create",
          "reason": "MoodEntry — короткая одностраничная форма без черновика"
        },
        {
          "domain": "messenger",
          "projection": "conversation_compose",
          "reason": "Сообщение отправляется композером, а не wizard'ом"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-subscriptions-preapproval-resumable-wizard-with-draft.json",
        "slot": "body",
        "primarySource": "stripe-subscriptions",
        "description": "Оборачивает серию `replace` интентов на черновой сущности (xxxDraft.*) в линейный wizard с back-navigation и save-as-draft CTA, фиксируя фин"
      }
    ]
  },
  {
    "id": "review-summary-before-irreversible",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "add",
          "creates": "mainEntity",
          "irreversibility": "high"
        },
        {
          "kind": "intent-confirmation",
          "intentMatches": "create_.*",
          "confirmation": "form"
        },
        {
          "kind": "intent-count",
          "min": 4,
          "filter": {
            "α": "replace",
            "targetPrefix": "mainEntityDraft."
          }
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Перед irreversible create-button рендерится read-only summary всех собранных draft-полей, группированных по секциям wizard'а, с возможностью back-навигации к каждой секции."
    },
    "rationale": {
      "hypothesis": "irreversible-confirm (single dialog) недостаточен когда собрано ≥4 параметров; read-only review снижает вероятность случайного commit неверного параметра, сохраняя возможность точечного исправления.",
      "evidence": [
        {
          "source": "stripe-subscriptions",
          "description": "Финальный step — «Review» с всеми параметрами и «Edit» ссылками на каждую секцию",
          "reliability": "high"
        },
        {
          "source": "aws-console-create-instance",
          "description": "«Review and launch» — обязательный шаг перед созданием EC2",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "figma-file-delete",
          "description": "Один irreversible dialog достаточен — action atomic, нет составных параметров",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_publish",
          "reason": "Publish listing — irreversible commit многопараметрового draft"
        },
        {
          "domain": "delivery",
          "projection": "order_checkout",
          "reason": "Order confirm — review перед irreversible capture_payment"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "message_send",
          "reason": "Send сообщения — 1-параметр, review излишен"
        },
        {
          "domain": "lifequest",
          "projection": "habit_log",
          "reason": "Habit check-in — atomic, не irreversible"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-subscriptions-preapproval-review-summary-before-irreversible.json",
        "slot": "primaryCTA",
        "primarySource": "stripe-subscriptions",
        "description": "Перед irreversible create-button рендерится read-only summary всех собранных draft-полей, группированных по секциям wizard'а, с возможностью"
      }
    ]
  },
  {
    "id": "soft-hard-termination-pair",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "targetMatches": "mainEntity\\.(cancelAt|endDate|scheduledTermination).*"
        },
        {
          "kind": "intent-effect",
          "α": "remove",
          "entity": "mainEntity",
          "irreversibility": "high"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "status",
          "includes": "active"
        }
      ]
    },
    "structure": {
      "slot": "footer",
      "description": "Два termination-intent'а на mainEntity подаются как пара в dangerZone footer: мягкий (schedule at period end — reversible) как primary, необратимый (immediate) как secondary с явным ирр-маркером."
    },
    "rationale": {
      "hypothesis": "Когда сущность имеет lifecycle и прекращение имеет два режима (graceful vs immediate), представление их как связанной пары с явной иерархией снижает accidental-destruction и делает reversibility explicit.",
      "evidence": [
        {
          "source": "stripe-subscriptions",
          "description": "Cancel subscription — «At period end» (default) vs «Immediately» (confirm dialog)",
          "reliability": "high"
        },
        {
          "source": "github-repo-settings",
          "description": "Archive (soft) vs Delete (hard) репо — visually pair в danger zone",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "linear-issue-archive",
          "description": "Только soft-вариант (archive), hard-delete через settings-уровень — не пара на detail",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "position_detail",
          "reason": "Close position: schedule vs market-order immediate"
        },
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "Cancel booking: до 24h grace vs immediate с penalty"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "message_detail",
          "reason": "Message delete — только immediate, нет soft-варианта"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "MoodEntry не имеет lifecycle / termination"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-stripe-subscriptions-preapproval-soft-hard-termination-pair.json",
        "slot": "footer",
        "primarySource": "stripe-subscriptions",
        "description": "Два termination-intent'а на mainEntity подаются как пара в dangerZone footer: мягкий (schedule at period end — reversible) как primary, необ"
      }
    ]
  },
  {
    "id": "hierarchical-hotkey-namespace",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "minimum": 20
        },
        {
          "kind": "intent-confirmation",
          "value": "click",
          "minimum": 5
        }
      ]
    },
    "structure": {
      "slot": "overlay",
      "description": "Hotkey-пространство организовано как префиксные комбо ('G' → go, затем I/D/S для folder), не плоский список одиночных клавиш; chord inspector показывает доступные вторые клавиши после первой."
    },
    "rationale": {
      "hypothesis": "Плоский hotkey-space ограничен ~26 буквами и Modifier'ами, быстро достигает коллизий. Иерархические chord'ы (G→I) дают экспоненциальное пространство (26² = 676) при сохранении однозначного mnemonics через семантическую группировку ('G для Go').",
      "evidence": [
        {
          "source": "superhuman-inbox",
          "description": "G I — Go Inbox, G D — Go Done, G S — Go Snoozed, G T — Go Sent. Семантическая префиксация стабильна across категорий.",
          "reliability": "high"
        },
        {
          "source": "vim-editor",
          "description": "Десятилетиями доказанная модель chord-композиции (d i w — delete inner word).",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "casual-webapp",
          "description": "Для редких пользователей chord'ы неоткрываемы без явной UI-подсказки; одиночные клавиши проще.",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "seller_workspace",
          "reason": "225 интентов требуют иерархической группировки (G для navigate, C для create, B для bids)."
        },
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "100 интентов, естественные группы (navigate / mutate / compose)."
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "booking_flow",
          "reason": "22 интента умещаются в плоский hotkey-space без коллизий."
        },
        {
          "domain": "planning",
          "projection": "poll_vote",
          "reason": "Точечная задача голосования, chord-overhead неоправдан."
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-hierarchical-hotkey-namespace.json",
        "slot": "overlay",
        "primarySource": "superhuman-inbox",
        "description": "Hotkey-пространство организовано как префиксные комбо ('G' → go, затем I/D/S для folder), не плоский список одиночных клавиш; chord inspecto"
      }
    ]
  },
  {
    "id": "inline-text-expansion",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "trigger"
        },
        {
          "kind": "intent-effect",
          "alpha": "replace",
          "target": "*.body"
        }
      ]
    },
    "structure": {
      "slot": "composer",
      "description": "Composer наблюдает за ввводом и при матче паттерна (';abc', ':mycode') атомарно заменяет trigger-строку на associated body; без явной команды/модала — запуск = сам паттерн."
    },
    "rationale": {
      "hypothesis": "Частый reusable-текст (шаблоны ответов, подписи) — низкоэнтропийный ввод. Template-picker требует сменить поле, выбрать, подтвердить — 3 действия. Pattern-typing делает expansion нулевым по стоимости переключения: пользователь не 'выбирает шаблон', он 'пишет быстрее'.",
      "evidence": [
        {
          "source": "superhuman-inbox",
          "description": "Snippets: ';ty' → 'Thank you for reaching out...'; замена происходит при пробеле/enter.",
          "reliability": "high"
        },
        {
          "source": "text-expander",
          "description": "Отдельный продукт построен вокруг этого pattern — доказал утилитарность на 10y+ рынке.",
          "reliability": "high"
        },
        {
          "source": "slack-emoji",
          "description": ":smile: → 😄 — тот же механизм pattern→replacement без UI-overlay.",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "legal-document-drafting",
          "description": "Для редкоиспользуемых, длинных шаблонов поиск в picker'е лучше — пользователь не помнит триггер.",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "composer_thread",
          "reason": "Snippet + Draft.body — прямая реализация."
        },
        {
          "domain": "sales",
          "projection": "seller_message_compose",
          "reason": "Частые шаблонные ответы покупателям — снимает боль копи-паста."
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "place_order",
          "reason": "Числовые поля — нет текстового тела для expansion."
        },
        {
          "domain": "reflect",
          "projection": "mood_entry",
          "reason": "Mood — slider, не свободный текст; expansion нерелевантен."
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-inline-text-expansion.json",
        "slot": "composer",
        "primarySource": "superhuman-inbox",
        "description": "Composer наблюдает за ввводом и при матче паттерна (';abc', ':mycode') атомарно заменяет trigger-строку на associated body; без явной команд"
      }
    ]
  },
  {
    "id": "master-detail-split-pane",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "parent": "mainEntity",
          "foreignKey": "required"
        },
        {
          "kind": "intent-effect",
          "alpha": "replace",
          "target": "feed.selection"
        },
        {
          "kind": "intent-count",
          "filter": {
            "target": "feed.selection"
          },
          "minimum": 2
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Feed рендерится двухпанельно: список mainEntity слева, детальный pane (детали + sub-entity) справа; навигация next/prev изменяет feed.selection, не открывая отдельную страницу."
    },
    "rationale": {
      "hypothesis": "Когда mainEntity имеет плотный sub-entity граф (Message, комментарии), разделённая панель сохраняет контекст списка и снижает стоимость быстрой навигации — в отличие от drill-in, где каждая сущность — отдельная страница.",
      "evidence": [
        {
          "source": "superhuman-inbox",
          "description": "Left pane — conversation list; right pane — thread с inline композером. J/K циклирует selection без перерисовки списка.",
          "reliability": "high"
        },
        {
          "source": "linear-issues",
          "description": "Аналогичный two-pane: список задач + детальный pane с комментариями.",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "sales-listing-catalog",
          "description": "Для карточных каталогов с visual-heavy товарами split-pane съедает пространство превью.",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "Conversation → Message сущностная пара, keyboard-friendly selection."
        },
        {
          "domain": "reflect",
          "projection": "entries_feed",
          "reason": "Entry → EntryActivity/EntryTag sub-entities, удобно держать детальный разрез рядом."
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Catalog-архетип оптимизирован под карточный grid, не split-pane."
        },
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "Dashboard-архетип, нет линейного списка с детальным поведением."
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-master-detail-split-pane.json",
        "slot": "body",
        "primarySource": "superhuman-inbox",
        "description": "Feed рендерится двухпанельно: список mainEntity слева, детальный pane (детали + sub-entity) справа; навигация next/prev изменяет feed.select"
      }
    ]
  },
  {
    "id": "saved-filter-as-folder",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "filterRule"
        },
        {
          "kind": "reference"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Feed-навигация показывает не физические папки, а сохранённые фильтры как first-class объекты; переключение между ними = смена feed.query/feed.folderId без физического перемещения сущностей."
    },
    "rationale": {
      "hypothesis": "Пользователю нужны разрезы одного корпуса сущностей, не коробки-для-хранения. Сохранённый фильтр как folder снимает mental-overhead 'куда я это положил' и даёт композируемые разрезы поверх одного источника истины.",
      "evidence": [
        {
          "source": "superhuman-inbox",
          "description": "Split Inbox — пять 'папок' (VIP, News, Other, ...), но Conversation физически не перемещается, только фильтруется по sender category.",
          "reliability": "high"
        },
        {
          "source": "gmail-labels",
          "description": "Labels = tags + saved search; letter может быть в нескольких labels одновременно.",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "files-folders",
          "description": "Физическая иерархия файловой системы — folder = location, filter не эквивалентен.",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "saved_searches_feed",
          "reason": "SavedSearch как именованный filter поверх Listing — архетипично соответствует."
        },
        {
          "domain": "messenger",
          "projection": "split_inbox",
          "reason": "Прямая реализация Superhuman-подобной split-логики."
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Position-в-Portfolio — владение, не фильтр (смена Portfolio физически меняет Φ)."
        },
        {
          "domain": "workflow",
          "projection": "workflow_canvas",
          "reason": "Node-в-Workflow — структурная принадлежность, не разрез."
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-saved-filter-as-folder.json",
        "slot": "header",
        "primarySource": "superhuman-inbox",
        "description": "Feed-навигация показывает не физические папки, а сохранённые фильтры как first-class объекты; переключение между ними = смена feed.query/fee"
      }
    ]
  },
  {
    "id": "tab-cycle-composer-focus",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "*"
        },
        {
          "kind": "intent-confirmation",
          "value": "enter"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "minFields": 3
        }
      ]
    },
    "structure": {
      "slot": "composer",
      "description": "Inline composer для создаваемой сущности циклирует фокус между полями через Tab/Shift+Tab вместо click-to-focus; Enter подтверждает из любого поля (не только 'submit')."
    },
    "rationale": {
      "hypothesis": "В keyboard-first среде переход 'руки → мышь → руки' съедает флоу. Tab-цикл даёт предсказуемый O(1) переход между полями без leaving home-row; composer ведёт себя как единое state-поле, не как набор виджетов.",
      "evidence": [
        {
          "source": "superhuman-inbox",
          "description": "To → Subject → Body циклично через Tab; Enter отправляет из body.",
          "reliability": "high"
        },
        {
          "source": "gmail-compose",
          "description": "Аналогичная схема — Tab между полями, Cmd+Enter отправка.",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "long-form-editor",
          "description": "В редакторе с множеством inline-widgets Tab должен означать 'отступ', не 'следующее поле'.",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "composer_thread",
          "reason": "Draft с recipients/subject/body — канонический случай."
        },
        {
          "domain": "sales",
          "projection": "listing_create_form",
          "reason": "Listing с title/price/description — ≥3 поля, часто создаются power-user'ами."
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "habit_quick_add",
          "reason": "Один text-input, циклирование не нужно."
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_slider",
          "reason": "Основной ввод — slider Mood Meter, не текстовый form."
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-tab-cycle-composer-focus.json",
        "slot": "composer",
        "primarySource": "superhuman-inbox",
        "description": "Inline composer для создаваемой сущности циклирует фокус между полями через Tab/Shift+Tab вместо click-to-focus; Enter подтверждает из любог"
      }
    ]
  },
  {
    "id": "temporal-preset-picker",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "alpha": "replace",
          "target": "*.<temporal-field>"
        },
        {
          "kind": "field-role-present",
          "role": "timestamp-future"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Setter temporal-поля показывает короткий список пресетов ('1h', 'tomorrow', 'next week') + escape-hatch 'custom date'; datepicker не первичный путь."
    },
    "rationale": {
      "hypothesis": "Распределение значений для будущих временных полей сильно скошено к 3–5 типовым сценариям ('через час', 'завтра утром'). Пресеты экономят 2–3 клика в 80% случаев, datepicker остаётся для хвоста.",
      "evidence": [
        {
          "source": "superhuman-inbox",
          "description": "Snooze: Later today / Tomorrow / This weekend / Next week / Pick a date.",
          "reliability": "high"
        },
        {
          "source": "todoist-quick-add",
          "description": "Due-date: Today / Tomorrow / Next week / Custom; natural-language добавляет 4-й режим.",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "calendar-scheduling",
          "description": "Выбор конкретной встречи — пресеты нерелевантны, нужен свободный datepicker.",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "booking_reschedule",
          "reason": "Reschedule TimeSlot — типовые сдвиги ('next week, same time')."
        },
        {
          "domain": "lifequest",
          "projection": "habit_snooze",
          "reason": "Отложить привычку — 'tomorrow / next week' покрывает большинство."
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_time_options",
          "reason": "Голосование по конкретным слотам — пресеты не подходят, нужен точный выбор."
        },
        {
          "domain": "invest",
          "projection": "asset_price_update",
          "reason": "Поле не временное."
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-18-superhuman-inbox-keyboard-temporal-preset-picker.json",
        "slot": "primaryCTA",
        "primarySource": "superhuman-inbox",
        "description": "Setter temporal-поля показывает короткий список пресетов ('1h', 'tomorrow', 'next week') + escape-hatch 'custom date'; datepicker не первичн"
      }
    ]
  },
  {
    "id": "capability-gated-section",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "contactsVisibility"
        },
        {
          "kind": "has-role",
          "role": "viewer"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Section рендерится с placeholder-контентом (blur / locked icon / CTA 'Войдите чтобы увидеть' или 'Доступно для PRO') когда viewer-role не имеет capability; при наличии capability — полный контент. Gate читается из entity-поля + role.capabilities."
    },
    "rationale": {
      "hypothesis": "Hidden section (полностью убирать из DOM) ломает discovery: пользователь не знает, что capability существует, и не конвертируется в upgrade. Shown-but-gated создаёт явный upsell-pathway и сохраняет structural integrity projection'а для всех ролей.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "Contacts фрилансера — серый блок 'Контакты доступны PRO-заказчикам' + CTA апгрейда",
          "reliability": "high"
        },
        {
          "source": "linkedin",
          "description": "'See full profile — sign in' на public-view — та же механика",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "banking-apps",
          "description": "Private sections полностью скрыты до auth — security-context, gate-с-preview небезопасен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Seller contacts — capability-gated для non-buyers"
        },
        {
          "domain": "invest",
          "projection": "advisor_detail",
          "reason": "Advisor contacts gated по tier клиента"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Участники conversation имеют full access по определению (auth-gate на уровне projection'а)"
        },
        {
          "domain": "workflow",
          "projection": "workflow_detail",
          "reason": "Workflow — internal entity, capability-gating не применимо"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-capability-gated-section.json",
        "slot": "sections",
        "primarySource": "fl-ru",
        "description": "Section рендерится с placeholder-контентом (blur / locked icon / CTA 'Войдите чтобы увидеть' или 'Доступно для PRO') когда viewer-role не им"
      }
    ]
  },
  {
    "id": "category-partitioned-feed",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "entity": "Category"
        },
        {
          "kind": "entity-field",
          "entity": "Category",
          "field": "parentId"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "category"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Feed разбивается на именованные секции по первому уровню hierarchical Category (parentId=null) с счётчиком на каждой секции; порядок секций — по total count убыванию."
    },
    "rationale": {
      "hypothesis": "Категориальная группировка снимает когнитивную нагрузку при большом объёме разнородных записей: пользователь сканирует не N сущностей, а K категорий, и заходит в одну. Flat-feed работает только когда все элементы — вариации одного класса.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "Главная страница проектов — лента сгруппирована по 'Веб-разработка / Дизайн / Тексты / ...' с счётчиком и ссылкой 'Все'",
          "reliability": "high"
        },
        {
          "source": "avito",
          "description": "Категории верхнего уровня — точки входа, каждая раскрывается в свою ленту",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "twitter",
          "description": "Timeline без категориальной группировки — все tweets равноправны, partition убил бы ценность хронологии",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Listing.category + Category.parentId существуют — классический marketplace-сценарий"
        },
        {
          "domain": "delivery",
          "projection": "menu_catalog",
          "reason": "MenuItem+Zone допускают категориальный partition по зоне/типу кухни"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_feed",
          "reason": "Нет Category-сущности, conversation — flat timeline"
        },
        {
          "domain": "reflect",
          "projection": "mood_timeline",
          "reason": "Timeline-shape не должен партиционироваться, хронология — основной signal"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-category-partitioned-feed.json",
        "slot": "body",
        "primarySource": "fl-ru",
        "description": "Feed разбивается на именованные секции по первому уровню hierarchical Category (parentId=null) с счётчиком на каждой секции; порядок секций "
      }
    ]
  },
  {
    "id": "derived-presence-indicator",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "lastSeenAt"
        },
        {
          "kind": "field-role-present",
          "role": "datetime"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Derived boolean online = (now - lastSeenAt < N мин) рендерится как цветной dot на avatar + text-chip 'Онлайн' / 'Был N минут назад'; в toolbar добавляется filter-toggle 'Онлайн сейчас' и sort option 'По активности'."
    },
    "rationale": {
      "hypothesis": "Presence — derived property, но UI должен трактовать её как first-class: пользователь фильтрует именно по 'сейчас доступен', не по абсолютному timestamp. Show-raw-datetime ломает сканирование (нужен mental-math), show-только-bool теряет nuance для долго-отсутствующих.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "Зелёная точка + 'Онлайн сейчас' фильтр в каталоге фрилансеров",
          "reliability": "high"
        },
        {
          "source": "telegram",
          "description": "Last seen + online dot — same derived-from-timestamp механика",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "github-commits",
          "description": "lastCommitAt есть, но 'online' не выводится — developer-context не требует real-time presence",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "contact_list",
          "reason": "User.lastSeenAt уже есть, presence — natural signal"
        },
        {
          "domain": "booking",
          "projection": "specialist_catalog",
          "reason": "Specialist с lastSeenAt для 'активный сейчас' фильтра"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "position_list",
          "reason": "Position не имеет presence — данные, не агенты"
        },
        {
          "domain": "workflow",
          "projection": "workflow_catalog",
          "reason": "Workflow — статичный артефакт, presence не применима"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-derived-presence-indicator.json",
        "slot": "body",
        "primarySource": "fl-ru",
        "description": "Derived boolean online = (now - lastSeenAt < N мин) рендерится как цветной dot на avatar + text-chip 'Онлайн' / 'Был N минут назад'; в toolb"
      }
    ]
  },
  {
    "id": "emphasis-priority-card",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "role": "money"
        },
        {
          "kind": "field-role-present",
          "role": "datetime"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "description"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Карточка жёстко ранжирует поля: title (H-level) → money/budget (prominent) → datetime/deadline (secondary) → description (truncated 3 lines, muted); emphasisFields: [title, budget, deadline]. Description как fallback для skimmability, не primary channel."
    },
    "rationale": {
      "hypothesis": "При сканировании listing-каталога пользователь принимает решение 'стоит ли открывать' за <1s: decision-критерии — scope (title), стоимость (money), срочность (deadline); description занимает место, но читается только после клика. Equal-emphasis на description ломает сканирование, full-hide — лишает контекста.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "Карточка проекта: крупный title + бюджет справа + deadline под ним, description truncate до 3 строк серым",
          "reliability": "high"
        },
        {
          "source": "airbnb-listing-card",
          "description": "Price prominent, description обрезан — та же emphasis-приоритизация",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "medium-article-card",
          "description": "Description (preview) важнее metadata — контент-first domain, emphasis на тексте",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Listing с price+createdAt+description — классический commerce-card"
        },
        {
          "domain": "delivery",
          "projection": "menu_catalog",
          "reason": "MenuItem с price+name+description"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "message_feed",
          "reason": "Message — content-first, truncation description'а убивает смысл"
        },
        {
          "domain": "reflect",
          "projection": "mood_timeline",
          "reason": "MoodEntry — reflective text есть content, не secondary"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-emphasis-priority-card.json",
        "slot": "body",
        "primarySource": "fl-ru",
        "description": "Карточка жёстко ранжирует поля: title (H-level) → money/budget (prominent) → datetime/deadline (secondary) → description (truncated 3 lines,"
      }
    ]
  },
  {
    "id": "paid-modifier-composer",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "creates": "mainEntity"
        },
        {
          "kind": "intent-count",
          "min": 2,
          "filter": {
            "α": "replace",
            "target": "mainEntity.{boost_flag}"
          }
        }
      ]
    },
    "structure": {
      "slot": "composer",
      "description": "Create-form получает collapsed секцию 'Продвижение' с upsell-стилизованными toggles (Поднять в топ / Выделить / PRO-only) и derived-total в CTA: 'Опубликовать за X ₽'; каждый toggle — отдельный paid-modifier intent, агрегируется в single submit."
    },
    "rationale": {
      "hypothesis": "Разделение create + post-create promotion даёт drop-off: пользователь кристаллизует базовый артефакт, откладывает promotion на 'потом' и не возвращается. Bundled-at-creation снимает frame-switch, но должен визуально отличаться от обязательных полей (upsell-styling + derived price), иначе воспринимается как скрытая плата.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "В create-form проекта — секция с чекбоксами 'Поднять' / 'Выделить' / 'Только PRO' и итоговой ценой",
          "reliability": "high"
        },
        {
          "source": "avito-submit",
          "description": "VIP/TOP опции в submit-form объявления",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "github-issue-create",
          "description": "Issue creation без paid-modifiers — community-domain не монетизирован",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Listing creation с boost/feature полями — marketplace-natural"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_entry_form",
          "reason": "MoodEntry — personal, нет boost-полей"
        },
        {
          "domain": "workflow",
          "projection": "workflow_catalog",
          "reason": "Workflow creation — internal, нет monetization"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-paid-modifier-composer.json",
        "slot": "composer",
        "primarySource": "fl-ru",
        "description": "Create-form получает collapsed секцию 'Продвижение' с upsell-стилизованными toggles (Поднять в топ / Выделить / PRO-only) и derived-total в "
      }
    ]
  },
  {
    "id": "paid-visibility-elevation",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "isPromoted"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "mainEntity.isPromoted"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Карточки с isPromoted=true рендерятся с визуальным uplift (фон-bleed, звезда, pinning в верх блока) и группируются в отдельную 'Promoted' полосу над основной лентой; replace-intent на isPromoted даёт author-uplift UI (paid upsell)."
    },
    "rationale": {
      "hypothesis": "Monetized visibility boost — отдельный паттерн от regular sort: requires visual differentiation (иначе unfair advantage неочевиден автору и читателю) и separate slot (иначе ломает ранжирование). Naive highlight через bold/colored border не работает — читатель игнорирует как декор.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "'Проект дня' — bleed-через-фон + золотая звезда, отделён от основной ленты",
          "reliability": "high"
        },
        {
          "source": "avito",
          "description": "'VIP' и 'Выделенные' объявления — top-pinned полоса с иконкой",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "github-issues",
          "description": "Pinned issues — структурно похоже, но не monetized; читатель ожидает maintainer-intent, не рекламу",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Listing с featured/boosted полем — marketplace-паттерн"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_overview",
          "reason": "Position не имеет paid-boost поля — элевация сломала бы объективность данных"
        },
        {
          "domain": "reflect",
          "projection": "mood_timeline",
          "reason": "MoodEntry не монетизируется, personal-domain"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-paid-visibility-elevation.json",
        "slot": "body",
        "primarySource": "fl-ru",
        "description": "Карточки с isPromoted=true рендерятся с визуальным uplift (фон-bleed, звезда, pinning в верх блока) и группируются в отдельную 'Promoted' по"
      }
    ]
  },
  {
    "id": "reverse-invite-flow",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "entity": "Invitation",
          "foreignKey": "projectId"
        },
        {
          "kind": "intent-creates",
          "creates": "Invitation"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "invitation.status"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Detail-проекция получает section 'Приглашённые' со списком Invitation + CTA 'Пригласить ещё' (ведёт в каталог target-entity с multi-select); target-role видит inbox-секцию на своём detail с accept/decline кнопками."
    },
    "rationale": {
      "hypothesis": "Reverse-flow (owner → target) отличается от классического application-flow (target → owner): инициатор — владелец контейнера, не кандидат, поэтому UI-entry point должен быть на detail контейнера, не в feed target'ов. Flat 'apply' список не покрывает m2m-invite семантику, где обе стороны подтверждают.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "На detail проекта — 'Пригласить фрилансера' ведёт в каталог с чекбоксами; у фрилансера — inbox приглашений",
          "reliability": "high"
        },
        {
          "source": "linkedin-recruiter",
          "description": "InMail к кандидату от recruiter'а — тот же reverse-pattern",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "stackoverflow-answers",
          "description": "Answer — pure forward flow (respondent инициирует), invite не применим",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Poll-owner приглашает участников — Invitation sub-entity через poll"
        },
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "Customer приглашает альтернативных специалистов"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "sales",
          "projection": "bid_detail",
          "reason": "Bid — forward-only (bidder инициирует), не invite"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "Personal entity, invite-механика не применима"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-reverse-invite-flow.json",
        "slot": "sections",
        "primarySource": "fl-ru",
        "description": "Detail-проекция получает section 'Приглашённые' со списком Invitation + CTA 'Пригласить ещё' (ведёт в каталог target-entity с multi-select);"
      }
    ]
  },
  {
    "id": "role-scoped-dual-view",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "entity": "ProjectResponse",
          "foreignKey": "projectId"
        },
        {
          "kind": "has-role",
          "role": "customer"
        },
        {
          "kind": "has-role",
          "role": "freelancer"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-collection секция рендерится с разной cardinality для разных ролей: owner-view показывает полный list с sort/filter, participant-view показывает only-self + agg-counter ('ещё N откликов'). Фильтрация не на clientside, а через filterWorldForRole с role.scope."
    },
    "rationale": {
      "hypothesis": "Если entity имеет owner-role и peer-participant-роль с доступом к одному sub-collection — UI-манифестация должна различаться: owner видит aggregate для решения, participant видит self для контекста. Show-all-to-all раскрывает конкурентную инфу (другие proposed prices); show-none-to-participant лишает его anchor'а ('много / мало откликнулось').",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "Детал проекта: customer видит всех откликнувшихся с ценами, freelancer — только свой отклик + 'ещё 12 откликов'",
          "reliability": "high"
        },
        {
          "source": "upwork",
          "description": "Customer видит proposals list; freelancer — только own proposal",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "slack-channel",
          "description": "Все участники канала видят все сообщения симметрично — peer-network, не owner-scoped",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Seller видит все Bid'ы, bidder — только свой"
        },
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Poll-owner видит all votes, participant — свой + aggregate"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Все participants равноправны в чтении messages"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "Single-owner entity, нет peer-role"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-role-scoped-dual-view.json",
        "slot": "sections",
        "primarySource": "fl-ru",
        "description": "Sub-collection секция рендерится с разной cardinality для разных ролей: owner-view показывает полный list с sort/filter, participant-view по"
      }
    ]
  },
  {
    "id": "tier-badge-marker",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "isPro"
        },
        {
          "kind": "has-role",
          "role": "pro_*"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Inline tier-бейдж в header карточки (PRO, Verified, Premium) с distinct цветом; опционально — filter-toggle 'Только PRO' в toolbar; tier-атрибут прокидывается в sort/filter API."
    },
    "rationale": {
      "hypothesis": "Tier-маркер работает как trust signal + capability gate одновременно; без явного бейджа пользователь не различает monetized vs free tier, и capability-gating (например, hidden contacts для non-PRO) становится сюрпризом. Boolean tier_field + matching role — достаточный signal для паттерна.",
      "evidence": [
        {
          "source": "fl-ru",
          "description": "PRO-бейдж рядом с именем фрилансера, фильтр 'Только PRO'",
          "reliability": "high"
        },
        {
          "source": "github",
          "description": "Verified badge на org-профилях — та же механика trust marker",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "wikipedia-editors",
          "description": "Tier system (autoconfirmed / admin) существует, но бейдж не показывается в ленте — community-norm против коммерциализации",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "specialist_catalog",
          "reason": "Specialist с verified/pro — trust signal и фильтр"
        },
        {
          "domain": "sales",
          "projection": "seller_profile",
          "reason": "User с seller-tier бейджем"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "Participant не имеет tier — flat peer-to-peer модель"
        },
        {
          "domain": "lifequest",
          "projection": "goal_catalog",
          "reason": "Goal — personal entity, tier-понятие не применимо"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-fl-ru-projects-board-tier-badge-marker.json",
        "slot": "body",
        "primarySource": "fl-ru",
        "description": "Inline tier-бейдж в header карточки (PRO, Verified, Premium) с distinct цветом; опционально — filter-toggle 'Только PRO' в toolbar; tier-атр"
      }
    ]
  },
  {
    "id": "chips-plus-advanced-sheet",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 2,
          "filter": "replace-filter-simple"
        },
        {
          "kind": "intent-effect",
          "target": "searchFilter.extendedParams"
        },
        {
          "kind": "intent-confirmation",
          "value": "form"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Frequent-use фильтры (3-5 chip'ов) выносятся как scroll-row под search-bar в catalog-toolbar. Отдельная 'Все фильтры' кнопка / overflow-chip открывает bottom-sheet с полной формой (extendedParams: 10+ полей). Two-layer UX: quick vs deep."
    },
    "rationale": {
      "hypothesis": "Flat-фильтр-форма с 15+ полями дорога: требует full-screen переход и scroll. Но 80% фильтрации — 3-5 ключевых параметров (salary, remote, experience). Two-layer разделяет быстрый path (chips) и редкий heavyweight path (advanced sheet), не заставляя пользователя открывать форму за одним toggle'ом.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "Chips 'От 100к', 'Удалёнка', 'Без опыта' + 'Все фильтры' → sheet с 15+ параметрами",
          "reliability": "high"
        },
        {
          "source": "airbnb-search",
          "description": "Type/Dates/Guests chips + 'More filters' → modal с amenities, price-range, etc",
          "reliability": "high"
        },
        {
          "source": "booking-com",
          "description": "Star-rating/meal/distance chips + polno 'Filters' sheet",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "linear-issues",
          "description": "Power-user-инструмент — advanced-filter inline (faceted-search, без chip-layer) выигрывает у chips",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Листинги имеют price/category/location + 10+ advanced полей — two-layer подходит"
        },
        {
          "domain": "delivery",
          "projection": "menuitem_catalog",
          "reason": "Cuisine/price chips + advanced dietary/prep-time sheet"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "sphere_list",
          "reason": "Sphere-фильтров мало, второго layer не нужно"
        },
        {
          "domain": "workflow",
          "projection": "node_palette",
          "reason": "Nodes фильтруются по type через tabs, не chips+sheet"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-chips-plus-advanced-sheet.json",
        "slot": "toolbar",
        "primarySource": "hh-ru-mobile",
        "description": "Frequent-use фильтры (3-5 chip'ов) выносятся как scroll-row под search-bar в catalog-toolbar. Отдельная 'Все фильтры' кнопка / overflow-chip"
      }
    ]
  },
  {
    "id": "context-pinned-header",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "value": "internal"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "foreignKey": true,
          "referencesDetail": true
        },
        {
          "kind": "intent-count",
          "min": 1,
          "filter": "content-append"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "На detail-проекции сущности, имеющей FK на другую сущность с собственной detail-проекцией, FK-entity рендерится как компактный pinned-header (sticky top) с её ключевыми полями. Header остаётся видимым при скролле/ввода, поддерживая контекст."
    },
    "rationale": {
      "hypothesis": "Conversation/Application не самодостаточны — они всегда относительно 'чего-то' (vacancy, order, listing). При длинной прокрутке диалога контекст FK-entity теряется. Pinning сохраняет его как постоянный anchor, предотвращая 'о чём мы тут говорим' и упрощая переход к FK detail.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "В чате с работодателем header с vacancy-title + company + salary закреплён сверху",
          "reliability": "high"
        },
        {
          "source": "avito-chats",
          "description": "Объявление pinned at top of chat: 'Продам велосипед, 15000₽' — постоянный контекст сделки",
          "reliability": "high"
        },
        {
          "source": "github-pr-review",
          "description": "PR header sticky при scroll через comment-thread",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "whatsapp-personal",
          "description": "Personal chats не имеют FK-context — header был бы лишним (имя собеседника уже в top-bar)",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "delivery_detail",
          "reason": "Delivery имеет FK на Order — Order header с items/price должен быть pinned при scroll по courier events"
        },
        {
          "domain": "sales",
          "projection": "conversation_detail",
          "reason": "Сообщения про Listing — pin listing-header сверху (title, price, photo)"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "habit_detail",
          "reason": "Habit самодостаточна, не имеет внешнего FK-context"
        },
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Portfolio — корневая сущность, ей некого 'pin'"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-context-pinned-header.json",
        "slot": "header",
        "primarySource": "hh-ru-mobile",
        "description": "На detail-проекции сущности, имеющей FK на другую сущность с собственной detail-проекцией, FK-entity рендерится как компактный pinned-header"
      }
    ]
  },
  {
    "id": "contextual-wizard-tooltips",
    "version": 1,
    "status": "candidate",
    "archetype": "form",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "ComplexEntity",
          "stepCount": {
            "min": 4
          }
        },
        {
          "kind": "intent-confirmation",
          "value": "form"
        },
        {
          "kind": "entity-field",
          "entity": "targetEntity",
          "field": "completeness"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Multi-step wizard (≥4 шага) с высокой размерностью полей рендерит per-field inline-tooltip (info-icon next to label, expanding на tap в 2-3 строки контекстной подсказки). Completeness-поле даёт progress-indicator, усиливающий completion-pressure."
    },
    "rationale": {
      "hypothesis": "Complex-form-creation (resume, profile, listing) — abandonment-prone из-за полевой неопределённости ('что именно сюда писать?'). Инлайновые tooltips, доступные opt-in, снимают эту неопределённость без засорения формы помощью, и progress-meter укрепляет commitment.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "Resume wizard 6 шагов, каждый field имеет '?' с раскрывающейся подсказкой",
          "reliability": "high"
        },
        {
          "source": "linkedin-profile-builder",
          "description": "'Add your headline' + tip 'Describe what you do in 10 words'",
          "reliability": "high"
        },
        {
          "source": "stripe-onboarding",
          "description": "Business-info wizard с per-field compliance-подсказками",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "signup-form",
          "description": "Короткая форма (email/password) — tooltips избыточны и тормозят happy path",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_create",
          "reason": "Listing creation — многошаговый wizard с tricky полями (категория, состояние, доставка)"
        },
        {
          "domain": "invest",
          "projection": "portfolio_setup",
          "reason": "Risk-profile + goals + rules — wizard с non-obvious finance-полями"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "send_message",
          "reason": "Single-field form, не wizard"
        },
        {
          "domain": "lifequest",
          "projection": "habit_create",
          "reason": "Habit — простая 2-3 поля форма, tooltips лишни"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-contextual-wizard-tooltips.json",
        "slot": "body",
        "primarySource": "hh-ru-mobile",
        "description": "Multi-step wizard (≥4 шага) с высокой размерностью полей рендерит per-field inline-tooltip (info-icon next to label, expanding на tap в 2-3 "
      }
    ]
  },
  {
    "id": "inline-event-timeline",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "parent": "mainEntity",
          "hasFields": [
            "type",
            "timestamp"
          ]
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "status"
        },
        {
          "kind": "intent-count",
          "min": 1,
          "filter": "status-transitions-observable"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "EventLog-sub-entity с FK и timestamp визуализируется inline внутри родительской карточки как горизонтальный chevron-timeline (Sent → Viewed → Invited → Rejected). Каждая node соответствует event.type, текущий state — highlighted."
    },
    "rationale": {
      "hypothesis": "Когда sub-entity описывает state-transitions родителя (а не independent child-data), вынос её в отдельную section разрывает контекст. Inline-timeline сохраняет visual causality: 'что было → что сейчас' читается единым scan-motion, не требуя tap-in.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "Timeline 'Отправлено 12 апр → Просмотрено 14 апр → Приглашение' inside application card",
          "reliability": "high"
        },
        {
          "source": "amazon-orders",
          "description": "Ordered → Shipped → Out for delivery → Delivered — stepper прямо на order-карточке",
          "reliability": "high"
        },
        {
          "source": "github-pr",
          "description": "Opened → Review requested → Approved — horizontal timeline в PR-list",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "jira-issues",
          "description": "Workflow transitions слишком многочисленны (20+ custom states) — inline timeline становится нечитаем, уходит в отдельный log-tab",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "Order + state-transitions (placed/picked/in-transit/delivered) через CourierLocation/OrderEvents — prime case"
        },
        {
          "domain": "sales",
          "projection": "order_detail",
          "reason": "Sales Order flow (pending → paid → shipped → delivered) с event-log"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Message — content-поток, не state-transition события"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "HabitLog — metric-сбор, не state transition"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-inline-event-timeline.json",
        "slot": "body",
        "primarySource": "hh-ru-mobile",
        "description": "EventLog-sub-entity с FK и timestamp визуализируется inline внутри родительской карточки как горизонтальный chevron-timeline (Sent → Viewed "
      }
    ]
  },
  {
    "id": "personalization-score-badge",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "matchPercent"
        },
        {
          "kind": "field-role-present",
          "role": "percentage"
        },
        {
          "kind": "intent-effect",
          "target": "matchView"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Производный per-user сигнал (match %, fit score) выносится отдельным prominent badge в верх карточки catalog/feed, до основного тела, как главный relevance-якорь для сканирования."
    },
    "rationale": {
      "hypothesis": "Derived персонализированный signal работает сильнее, чем любая single-entity-property: пользователь сканирует ленту по 'насколько это для меня', а не по алфавиту полей. Выделение этого поля редуцирует cognitive load и повышает relevance-perception.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "'Подходит вам на 82%' — крупный зелёный badge в верхней трети карточки, раньше salary/company",
          "reliability": "high"
        },
        {
          "source": "linkedin-jobs",
          "description": "'Top match' / '% match' marker above job title",
          "reliability": "medium"
        },
        {
          "source": "netflix",
          "description": "'% match' в hover-карточке фильма — тот же приём в recommendation feed",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "ebay-search",
          "description": "Нет персонализации — листинги универсальны, score-badge был бы шумом",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "asset_catalog",
          "reason": "Если Asset имеет recommendationScore (user fit), паттерн должен вынести его в hero-badge"
        },
        {
          "domain": "sales",
          "projection": "listing_feed",
          "reason": "При добавлении matchPercent на Listing — тот же UX"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "Нет derived per-user score — Conversation равнозначны"
        },
        {
          "domain": "lifequest",
          "projection": "habit_catalog",
          "reason": "Привычки пользователя сами, percentage completeness — не per-item relevance"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-personalization-score-badge.json",
        "slot": "body",
        "primarySource": "hh-ru-mobile",
        "description": "Производный per-user сигнал (match %, fit score) выносится отдельным prominent badge в верх карточки catalog/feed, до основного тела, как гл"
      }
    ]
  },
  {
    "id": "primary-scanning-anchor-field",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "role": "money"
        },
        {
          "kind": "intent-count",
          "min": 1,
          "filter": "apply-filter-on-field"
        },
        {
          "kind": "entity-kind",
          "value": "internal"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Одно поле с money-ролью (salary, price, value), по которому пользователь наиболее часто фильтрует/сортирует, визуально выделяется как primary scanning anchor: bold typography, +30-50% font-size, primary-color. Title остаётся secondary в scan-hierarchy."
    },
    "rationale": {
      "hypothesis": "Catalog-скан по cognitively-relevant полю ≠ скан по title. На job/listing/pricing ленте именно money-поле — то, по чему делается go/no-go decision за 300мс. Typography-иерархия должна следовать decision-иерархии, а не document-структуре (где title = h1).",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "'от 150 000 ₽' bold + крупнее title vacancy",
          "reliability": "high"
        },
        {
          "source": "airbnb",
          "description": "'$120/night' bold под thumbnail, title вторичен",
          "reliability": "high"
        },
        {
          "source": "stock-screener",
          "description": "Price + change% — primary visual в row, ticker вторичен",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "e-commerce-premium",
          "description": "Brand-heavy контекст (luxury-fashion) инвертирует: название бренда крупнее price — positioning signal сильнее cost",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Listing.price — очевидный scanning anchor"
        },
        {
          "domain": "invest",
          "projection": "asset_catalog",
          "reason": "Asset.currentPrice + change% — primary decision-поля"
        },
        {
          "domain": "delivery",
          "projection": "menuitem_catalog",
          "reason": "MenuItem.price — пользователь сканирует по цене, а не названию блюда"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_list",
          "reason": "Нет money-поля — имя/last-message остаются primary"
        },
        {
          "domain": "lifequest",
          "projection": "goal_catalog",
          "reason": "Goals не содержат money-decision поля"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-primary-scanning-anchor-field.json",
        "slot": "body",
        "primarySource": "hh-ru-mobile",
        "description": "Одно поле с money-ролью (salary, price, value), по которому пользователь наиболее часто фильтрует/сортирует, визуально выделяется как primar"
      }
    ]
  },
  {
    "id": "promo-banner-injection",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "target": "mainEntity.isBoosted",
          "irreversibility": "high"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "isBoosted"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "В потоке catalog/feed каждые N карточек (N=5-10) вставляется promotional banner — CTA для boost-intent самого owner'а. Banner визуально отличим от card (full-bleed, иконка crown/zap), но использует ту же композитную сетку."
    },
    "rationale": {
      "hypothesis": "Monetization через отдельный screen ('Premium' tab) имеет низкий discover-rate: пользователь не заходит туда намеренно. In-feed injection показывает value-prop в моменте, когда релевантность максимальна (смотришь чужие резюме — видишь 'Подними своё'). Баланс aggressive-vs-useful регулируется частотой N.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "Баннеры 'Premium' / 'Поднять резюме' injected в feed резюме и applications",
          "reliability": "high"
        },
        {
          "source": "linkedin-feed",
          "description": "'Try Premium' cards каждые ~7 feed-items",
          "reliability": "high"
        },
        {
          "source": "spotify-free",
          "description": "Ad-interstitial между треками в playlist",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "enterprise-saas",
          "description": "Paid-by-seat продукты не имеют in-feed monetization — upsell через admin-setting",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_feed",
          "reason": "Listing.isBoosted / isFeatured — estimated seller промо-CTA в feed"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "booking_list",
          "reason": "Owner-view bookings не имеет self-boost intent"
        },
        {
          "domain": "lifequest",
          "projection": "goal_catalog",
          "reason": "Non-monetized личный домен — banner injection неуместен"
        },
        {
          "domain": "workflow",
          "projection": "workflow_list",
          "reason": "Инструментальный UI без boost-ladder"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-promo-banner-injection.json",
        "slot": "body",
        "primarySource": "hh-ru-mobile",
        "description": "В потоке catalog/feed каждые N карточек (N=5-10) вставляется promotional banner — CTA для boost-intent самого owner'а. Banner визуально отли"
      }
    ]
  },
  {
    "id": "quick-apply-subentity-cta",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "sub-entity",
          "foreignKeyToMainEntity": true
        },
        {
          "kind": "intent-confirmation",
          "value": "click"
        },
        {
          "kind": "intent-count",
          "min": 1,
          "filter": "creates-sub-entity"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Intent, создающий sub-entity с FK на card-сущность (Application ↔ Vacancy, Bid ↔ Listing), вышивается прямой click-кнопкой на card — без перехода в detail. Если у intent есть optional form, он раскрывается в bottom-sheet modal по требованию."
    },
    "rationale": {
      "hypothesis": "Основной conversion-action каталога — создание sub-entity относительно карточки. Перенос CTA на уровень карточки (а не detail) сокращает conversion-funnel: catalog→click→confirm вместо catalog→card→detail→CTA→confirm. Optional form не блокирует быстрый путь.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "'Откликнуться' — primary button на каждой vacancy-карточке, модалка с resume-select вторична",
          "reliability": "high"
        },
        {
          "source": "tinder-like",
          "description": "Swipe / click 'Like' создаёт Match/Like sub-entity одним жестом",
          "reliability": "high"
        },
        {
          "source": "ebay-mobile",
          "description": "'Buy it now' на листинг-карточке minuит detail-step",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "b2b-marketplace",
          "description": "Когда sub-entity требует много полей (RFQ, контракт), прямой CTA на card повышает abandonment — нужен detail-scan",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "place_bid создаёт Bid с FK на Listing — применим как prominent card-CTA"
        },
        {
          "domain": "booking",
          "projection": "specialist_catalog",
          "reason": "book_slot создаёт Booking с FK на Specialist — 'Записаться' прямо на карточке"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "workflow",
          "projection": "workflow_catalog",
          "reason": "Execution создаётся сложным run-запросом, не quick-action"
        },
        {
          "domain": "reflect",
          "projection": "hypothesis_list",
          "reason": "HypothesisEvidence требует контекста и не подходит для одноклика из каталога"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-quick-apply-subentity-cta.json",
        "slot": "primaryCTA",
        "primarySource": "hh-ru-mobile",
        "description": "Intent, создающий sub-entity с FK на card-сущность (Application ↔ Vacancy, Bid ↔ Listing), вышивается прямой click-кнопкой на card — без пер"
      }
    ]
  },
  {
    "id": "status-segmented-tabs",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "status"
        },
        {
          "kind": "intent-count",
          "statusValues": {
            "min": 3
          }
        },
        {
          "kind": "has-role",
          "role": "owner"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Статусы mainEntity (≥3 value) проецируются в segmented top-bar над catalog-body как predefined views-фильтры. Дополнительно добавляется 'All' как дефолт. Переключение = replace filter.status без сетевого round-trip."
    },
    "rationale": {
      "hypothesis": "Status-enum с operational-семантикой (sent/viewed/invited/rejected) — самая частая ось группировки для owner-роли. Сегментирование через tabs делает mental-model 'воронка процесса' явной и избавляет от chip-фильтров, которые требуют отдельного UX-акта.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "Applications section: tabs 'Все / Приглашения / Отказы / Архив'",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "Primary / Social / Promotions / Updates — status-like segmentation",
          "reliability": "medium"
        },
        {
          "source": "trello-mobile",
          "description": "Status columns as swipe-segments в mobile-view",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "inbox-catch-all",
          "description": "Когда статусов 10+, tabs становятся overflow, превращаются в dropdown",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "order_catalog",
          "reason": "Order.status: pending/paid/shipped/delivered/cancelled — классический funnel для seller/buyer"
        },
        {
          "domain": "delivery",
          "projection": "order_catalog",
          "reason": "Order.status для dispatcher-view: placed/assigned/picked/delivered"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "habit_list",
          "reason": "Habit не имеет status-axis достаточной rich-семантики (active/archived — 2 value)"
        },
        {
          "domain": "workflow",
          "projection": "execution_list",
          "reason": "Execution status — per-run technical state, не owner-facing funnel"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-status-segmented-tabs.json",
        "slot": "toolbar",
        "primarySource": "hh-ru-mobile",
        "description": "Статусы mainEntity (≥3 value) проецируются в segmented top-bar над catalog-body как predefined views-фильтры. Дополнительно добавляется 'All"
      }
    ]
  },
  {
    "id": "template-library-quickfire",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "entity": "Template",
          "hasFields": [
            "title",
            "content"
          ]
        },
        {
          "kind": "intent-creates",
          "entity": "ContentEntity",
          "usingField": "templateId"
        },
        {
          "kind": "intent-confirmation",
          "value": "click"
        }
      ]
    },
    "structure": {
      "slot": "composer",
      "description": "TemplateEntity ({title, content, category}) проецируется как горизонтальный chip-row над composer input'ом. Один tap по chip создаёт ContentEntity из шаблона без промежуточных шагов. Category даёт grouping / scroll-sections."
    },
    "rationale": {
      "hypothesis": "Когда creator-intent часто повторяется с минимальной вариативностью (recruiter replies, support macros), free-form input избыточен. Templates как quick-row превращают creation в 1-tap selection, сохраняя escape-hatch для custom-ввода в том же composer.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "'Спасибо за отклик', 'Приглашаем на интервью', 'К сожалению, отказ' — chip-row над chat-input",
          "reliability": "high"
        },
        {
          "source": "gmail-smart-reply",
          "description": "3 suggested replies как chips под conversation thread",
          "reliability": "high"
        },
        {
          "source": "zendesk-macros",
          "description": "Agent-macros как dropdown/hotkey в ticket response",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "personal-messenger",
          "description": "Personal-общение варьируется слишком сильно — templates неуместны",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "При добавлении MessageTemplate entity — прямое применение"
        },
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "Spec-to-client reply-templates: 'Приду вовремя', 'Задержусь на 10 мин'"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "transaction_detail",
          "reason": "Transaction не имеет templated content-создания"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Goal creation глубоко персональный, не из шаблонов"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-template-library-quickfire.json",
        "slot": "composer",
        "primarySource": "hh-ru-mobile",
        "description": "TemplateEntity ({title, content, category}) проецируется как горизонтальный chip-row над composer input'ом. Один tap по chip создаёт Content"
      }
    ]
  },
  {
    "id": "trust-attribute-badges",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "entity": "mainEntity",
          "booleanFields": {
            "min": 2
          },
          "semanticHint": "verification|status-attribute"
        },
        {
          "kind": "entity-kind",
          "value": "internal"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Boolean-атрибуты доверия (isVerified, isOpenEmployer, isRemote) рендерятся как компактный ряд icon-badges под заголовком карточки, выступая как trust-signal layer до чтения описания."
    },
    "rationale": {
      "hypothesis": "Boolean-поля с trust-семантикой малоинформативны отдельными словами, но сильны как visual shorthand. Ряд из 2-4 иконок позволяет за 200мс оценить соответствие базовым критериям до detail-чтения.",
      "evidence": [
        {
          "source": "hh-ru-mobile",
          "description": "'Открытый работодатель' / 'Готов к удалёнке' — цветные chips-badges на vacancy-карточке",
          "reliability": "high"
        },
        {
          "source": "airbnb",
          "description": "'Superhost' / 'Self-check-in' — iconic badges на listing-карточке",
          "reliability": "high"
        },
        {
          "source": "amazon",
          "description": "'Amazon's Choice' / 'Prime' — бинарные доверительные маркеры в search-результате",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "messenger-apps",
          "description": "В чат-листе boolean-поля (isTyping, isOnline) — presence, а не trust, рендерятся иначе (индикатор, не badge)",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_catalog",
          "reason": "Listing с isVerifiedSeller / isReturnable — прямая аналогия trust-chips"
        },
        {
          "domain": "booking",
          "projection": "specialist_catalog",
          "reason": "Specialist с верификацией и insurance-маркерами должен показывать badge-ряд"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "habit_catalog",
          "reason": "Habit isCompleted — сугубо personal state, не trust"
        },
        {
          "domain": "workflow",
          "projection": "node_list",
          "reason": "Nodes — technical объекты, boolean-поля конфигурационные, не доверительные"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-hh-ru-mobile-trust-attribute-badges.json",
        "slot": "body",
        "primarySource": "hh-ru-mobile",
        "description": "Boolean-атрибуты доверия (isVerified, isOpenEmployer, isRemote) рендерятся как компактный ряд icon-badges под заголовком карточки, выступая "
      }
    ]
  },
  {
    "id": "faceted-subcollection-filter",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "count": ">=1"
        },
        {
          "kind": "entity-field",
          "onSubEntity": true,
          "fieldTypes": [
            "enum"
          ],
          "minCount": 1,
          "description": "classifier field like sentiment/status"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Within absorbed or authored sub-entity section on detail, surface horizontal segmented-control filter (All / <enum values>) above sub-entity list. Filters scoped to section, not global; preserves context of parent detail."
    },
    "rationale": {
      "hypothesis": "Sub-collection lists longer than a screen need a low-friction narrowing mechanism. A single enum-axis filter as chip-group is discoverable without a modal, and enum values authored in ontology give meaningful facets 'for free'. Users comparing reviews/attempts/activity want to slice without losing the parent context.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "Company reviews section has 'All / Positive / Negative / Former / Current' chip filter above list",
          "reliability": "high"
        },
        {
          "source": "amazon-product-detail",
          "description": "Review section with 'star rating / verified / photos' filter chips",
          "reliability": "high"
        },
        {
          "source": "github-issues",
          "description": "Open/Closed pill filter on issue list within repo",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "stripe-dashboard",
          "description": "Sub-tables use full search+filter panel, not chip facets — works when sub-collection has 10+ filterable dimensions",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Bids sub-section with status enum (active/retracted/won) benefits from faceted filter"
        },
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Transactions sub-section filterable by kind (buy/sell/dividend)"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Messages are chronological stream, not faceted"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "Single entry, no sub-collection to filter"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-faceted-subcollection-filter.json",
        "slot": "sections",
        "primarySource": "indeed-mobile-job-board",
        "description": "Within absorbed or authored sub-entity section on detail, surface horizontal segmented-control filter (All / <enum values>) above sub-entity"
      }
    ]
  },
  {
    "id": "hero-attribute-badges",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "fieldTypes": [
            "boolean",
            "enum"
          ],
          "count": ">=2"
        },
        {
          "kind": "intent-count",
          "minMatching": 1,
          "where": {
            "archetype": "detail"
          }
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Render boolean/enum attributes of mainEntity as compact badge row directly under title in detail hero, before long-form description. Badges carry type modifiers (Remote, Full-time) and urgency signals (Urgently hiring)."
    },
    "rationale": {
      "hypothesis": "Categorical attributes that determine fit/no-fit decisions compress better as visual chips than as labeled fields. Placing them in hero enables sub-second eligibility scan before the user commits to reading description.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "Hero shows '$25/hr · Full-time · Remote · Urgently hiring' as inline badges before description section",
          "reliability": "high"
        },
        {
          "source": "linkedin-jobs",
          "description": "Same badge row under title on job detail",
          "reliability": "high"
        },
        {
          "source": "airbnb-listing-detail",
          "description": "Amenity chips (Wifi, Kitchen, Washer) in hero area",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "wordpress-admin-post-edit",
          "description": "Detail forms with many boolean options use checklists, not hero badges — badges only work when attributes are mutually compatible filters, not config toggles",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Listing has type/condition/shipping as boolean+enum — badge row reinforces scan"
        },
        {
          "domain": "booking",
          "projection": "service_detail",
          "reason": "Service has duration/online/in-person type markers"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "workflow",
          "projection": "execution_detail",
          "reason": "Execution attributes are telemetry, not categorical scan signals"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "MoodEntry fields are not eligibility filters"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-hero-attribute-badges.json",
        "slot": "hero",
        "primarySource": "indeed-mobile-job-board",
        "description": "Render boolean/enum attributes of mainEntity as compact badge row directly under title in detail hero, before long-form description. Badges "
      }
    ]
  },
  {
    "id": "multi-axis-rating-breakdown",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "field": "ratingBreakdown",
          "shape": "record-of-numeric"
        },
        {
          "kind": "entity-field",
          "field": "overallRating",
          "fieldTypes": [
            "number"
          ]
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Render overall rating as large score + per-axis horizontal bars (e.g. work-life / compensation / management / culture / opportunities). Each axis clickable, filters nested review subcollection to that axis."
    },
    "rationale": {
      "hypothesis": "A single aggregate score hides dimensional trade-offs that drive real decisions (great pay, awful management). Breaking the rating along authored axes gives users a cognitive handle on 'why' the score is what it is, and linking axes to review filter makes the breakdown an active navigation surface, not just decoration.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "Company profile shows 5 axes with horizontal bars; tap on axis filters reviews panel below",
          "reliability": "high"
        },
        {
          "source": "glassdoor",
          "description": "Similar 5-axis breakdown for employer pages",
          "reliability": "high"
        },
        {
          "source": "airbnb-host",
          "description": "6-axis rating (cleanliness, accuracy, check-in, communication, location, value) in host profile",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "amazon-reviews",
          "description": "Star histogram (5★/4★/3★/2★/1★) is frequency breakdown, not semantic axes — different pattern. Multi-axis requires authored axes with meaning",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "specialist_detail",
          "reason": "Specialist with ratingBreakdown across skills/punctuality/value axes fits exactly"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "Portfolio metrics are single-dimensional performance, not subjective axes"
        },
        {
          "domain": "workflow",
          "projection": "workflow_detail",
          "reason": "No rating semantics on workflows"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-multi-axis-rating-breakdown.json",
        "slot": "hero",
        "primarySource": "indeed-mobile-job-board",
        "description": "Render overall rating as large score + per-axis horizontal bars (e.g. work-life / compensation / management / culture / opportunities). Each"
      }
    ]
  },
  {
    "id": "related-entity-rating-chip",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "value": "internal"
        },
        {
          "kind": "sub-entity-exists",
          "role": "foreign-key-target",
          "targetHasField": "overallRating"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Embed aggregate rating (stars + count) from FK-referenced entity inline in each catalog card as clickable chip opening target detail, making reputation a first-class scan-time signal."
    },
    "rationale": {
      "hypothesis": "Decisions in transactional catalogs (jobs, sellers, venues) depend on reputation of the related actor, not just the item itself. Surfacing aggregate rating at card level — before detail drill-in — shortens the trust-evaluation loop without inflating the card into a dashboard.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "Company rating (★4.4 · 4 reviews) embedded under company name in every job card; tap opens company profile, not job detail",
          "reliability": "high"
        },
        {
          "source": "glassdoor",
          "description": "Same pattern: employer rating on job card",
          "reliability": "medium"
        },
        {
          "source": "airbnb",
          "description": "Host rating shown on listing card before detail",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "amazon-search-results",
          "description": "Product card shows rating of product itself, not of seller — when FK target is not the trust-bearing entity, embedding its rating adds noise",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Listing→seller with seller rating is prime use case"
        },
        {
          "domain": "booking",
          "projection": "specialists_catalog",
          "reason": "Specialist cards benefit from inline rating summary"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "polls_catalog",
          "reason": "Poll FK to creator — creator rating is not a decision signal"
        },
        {
          "domain": "workflow",
          "projection": "workflows_catalog",
          "reason": "No rating semantics on workflow authors"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-related-entity-rating-chip.json",
        "slot": "body",
        "primarySource": "indeed-mobile-job-board",
        "description": "Embed aggregate rating (stars + count) from FK-referenced entity inline in each catalog card as clickable chip opening target detail, making"
      }
    ]
  },
  {
    "id": "saved-query-with-notify",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entityKind": "SavedSearch-like",
          "hasField": "notificationsEnabled"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "savedX.notificationsEnabled"
        },
        {
          "kind": "entity-field",
          "entity": "SavedSearch-like",
          "field": "newResultsCount"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Named saved-query as first-class entity with (a) rename/delete row actions, (b) per-item notification toggle, (c) new-results badge promoted to tab/header of host catalog. Turns transient query into persistent subscription surface."
    },
    "rationale": {
      "hypothesis": "When search is the dominant discovery mode, users oscillate between the same 2-5 query shapes. Materializing these as named, notifiable entities converts repeated manual re-runs into a push-driven inbox, and the unread badge on the catalog tab reuses the user's existing attention habits.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "Saved searches tab lists named queries with per-item bell toggle; 'Find Jobs' tab carries numeric badge for new matches across all subscribed searches",
          "reliability": "high"
        },
        {
          "source": "linkedin-jobs",
          "description": "Job alerts with identical per-alert email/push toggles and new-results count",
          "reliability": "high"
        },
        {
          "source": "craigslist-rss",
          "description": "Saved search as RSS — same idea, older medium",
          "reliability": "low"
        }
      ],
      "counterexample": [
        {
          "source": "google-search",
          "description": "No saved-search entity — query history is ambient, not persistent. Pattern breaks when result space is unbounded/non-repeating",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "saved_searches_catalog",
          "reason": "SavedSearch with notify toggle already exists in domain ontology"
        },
        {
          "domain": "invest",
          "projection": "watchlist_catalog",
          "reason": "Watchlist = saved filter over assets with price-change alerts"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_catalog",
          "reason": "Conversations are not derived from stored queries"
        },
        {
          "domain": "workflow",
          "projection": "workflows_catalog",
          "reason": "Workflows are authored assets, not subscription endpoints"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-saved-query-with-notify.json",
        "slot": "header",
        "primarySource": "indeed-mobile-job-board",
        "description": "Named saved-query as first-class entity with (a) rename/delete row actions, (b) per-item notification toggle, (c) new-results badge promoted"
      }
    ]
  },
  {
    "id": "sponsored-segregated-feed",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "field": "sponsored",
          "fieldTypes": [
            "boolean"
          ]
        },
        {
          "kind": "intent-count",
          "minMatching": 1,
          "where": {
            "archetype": "feed|catalog"
          }
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Split feed body into labeled sponsored band (compact, with 'Sponsored' tag per item) followed by organic 'For you' band. Sponsored items never interleave into organic ranking — preserves algorithmic trust."
    },
    "rationale": {
      "hypothesis": "Mixing paid and organic placements without visual segregation erodes user trust in the ranking algorithm and violates disclosure norms in commerce/job markets. Explicit segregation lets the platform monetize without contaminating the 'for-you' signal.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "Home feed has 'Sponsored Jobs' horizontal strip with tag on each card, separate from 'Jobs for you' vertical list below",
          "reliability": "high"
        },
        {
          "source": "google-search",
          "description": "'Sponsored' label above ads block, separate from organic results",
          "reliability": "high"
        },
        {
          "source": "amazon-search",
          "description": "Sponsored products labeled but interleaved — weaker form of same pattern",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "instagram-feed",
          "description": "Ads interleaved without structural band — works in infinite-scroll where segregation would break flow rhythm",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_feed",
          "reason": "Listing.promoted/featured is the canonical sponsor flag"
        },
        {
          "domain": "delivery",
          "projection": "merchants_feed",
          "reason": "Merchant.featured drives segregated promoted band"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "polls_feed",
          "reason": "No paid-placement semantics in polls"
        },
        {
          "domain": "lifequest",
          "projection": "goals_catalog",
          "reason": "Personal goals — monetization is out of scope"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-sponsored-segregated-feed.json",
        "slot": "body",
        "primarySource": "indeed-mobile-job-board",
        "description": "Split feed body into labeled sponsored band (compact, with 'Sponsored' tag per item) followed by organic 'For you' band. Sponsored items nev"
      }
    ]
  },
  {
    "id": "unified-dual-tracker-tab",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "minEntities": 2,
          "samePrimaryFK": true
        },
        {
          "kind": "has-role",
          "base": "owner"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Single host catalog screen with segmented tab header switching between 2-3 related user-owned collections (e.g. saved / applied). Both collections anchor on same parent entity (Job) so users treat the screen as one mental bucket: 'things I'm tracking'."
    },
    "rationale": {
      "hypothesis": "When two owner-scoped collections share the same target entity and similar temporal rhythm (saved-for-later → applied → outcome), treating them as separate top-level destinations fragments attention. Unifying under one tab with segment switcher reflects the user's actual funnel and keeps the tracker discoverable with one tap instead of two.",
      "evidence": [
        {
          "source": "indeed-mobile-job-board",
          "description": "'My Jobs' tab contains Saved + Applied as internal segment switcher — one destination in bottom nav, two subcollections inside",
          "reliability": "high"
        },
        {
          "source": "linkedin-jobs",
          "description": "My Jobs has 'Saved / Applied / In Progress / Archived' internal tabs",
          "reliability": "high"
        },
        {
          "source": "zillow-saved",
          "description": "Saved Homes + Recently Viewed unified under one 'Saved' destination",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "shopify-admin",
          "description": "Orders and Draft Orders are separate top-level destinations — justified because roles/actions differ drastically, not just status stage",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "my_activity_catalog",
          "reason": "Watchlist + Bids + Orders all hang off Listing for buyer role — unified tracker fits"
        },
        {
          "domain": "delivery",
          "projection": "customer_orders_catalog",
          "reason": "Active + Past orders as segments within one destination"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "workflow",
          "projection": "executions_catalog",
          "reason": "Executions don't have 2+ parallel collections on same parent — single list"
        },
        {
          "domain": "planning",
          "projection": "polls_catalog",
          "reason": "Poll authorship is single collection, no natural dual"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-indeed-jobs-mobile-unified-dual-tracker-tab.json",
        "slot": "header",
        "primarySource": "indeed-mobile-job-board",
        "description": "Single host catalog screen with segmented tab header switching between 2-3 related user-owned collections (e.g. saved / applied). Both colle"
      }
    ]
  },
  {
    "id": "autosave-draft-wizard",
    "version": 1,
    "status": "candidate",
    "archetype": "wizard",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "*"
        },
        {
          "kind": "intent-effect",
          "intent": "save_*_draft",
          "α": "replace"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "status",
          "hasValue": "draft"
        }
      ]
    },
    "structure": {
      "slot": "composer",
      "description": "Create-intent для сложной mainEntity (≥5 полей, требует moderation) разворачивается в multi-step wizard с авто-сохранением черновика на каждый шаг (status=draft). Exit/reload восстанавливает состояние; финальный шаг — submit_for_moderation."
    },
    "rationale": {
      "hypothesis": "Long-form creation (≥5 шагов, включая загрузку изображений и описаний) ломается в single-form: пользователи уходят и теряют данные. Wizard + autosave черновика декомпозирует когнитивную нагрузку и гарантирует resumability.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Создание kwork'а — 5 шагов с автосохранением; 'Продолжить редактирование' позже",
          "reliability": "high"
        },
        {
          "source": "fiverr.com",
          "description": "Gig creation wizard с draft state",
          "reliability": "high"
        },
        {
          "source": "notion.so",
          "description": "Page autosave (не wizard, но draft-философия)",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "twitter compose",
          "description": "Short-form — wizard избыточен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "create_listing",
          "reason": "Listing с moderation + draft state"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "compose_message",
          "reason": "Short-form, нет moderation gate"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-autosave-draft-wizard.json",
        "slot": "composer",
        "primarySource": "kwork.ru",
        "description": "Create-intent для сложной mainEntity (≥5 полей, требует moderation) разворачивается в multi-step wizard с авто-сохранением черновика на кажд"
      }
    ]
  },
  {
    "id": "bounded-revision-buffer",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "revisionsUsed"
        },
        {
          "kind": "intent-effect",
          "intent": "request_revision",
          "α": "replace"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Intent request_revision рендерится с chip-счётчиком 'Осталось N из M правок' рядом с кнопкой; при достижении лимита (revisionsUsed === maxRevisions) кнопка disabled с hint про эскалацию в dispute. Счётчик — derived-from-state witness."
    },
    "rationale": {
      "hypothesis": "Bounded revision buffer — структурная защита от infinite-revision loops. Показ оставшихся попыток в cta-chip делает контрактное ограничение осязаемым и предотвращает cold surprise 'вы исчерпали лимит' на N-ой попытке.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Кнопка 'Запросить правку' с pill '2/3 использовано'",
          "reliability": "high"
        },
        {
          "source": "fiverr.com",
          "description": "Revision counter в order detail",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "email reply",
          "description": "Нет bounded-revision model",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "order_detail",
          "reason": "Buyer request_changes с cap"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Vote — не revision loop"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-bounded-revision-buffer.json",
        "slot": "primaryCTA",
        "primarySource": "kwork.ru",
        "description": "Intent request_revision рендерится с chip-счётчиком 'Осталось N из M правок' рядом с кнопкой; при достижении лимита (revisionsUsed === maxRe"
      }
    ]
  },
  {
    "id": "composite-default-sort",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "intent": "sort_*",
          "target": "*.sort"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "rating"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "createdAt"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Sort-контрол предлагает 'По умолчанию' (скрытая композиция: rating × freshness × popularity) первым, затем детерминистичные оси — новизна, цена, рейтинг. Default — первый вариант, не реверсируется вручную."
    },
    "rationale": {
      "hypothesis": "Marketplace'ы всегда имеют алгоритмическое ранжирование, которое не сводится к одной оси. Показать его как именованный sort-опцион 'По умолчанию' честнее, чем скрывать — пользователь видит, что есть альтернативы, но trust default.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Dropdown 'Сортировать по: По умолчанию / Новые / Дешевле / Рейтинг'",
          "reliability": "high"
        },
        {
          "source": "ebay.com",
          "description": "Best Match как дефолт + price/ending soon альтернативы",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "gmail inbox",
          "description": "Одна ось — дата, без алгоритмического ранжирования",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "rating + createdAt + sort intent"
        },
        {
          "domain": "booking",
          "projection": "specialists_catalog",
          "reason": "rating + freshness + алгоритмический default"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "Сортировка одномерная (lastActivityAt)"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-composite-default-sort.json",
        "slot": "toolbar",
        "primarySource": "kwork.ru",
        "description": "Sort-контрол предлагает 'По умолчанию' (скрытая композиция: rating × freshness × popularity) первым, затем детерминистичные оси — новизна, ц"
      },
      {
        "file": "2026-04-19-profi-ru-catalog-composite-default-sort.json",
        "slot": "toolbar",
        "primarySource": "profi.ru",
        "description": "Дефолтный sort — композитный («Оптимально»), альтернативы (цена/рейтинг/новизна) раскрываются в dropdown; композит сигнализирует, что rankin"
      }
    ]
  },
  {
    "id": "dashboard-kpi-plus-per-item-stats",
    "version": 1,
    "status": "candidate",
    "archetype": "dashboard",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "entity": "*Profile*",
          "role": "money"
        },
        {
          "kind": "intent-count",
          "pattern": "*",
          "min": 10
        },
        {
          "kind": "has-role",
          "roles": [
            "owner"
          ]
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Owner-scoped dashboard имеет два уровня stats: глобальные KPI-tiles (balance / day·week·month revenue / conversion views→orders) в hero + per-item micro-stats (views, orders, rating) на каждой карточке в grid ниже. Оба уровня derived из Φ."
    },
    "rationale": {
      "hypothesis": "Owner marketplace-профиля оптимизирует два разных решения: 'как моё дело в целом?' (макро-KPI) и 'какие товары дают результат?' (per-item). Раздельные surface'ы + совмещение в одном экране даёт holistic + actionable view.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Кабинет продавца: блок статистики сверху + per-kwork показы/заказы/рейтинг на карточках",
          "reliability": "high"
        },
        {
          "source": "etsy.com",
          "description": "Shop stats + per-listing views/favorites",
          "reliability": "high"
        },
        {
          "source": "stripe.com",
          "description": "Dashboard KPI + per-product revenue",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "consumer profile",
          "description": "Viewer не нуждается в дашборде своих покупок",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "seller_dashboard",
          "reason": "Owner + money + per-listing stats"
        },
        {
          "domain": "delivery",
          "projection": "merchant_dashboard",
          "reason": "Merchant KPI + per-item"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "user_profile",
          "reason": "Single-role, нет money-role"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-dashboard-kpi-plus-per-item-stats.json",
        "slot": "hero",
        "primarySource": "kwork.ru",
        "description": "Owner-scoped dashboard имеет два уровня stats: глобальные KPI-tiles (balance / day·week·month revenue / conversion views→orders) в hero + pe"
      }
    ]
  },
  {
    "id": "derived-total-in-cta",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "entity": "*",
          "role": "money"
        },
        {
          "kind": "sub-entity-exists",
          "parent": "*",
          "child": "*Extra*"
        },
        {
          "kind": "intent-creates",
          "entity": "Order"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Primary CTA в detail-проекции не просто 'Заказать', а 'Заказать за {computed.total} ₽' — метка кнопки включает derived-total из базовой цены + выбранных extras. Total пересчитывается реактивно; отсутствие selection → базовая цена."
    },
    "rationale": {
      "hypothesis": "Цена — ключевой friction-фактор покупки. Встроив её в label кнопки мы (а) подтверждаем фактическую сумму списания и (б) делаем кнопку price-witness, устраняя шаг 'а сколько же на самом деле?'.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Кнопка 'Заказать за 1 500 ₽' с живым обновлением при изменении extras",
          "reliability": "high"
        },
        {
          "source": "airbnb.com",
          "description": "Book-кнопка показывает total за stay на основе dates",
          "reliability": "high"
        },
        {
          "source": "uber",
          "description": "Request-кнопка показывает estimated fare",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "subscription pricing page",
          "description": "Там CTA — plain 'Subscribe', цена отдельно в карточке",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "cart_detail",
          "reason": "Total вычисляется из line-items + fees"
        },
        {
          "domain": "booking",
          "projection": "service_detail",
          "reason": "Price = base + duration-adjustment"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Vote — не денежная операция"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-derived-total-in-cta.json",
        "slot": "primaryCTA",
        "primarySource": "kwork.ru",
        "description": "Primary CTA в detail-проекции не просто 'Заказать', а 'Заказать за {computed.total} ₽' — метка кнопки включает derived-total из базовой цены"
      }
    ]
  },
  {
    "id": "faceted-filter-panel",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "intent": "*filter*",
          "α": "replace"
        },
        {
          "kind": "intent-count",
          "pattern": "filter_*",
          "min": 1
        }
      ]
    },
    "structure": {
      "slot": "sidebar",
      "description": "Несколько независимых осей (price, rating, language, verification, delivery) рендерятся как отдельные секции фильтр-панели с локальным применением; каждая ось — typed control по field-role (money→range, enum→checklist, boolean→toggle)."
    },
    "rationale": {
      "hypothesis": "Когда факты каталога варьируются по ≥3 независимым осям, single-search-box не даёт раскрыть ранжирующие сигналы. Faceted-panel превращает онтологические поля в первичные рычаги выбора.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Левая панель фильтров: цена, срок, рейтинг, язык, верификация — все одновременно видимы",
          "reliability": "high"
        },
        {
          "source": "airbnb.com",
          "description": "Канонический faceted-filter для marketplace listings",
          "reliability": "high"
        },
        {
          "source": "booking.com",
          "description": "Фильтры отелей — стандарт",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "twitter",
          "description": "Лента с одним таймлайном — faceted-panel избыточен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Множество filter_* intents"
        },
        {
          "domain": "delivery",
          "projection": "menu_browse",
          "reason": "Фильтры по price, cuisine, rating"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "Нет facet-полей — только время и unread"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-faceted-filter-panel.json",
        "slot": "sidebar",
        "primarySource": "kwork.ru",
        "description": "Несколько независимых осей (price, rating, language, verification, delivery) рендерятся как отдельные секции фильтр-панели с локальным приме"
      },
      {
        "file": "2026-04-19-profi-ru-catalog-faceted-filter-panel.json",
        "slot": "toolbar",
        "primarySource": "profi.ru",
        "description": "Sticky-панель справа (или drawer на мобильном) с группированными фасетами: numeric range (price from/to), multi-select (metro/tags), boolean"
      },
      {
        "file": "2026-04-19-workzilla-marketplace-faceted-filter-panel.json",
        "slot": "body",
        "primarySource": "workzilla-marketplace",
        "description": "Левая колонка catalog-проекции: checkboxes (categories) + range-slider (budget) + booleans (verified-only / safe-only / no-test). Live-apply"
      }
    ]
  },
  {
    "id": "gallery-hero-detail",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "previewImages"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "description"
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Hero detail-страницы делится на 2/3 визуальной галереи + 1/3 essence-панели (title, price-from, primary CTA). Description ниже hero, с markdown-секциями 'что входит / не входит / требуется' как структурированным блоком."
    },
    "rationale": {
      "hypothesis": "Визуальный товар коммуницирует через изображения, а решение — через essence-панель (цена + CTA). Разделение экрана даёт обе функции одновременно выше fold'а и снимает необходимость скроллить для primary action.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Detail kwork'а: слева большая галерея, справа колонка с ценой и 'Заказать'",
          "reliability": "high"
        },
        {
          "source": "etsy.com",
          "description": "Тот же pattern: gallery+essence",
          "reliability": "high"
        },
        {
          "source": "airbnb.com",
          "description": "Listing detail: photo-grid + booking-card",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "github issue",
          "description": "Text-centric detail — галерея не нужна",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Listing с previewImages + description"
        },
        {
          "domain": "delivery",
          "projection": "menu_item_detail",
          "reason": "MenuItem с photos + description"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "Poll не визуален"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-gallery-hero-detail.json",
        "slot": "hero",
        "primarySource": "kwork.ru",
        "description": "Hero detail-страницы делится на 2/3 визуальной галереи + 1/3 essence-панели (title, price-from, primary CTA). Description ниже hero, с markd"
      }
    ]
  },
  {
    "id": "hierarchy-tree-nav",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "parentId"
        },
        {
          "kind": "reference",
          "entity": "*"
        }
      ]
    },
    "structure": {
      "slot": "sidebar",
      "description": "Self-referential taxonomy (parentId FK на ту же сущность) разворачивается как двух-уровневое дерево-навигация слева от каталога: раздел → подраздел, выбор подраздела применяется как неявный filter."
    },
    "rationale": {
      "hypothesis": "Иерархическая таксономия — это онтологический факт (parentId → same entity), а не фильтр; рендер её как дерева даёт пользователю глобальную mental map раньше, чем первую выдачу. Плоский chip-фильтр теряет масштаб при ≥50 узлах.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Каталог услуг открывается с двух-уровневым деревом категорий слева, правый столбец — grid карточек выбранной подкатегории",
          "reliability": "high"
        },
        {
          "source": "profi.ru",
          "description": "Каталог специалистов с тем же паттерном: разделы Услуги → конкретные профили",
          "reliability": "high"
        },
        {
          "source": "yandex.market",
          "description": "Дерево категорий товаров — каноничный marketplace-приём",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "twitter feed",
          "description": "Лента без taxonomy — tree-nav был бы шумом",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Category имеет parentId→Category (same-entity)"
        },
        {
          "domain": "delivery",
          "projection": "menu_browse",
          "reason": "MenuItem group/subgroup может иметь иерархию"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "polls_feed",
          "reason": "Poll без taxonomy-иерархии"
        },
        {
          "domain": "reflect",
          "projection": "mood_timeline",
          "reason": "MoodEntry flat, нет self-ref FK"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-hierarchy-tree-nav.json",
        "slot": "sidebar",
        "primarySource": "kwork.ru",
        "description": "Self-referential taxonomy (parentId FK на ту же сущность) разворачивается как двух-уровневое дерево-навигация слева от каталога: раздел → по"
      },
      {
        "file": "2026-04-19-profi-ru-catalog-hierarchy-tree-nav.json",
        "slot": "toolbar",
        "primarySource": "profi.ru",
        "description": "Render self-referencing taxonomy entity (parentId→self) as collapsible tree in sidebar with per-node aggregate counter; selecting node drive"
      }
    ]
  },
  {
    "id": "hover-peek-preview",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "previewImages"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "description"
        },
        {
          "kind": "intent-effect",
          "intent": "open_*_detail",
          "α": "replace"
        }
      ]
    },
    "structure": {
      "slot": "overlay",
      "description": "Hover по grid-card триггерит ленивый popover с дополнительной галереей и first-paragraph описания — lightweight peek без навигации. При mobile — degraded (long-press или просто disabled)."
    },
    "rationale": {
      "hypothesis": "Navigating в detail стоит 1-2 сек + потерю позиции в grid. Hover-peek снижает стоимость evaluation на 10x в сценарии browsing, оставляя детализацию для коммитмента к конкретному варианту.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Наведение на карточку kwork показывает дополнительные изображения + выдержку описания",
          "reliability": "high"
        },
        {
          "source": "pinterest.com",
          "description": "Hover раскрывает save+pin-actions без ухода со страницы",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "mobile-first UX",
          "description": "Нет hover — паттерн деградирует",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "Listing с image + description + open_detail"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "Conversation не имеет preview-галереи"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-hover-peek-preview.json",
        "slot": "overlay",
        "primarySource": "kwork.ru",
        "description": "Hover по grid-card триггерит ленивый popover с дополнительной галереей и first-paragraph описания — lightweight peek без навигации. При mobi"
      }
    ]
  },
  {
    "id": "multi-select-extras-live-total",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "parent": "*",
          "child": "*Extra*"
        },
        {
          "kind": "field-role-present",
          "entity": "*Extra*",
          "role": "money"
        },
        {
          "kind": "intent-creates",
          "entity": "Order"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity 'Extras' (FK на parent) рендерится как multi-select checkbox-список в detail; каждый extra несёт money-field и опциональный duration-delta; выбор моментально пересчитывает derived total и прокидывает его в primaryCTA (см. derived-total-in-cta)."
    },
    "rationale": {
      "hypothesis": "Когда цена заказа = base + Σ(extras), показывать extras как отдельный следующий шаг (wizard) ломает 'прицеливание' — пользователь теряет связь между галочкой и итогом. Inline-select с live-total делает cause/effect непрерывным.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Блок 'Дополнительные опции' с чекбоксами, каждый с ценой; итог над кнопкой 'Заказать за X ₽' обновляется моментально",
          "reliability": "high"
        },
        {
          "source": "uber eats",
          "description": "Modifiers для MenuItem с live-total в корзине",
          "reliability": "high"
        },
        {
          "source": "deliveroo",
          "description": "Item customization с inline price-delta",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "enterprise invoice builder",
          "description": "Extras там — отдельная line-items таблица, не inline-select",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "menu_item_detail",
          "reason": "MenuItem + modifiers/options с price + order creation"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Нет money-field + order creation"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-multi-select-extras-live-total.json",
        "slot": "sections",
        "primarySource": "kwork.ru",
        "description": "Sub-entity 'Extras' (FK на parent) рендерится как multi-select checkbox-список в detail; каждый extra несёт money-field и опциональный durat"
      }
    ]
  },
  {
    "id": "profile-level-bulk-toggle",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*Profile*",
          "field": "*Mode"
        },
        {
          "kind": "field-role-present",
          "entity": "*Profile*",
          "role": "boolean"
        },
        {
          "kind": "sub-entity-exists",
          "parent": "*Profile*",
          "child": "*"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Одиночный boolean-флаг на Profile-entity (vacationMode, awayMode, pauseMode) рендерится как prominent header-toggle, который при активации неявно применяет side-effect ко всем активным child-сущностям профиля (скрыть из catalog). Один switch — bulk-эффект."
    },
    "rationale": {
      "hypothesis": "Активный продавец с десятками объявлений физически не может по одному поставить каждый на паузу уходя в отпуск. Profile-level toggle — единая точка управления доступностью, агрегатная абстракция.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Переключатель 'Режим отпуска' на SellerProfile скрывает все активные kworks из каталога",
          "reliability": "high"
        },
        {
          "source": "fiverr.com",
          "description": "Pause/Unpause на уровне gig — тот же bulk-паттерн",
          "reliability": "high"
        },
        {
          "source": "airbnb.com",
          "description": "Host snooze для listings",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "personal todo app",
          "description": "Нет multi-ownership — bulk-toggle не нужен",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "seller_profile",
          "reason": "SellerProfile с awayMode + множеством Listings"
        },
        {
          "domain": "delivery",
          "projection": "merchant_profile",
          "reason": "Merchant closedMode → hide menu"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "user_profile",
          "reason": "Personal — нет shared child-entities"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-profile-level-bulk-toggle.json",
        "slot": "header",
        "primarySource": "kwork.ru",
        "description": "Одиночный boolean-флаг на Profile-entity (vacationMode, awayMode, pauseMode) рендерится как prominent header-toggle, который при активации н"
      }
    ]
  },
  {
    "id": "role-scoped-action-set",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "has-role",
          "roles": [
            "owner",
            "viewer"
          ],
          "min": 2
        },
        {
          "kind": "intent-count",
          "pattern": "*_status",
          "min": 3
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "В detail-проекции shared между двумя ролями (owner/seller и viewer/buyer) primary/secondary действия отбираются ролью текущего зрителя: buyer видит request_revision, open_dispute; seller видит deliver_order, mark_in_progress. Обе роли читают тот же Φ, но CTA-поверхность role-scoped."
    },
    "rationale": {
      "hypothesis": "Два участника работы над одним Order (buyer+seller) естественны для marketplace; показывать им одинаковый набор actions нелогично и опасно (seller не должен 'accept delivery'). Role-scoped actions = taxonomy §5 + affordance.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Order detail: buyer видит 'Запросить правку', seller — 'Сдать работу'; состояние одно",
          "reliability": "high"
        },
        {
          "source": "upwork.com",
          "description": "Client/Freelancer shared contract page с role-specific buttons",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "personal task app",
          "description": "Одна роль — owner; role-scoping некому применять",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "customer/courier/merchant role-scoped actions"
        },
        {
          "domain": "sales",
          "projection": "order_detail",
          "reason": "buyer/seller split"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "Single-role (owner)"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-role-scoped-action-set.json",
        "slot": "primaryCTA",
        "primarySource": "kwork.ru",
        "description": "В detail-проекции shared между двумя ролями (owner/seller и viewer/buyer) primary/secondary действия отбираются ролью текущего зрителя: buye"
      }
    ]
  },
  {
    "id": "secondary-filters-on-subcollection",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "parent": "*",
          "child": "Review"
        },
        {
          "kind": "intent-effect",
          "intent": "filter_reviews",
          "α": "replace"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity коллекция в detail (reviews) получает собственный локальный filter-bar (with-photo, negative-only, rating=1★/5★), независимый от caller-filter'ов каталога. Filters scope-бутаются к sub-collection."
    },
    "rationale": {
      "hypothesis": "Reviews — decision-support surface: buyer ищет либо подтверждение (negative-only for worst case), либо визуальные доказательства (with-photo). Без вторичных фильтров сотни reviews становятся noise. Локальные фильтры не загрязняют catalog-state.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "В reviews блок чекбоксы 'С фото', 'Только негативные'",
          "reliability": "high"
        },
        {
          "source": "amazon",
          "description": "Filter reviews: verified only, with media, 1-star etc",
          "reliability": "high"
        },
        {
          "source": "booking.com",
          "description": "Отфильтровать отзывы по типу путешественника и оценке",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "single-review surface",
          "description": "<10 reviews — фильтры избыточны",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "specialist_detail",
          "reason": "Specialist.reviews с filter capability"
        },
        {
          "domain": "delivery",
          "projection": "merchant_detail",
          "reason": "Merchant reviews"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "Нет sub-collection с decision-support role"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-secondary-filters-on-subcollection.json",
        "slot": "sections",
        "primarySource": "kwork.ru",
        "description": "Sub-entity коллекция в detail (reviews) получает собственный локальный filter-bar (with-photo, negative-only, rating=1★/5★), независимый от "
      }
    ]
  },
  {
    "id": "status-tab-feed",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "status"
        },
        {
          "kind": "intent-count",
          "pattern": "*_status*",
          "min": 3
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Feed-проекция, где mainEntity имеет status с ≥4 значениями и lifecycle, группируется табами по smeantic-кластерам статусов (active / pending / done / cancelled). Tab = неявный filter по status ∈ {cluster}. Active — default tab."
    },
    "rationale": {
      "hypothesis": "Когда lifecycle длинный и пользователь работает в одном фазе одновременно, single list с mixed statuses создаёт визуальный шум. Tabs по статусам делают 'сейчас моё внимание' первичным focus и отделяют work-in-progress от архива.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Orders: 'В работе / На проверке / Завершённые / Отменённые' как табы",
          "reliability": "high"
        },
        {
          "source": "upwork.com",
          "description": "Contracts: Active / Past / Disputed tabs",
          "reliability": "high"
        },
        {
          "source": "linear.app",
          "description": "Issues grouped by status lanes (частный случай)",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "email inbox",
          "description": "Lifecycle-мерзкий; только read/unread — tabs избыточны",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "orders_feed",
          "reason": "Order.status с 7+ значениями + status-transition intents"
        },
        {
          "domain": "sales",
          "projection": "orders_feed",
          "reason": "Order lifecycle long"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "Нет длинного status-lifecycle"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-status-tab-feed.json",
        "slot": "header",
        "primarySource": "kwork.ru",
        "description": "Feed-проекция, где mainEntity имеет status с ≥4 значениями и lifecycle, группируется табами по smeantic-кластерам статусов (active / pending"
      }
    ]
  },
  {
    "id": "temporal-witness-chip",
    "version": 1,
    "status": "candidate",
    "archetype": null,
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "dueDate"
        },
        {
          "kind": "field-role-present",
          "entity": "*",
          "role": "date-witness"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Поле dueDate/deadline рендерится в card/row как chip с цветовым состоянием: neutral (>24h), warning (<24h), critical (overdue). Цвет — производное от now vs dueDate, вычисляется в renderer на каждом ре-рендере."
    },
    "rationale": {
      "hypothesis": "Relative-time ('через 3 дня', '2 часа просрочки') — единственный способ сделать temporal urgency перцептивно очевидной в списке. Absolute timestamp не масштабируется на сканируемость.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "Срок сдачи заказа — chip, краснеет при просрочке",
          "reliability": "high"
        },
        {
          "source": "linear.app",
          "description": "Due-date с colored urgency",
          "reliability": "high"
        },
        {
          "source": "asana.com",
          "description": "Tasks с due-chip",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "archive list",
          "description": "Историческая сущность без live urgency — chip бесполезен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "orders_feed",
          "reason": "Order.eta — temporal witness"
        },
        {
          "domain": "lifequest",
          "projection": "tasks_feed",
          "reason": "Task.dueDate"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "messages_feed",
          "reason": "createdAt — не due-date urgency"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-temporal-witness-chip.json",
        "slot": "body",
        "primarySource": "kwork.ru",
        "description": "Поле dueDate/deadline рендерится в card/row как chip с цветовым состоянием: neutral (>24h), warning (<24h), critical (overdue). Цвет — произ"
      }
    ]
  },
  {
    "id": "trust-signal-mini-card",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*Profile*",
          "field": "rating"
        },
        {
          "kind": "entity-field",
          "entity": "*Profile*",
          "field": "responseTime"
        },
        {
          "kind": "entity-field",
          "entity": "*Profile*",
          "field": "verified"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "В detail-проекции у mainEntity (покупка/бронь у seller'а) появляется секция 'seller mini-card': avatar, displayName + ≤3 trust-сигнала (rating, responseTime, completedOrders, verified-badge). Кликабельна к полному профилю."
    },
    "rationale": {
      "hypothesis": "Покупательская evaluation — это в половине случаев доверие к продавцу, не к товару. Mini-card компактно инъектирует trust-сигналы прямо в solve-surface покупки без навигации к полному профилю.",
      "evidence": [
        {
          "source": "kwork.ru",
          "description": "В detail kwork'а справа блок продавца: avatar, имя, рейтинг ★4.9, время ответа '1 час'",
          "reliability": "high"
        },
        {
          "source": "etsy.com",
          "description": "Shop-mini-card на listing detail",
          "reliability": "high"
        },
        {
          "source": "airbnb.com",
          "description": "Host-card с Superhost badge и response-time",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "amazon retail",
          "description": "Продавец обычно скрыт — товар обезличен",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "service_detail",
          "reason": "Specialist с rating + responseTime + verified"
        },
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "SellerProfile + rating"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "position_detail",
          "reason": "Нет human-seller counterpart"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-kwork-service-packages-trust-signal-mini-card.json",
        "slot": "sections",
        "primarySource": "kwork.ru",
        "description": "В detail-проекции у mainEntity (покупка/бронь у seller'а) появляется секция 'seller mini-card': avatar, displayName + ≤3 trust-сигнала (rati"
      }
    ]
  },
  {
    "id": "badge-stack-markers",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "fieldType": "boolean",
          "min": 3,
          "naming": "flag-like"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Стек компактных бейджей в углу карточки, показывающих boolean-маркеры (Easy Apply / Promoted / Actively Recruiting / Top Applicant). Не экспандируется в подпись — визуальный shortcut для фильтрации глазом."
    },
    "rationale": {
      "hypothesis": "Несколько boolean-флагов на entity эффективнее рендерить как парсируемый badge-стек, чем как текстовые подписи: цветовое кодирование + icon-glyph даёт 5x быстрее scan, чем чтение 'Easy Apply enabled. Promoted. Actively recruiting.'",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "Easy Apply (bolt) / Promoted (pin) / Actively Recruiting (person-check) / Top Applicant (crown, Premium-gated) в правом нижнем углу job card",
          "reliability": "high"
        },
        {
          "source": "github-pr-list",
          "description": "Badges: draft / ready-for-review / conflicts / changes-requested",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "jira",
          "description": "Когда флагов 10+ — badge-стек превращается в шум; нужен collapsed indicator",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "assets_catalog",
          "reason": "boolean-поля: isWatchlisted / hasActiveSignal / isRestrictedRegion"
        },
        {
          "domain": "delivery",
          "projection": "orders_catalog",
          "reason": "isExpress / requiresAgeCheck / hasSpecialInstructions"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "messages_detail",
          "reason": "message не имеет набора boolean-флагов для badge-стека"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-badge-stack-markers.json",
        "slot": "body",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Стек компактных бейджей в углу карточки, показывающих boolean-маркеры (Easy Apply / Promoted / Actively Recruiting / Top Applicant). Не эксп"
      }
    ]
  },
  {
    "id": "completeness-progress",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "role": "percentage"
        },
        {
          "kind": "entity-field",
          "fields": [
            "completenessPercent",
            "complete",
            "progress"
          ],
          "nameLike": true
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Прогресс-бар в header detail с percentage completion + actionable hint ('add N to reach M%'). Gamifies заполнение optional-полей через visible goal-distance."
    },
    "rationale": {
      "hypothesis": "Опциональные поля entity не заполняются без external-pressure. Completeness-meter конвертирует passive optional-fields в active goal-gradient: пользователь видит '87%' и интуитивно хочет '100%'. Zeigarnik-effect + visible progress-bar.",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "Profile strength meter (All-Star, Intermediate, Beginner) с contextual 'add X to improve'",
          "reliability": "high"
        },
        {
          "source": "github-profile",
          "description": "Profile completion checklist при onboarding",
          "reliability": "medium"
        },
        {
          "source": "duolingo",
          "description": "Daily goal progress bar — тот же gamification-механизм",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "medical-chart",
          "description": "Completeness meter вреден — врач не должен воспринимать медицинскую карту как gamified goal",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "lifequest",
          "projection": "profile_detail",
          "reason": "user onboarding с sphere-assessment-completeness идеально ложится"
        },
        {
          "domain": "reflect",
          "projection": "profile_detail",
          "reason": "entries-variety completeness для мотивации разнообразия мудов"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_detail",
          "reason": "portfolio completeness не имеет смысла — портфолио завершается не заполнением полей"
        },
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "conversation не имеет 'complete' state"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-completeness-progress.json",
        "slot": "header",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Прогресс-бар в header detail с percentage completion + actionable hint ('add N to reach M%'). Gamifies заполнение optional-полей через visib"
      }
    ]
  },
  {
    "id": "dual-cta-branching",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "<same>",
          "min": 2
        },
        {
          "kind": "intent-confirmation",
          "distinct": true,
          "min": 2
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Два visually-equal primary CTA на detail, создающих одну и ту же сущность разными путями (internal wizard vs external redirect, form vs click). Разные confirmation-типы сигнализируют branch-decision пользователю до тапа."
    },
    "rationale": {
      "hypothesis": "Наивный подход — один primary CTA — вынуждает лендить на disambiguating modal после тапа; branch-decision должен быть видим до commitment, потому что стоимость branch'ей ассиметрична (одно = 30s inline wizard, другое = 5 min external site + re-login).",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "Easy Apply (filled badge) + Apply on company site (outline) бок-о-бок; пользователь выбирает до commitment",
          "reliability": "high"
        },
        {
          "source": "github-pr-merge",
          "description": "Merge / Squash / Rebase — три CTA с разной семантикой коммита",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "stripe-checkout",
          "description": "Один Pay Now CTA — ветвление метода оплаты скрыто под tab'ами выше CTA, потому что стоимость branch'ей симметрична",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "asset_detail",
          "reason": "Buy via advisor / Buy direct — два create-пути Position с разным confirmation"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "send_message — single CTA, нет branching create-пути"
        },
        {
          "domain": "booking",
          "projection": "service_detail",
          "reason": "book_slot — один create-path"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-dual-cta-branching.json",
        "slot": "primaryCTA",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Два visually-equal primary CTA на detail, создающих одну и ту же сущность разными путями (internal wizard vs external redirect, form vs clic"
      }
    ]
  },
  {
    "id": "filter-chip-bar",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "feed.filters"
        },
        {
          "kind": "intent-confirmation",
          "value": "click"
        },
        {
          "kind": "intent-count",
          "min": 1,
          "where": {
            "target": "feed.filters"
          }
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Горизонтальный scrollable chip-bar над body с boolean/enum фильтрами, применяемыми live по tap без submit-кнопки. Chip = одно replace на feed.filters."
    },
    "rationale": {
      "hypothesis": "Chip-bar даёт visible filter-state и mutational access за 1 tap — дешевле, чем modal filter-sheet, который скрывает активные фильтры и требует submit. Горизонтальный scroll масштабируется лучше, чем grid из чекбоксов.",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "Chip-bar под search input: Easy Apply / Remote / Date Posted / Experience Level — активные chips визуально выделены, tap моментально сужает feed",
          "reliability": "high"
        },
        {
          "source": "google-maps",
          "description": "Restaurants / Gas / Coffee chip-bar над картой с live-apply",
          "reliability": "high"
        },
        {
          "source": "youtube-mobile",
          "description": "Chip-bar категорий над feed (All / Music / Gaming)",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "booking.com",
          "description": "Для многомерных фильтров (цена+даты+удобства) используется sheet — chip-bar не вмещает range-параметры",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "многократные toggle/enum-фильтры над каталогом объявлений"
        },
        {
          "domain": "delivery",
          "projection": "menu_feed",
          "reason": "фильтры по категории блюд / времени доставки"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "detail — нет feed.filters"
        },
        {
          "domain": "reflect",
          "projection": "mood_canvas",
          "reason": "canvas-архетип не использует filter-chip-bar"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-filter-chip-bar.json",
        "slot": "toolbar",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Горизонтальный scrollable chip-bar над body с boolean/enum фильтрами, применяемыми live по tap без submit-кнопки. Chip = одно replace на fee"
      }
    ]
  },
  {
    "id": "inline-social-proof-row",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKey": "toMainEntity",
          "entityKind": "reference"
        },
        {
          "kind": "entity-field",
          "fields": [
            "count",
            "percent",
            "photo",
            "name"
          ],
          "minMatch": 2
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Под title карточки — secondary row с агрегатными данными из reference-сущности: количество связей, процент совпадения, аватар+имя ответственного. Не primary decision-signal, но reduces cost-of-evaluation."
    },
    "rationale": {
      "hypothesis": "Proof-данные о связях (N mutual connections / X% match / known recruiter) снижают скрининг-стоимость с O(n) открытий detail до O(1) scanning. Без inline proof пользователь open'ает каждую карточку, чтобы оценить relevance.",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "12 connections / 7 of 10 skills match / recruiter photo+name inline в job card",
          "reliability": "high"
        },
        {
          "source": "airbnb",
          "description": "Superhost badge + review count+rating inline в listing card",
          "reliability": "high"
        },
        {
          "source": "amazon",
          "description": "Rating stars + review count inline на product card",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "tinder",
          "description": "Inline social proof вреден — продукт намеренно скрывает mutual friends до match'а",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "рейтинг продавца + количество review inline на карточке listing"
        },
        {
          "domain": "delivery",
          "projection": "merchants_catalog",
          "reason": "рейтинг + delivery-time + review-count inline"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "workflow",
          "projection": "workflows_catalog",
          "reason": "workflow не имеет reference-entity с proof-метриками"
        },
        {
          "domain": "lifequest",
          "projection": "goals_catalog",
          "reason": "цели — personal scope, social-proof не применим"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-inline-social-proof-row.json",
        "slot": "body",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Под title карточки — secondary row с агрегатными данными из reference-сущности: количество связей, процент совпадения, аватар+имя ответствен"
      }
    ]
  },
  {
    "id": "lateral-similar-items",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "value": "internal"
        },
        {
          "kind": "intent-count",
          "where": {
            "α": "replace",
            "target": "feed.query"
          },
          "min": 1
        },
        {
          "kind": "sub-entity-exists",
          "self-reference": true
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Secondary-секция 'Similar X' в detail с 3-5 карточек той же сущности, отобранных по similarity-метрике. Lateral navigation — переход в соседний detail без возврата в catalog."
    },
    "rationale": {
      "hypothesis": "Пользователь в detail с negative-intent ('не тот'), но уже инвестировал в контекст (прочитал title, salary, requirements). Similar-секция дешевле, чем back→catalog→scroll→new-detail: сохраняет инвестицию контекста и ускоряет decision-flow.",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "Similar Jobs внизу job detail — 3 карточки с тем же layout, один-тап lateral nav",
          "reliability": "high"
        },
        {
          "source": "youtube",
          "description": "Related videos sidebar",
          "reliability": "high"
        },
        {
          "source": "amazon",
          "description": "Customers also viewed carousel",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "medical-records-detail",
          "description": "Lateral similar вреден — пациент не должен видеть похожие кейсы, это privacy breach",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "Similar listings под detail — classic e-commerce lateral"
        },
        {
          "domain": "invest",
          "projection": "asset_detail",
          "reason": "Similar assets по sector/cap"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "goals — personal, similar не имеет смысла"
        },
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "conversation уникальна, lateral nav не релевантна"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-lateral-similar-items.json",
        "slot": "sections",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Secondary-секция 'Similar X' в detail с 3-5 карточек той же сущности, отобранных по similarity-метрике. Lateral navigation — переход в сосед"
      }
    ]
  },
  {
    "id": "overflow-secondary-actions",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-count",
          "min": 4,
          "where": {
            "entity": "<mainEntity>"
          }
        },
        {
          "kind": "intent-creates",
          "min": 1,
          "marker": "primary"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Kebab/overflow-меню в toolbar для низкочастотных или destructive действий (Share / Report / Save / Hide), отделённое от primary-CTA. Primary actions остаются visible, secondary — one-tap-away."
    },
    "rationale": {
      "hypothesis": "Когда intent'ов на entity >3, равное визуальное представление разжижает primary call-to-action. Overflow-menu сохраняет primary-weight, при этом не скрывает secondary полностью (cost = 1 extra tap). Discoverability > always-visible для rare/destructive actions.",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "⋯ меню в job card/detail содержит Save / Share / Report / Hide / Copy link — primary (Apply) остаётся visible",
          "reliability": "high"
        },
        {
          "source": "gmail",
          "description": "Kebab-меню в email-row: archive/label/mute/report-spam",
          "reliability": "high"
        },
        {
          "source": "slack",
          "description": "... menu на message: pin/bookmark/copy-link/report",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "figma-canvas",
          "description": "В creative tools overflow вреден — все действия должны быть one-tap для flow-state",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "8+ intent'ов (save/share/report/bid/ask/message/watch/hide) — primary CTA нужно защитить"
        },
        {
          "domain": "messenger",
          "projection": "message_detail",
          "reason": "pin/react/forward/copy/delete/report — overflow естественен"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "slot_detail",
          "reason": "2 intent'а (book/cancel) — overflow избыточен"
        },
        {
          "domain": "planning",
          "projection": "vote_detail",
          "reason": "3 intent'а — все primary-равны, overflow скроет core-flow"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-overflow-secondary-actions.json",
        "slot": "toolbar",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Kebab/overflow-меню в toolbar для низкочастотных или destructive действий (Share / Report / Save / Hide), отделённое от primary-CTA. Primary"
      }
    ]
  },
  {
    "id": "saved-search-subscription",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "SavedSearch"
        },
        {
          "kind": "entity-field",
          "entity": "SavedSearch",
          "fields": [
            "query",
            "filters",
            "notifyEnabled"
          ]
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "savedSearch.notifyEnabled"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Save-current-query action в toolbar feed'а, конвертирующая ad-hoc query+filters в именованную subscribed SavedSearch с notify-toggle. Создаёт sub-feed, управляемый через отдельный My-section."
    },
    "rationale": {
      "hypothesis": "Повторяющийся поиск имеет stateful-intent ('расскажи, когда появится'). Без SavedSearch пользователь возвращается в feed каждый N дней и pollиng'ует; с SavedSearch — push-нотификации. Конверсия pull → push снижает re-engagement cost.",
      "evidence": [
        {
          "source": "linkedin-jobs-mobile",
          "description": "Floating 'Get job alerts for this search' CTA после второго-третьего search, toggle в saved-search detail",
          "reliability": "high"
        },
        {
          "source": "craigslist",
          "description": "Save search + email alert",
          "reliability": "high"
        },
        {
          "source": "zillow",
          "description": "Saved searches with daily/weekly alerts",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "google-search-general",
          "description": "Web search queries слишком broad, saved-search как first-class сущность нет смысла",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_catalog",
          "reason": "в sales есть SavedSearch — classic marketplace pattern"
        },
        {
          "domain": "invest",
          "projection": "assets_catalog",
          "reason": "alerts на screener query"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_feed",
          "reason": "messages не являются discoverable через search+alert flow"
        },
        {
          "domain": "planning",
          "projection": "polls_feed",
          "reason": "polls — временные, не subscribeable query"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-linkedin-jobs-mobile-saved-search-subscription.json",
        "slot": "toolbar",
        "primarySource": "linkedin-jobs-mobile",
        "description": "Save-current-query action в toolbar feed'а, конвертирующая ad-hoc query+filters в именованную subscribed SavedSearch с notify-toggle. Создаё"
      }
    ]
  },
  {
    "id": "capability-gated-cta",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "phoneVerified|documentsVerified|kycCompleted",
          "role": "boolean-capability"
        },
        {
          "kind": "intent-creates",
          "entity": "CallIntent|Bid|Payment"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "CTA (позвонить / отправить bid / заплатить) активен только при entity.verifiedX=true; иначе показывается disabled-состояние с tooltip-объяснением или inline prompt-to-verify"
    },
    "rationale": {
      "hypothesis": "Вместо прятать CTA — показать disabled с reason, чтобы юзер понимал capability model и знал, какое условие закрыть; скрытие порождает «почему не работает» конфуз",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "«Позвонить» недоступен, пока specialist.phoneVerified=false; tooltip поясняет",
          "reliability": "high"
        },
        {
          "source": "revolut",
          "description": "Payment disabled до KYC, с явным onboarding-path",
          "reliability": "high"
        },
        {
          "source": "github-actions",
          "description": "«Run workflow» disabled, пока не включены permissions",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "google-docs",
          "description": "Нет capability-gating на базовые действия",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "specialist_profile",
          "reason": "call gated на phoneVerified"
        },
        {
          "domain": "invest",
          "projection": "transaction_create",
          "reason": "trade gated на kycCompleted"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_log",
          "reason": "нет capability-полей на core-actions"
        },
        {
          "domain": "lifequest",
          "projection": "habit_log",
          "reason": "нет verification-gating"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-capability-gated-cta.json",
        "slot": "primaryCTA",
        "primarySource": "profi.ru",
        "description": "CTA (позвонить / отправить bid / заплатить) активен только при entity.verifiedX=true; иначе показывается disabled-состояние с tooltip-объясн"
      }
    ]
  },
  {
    "id": "draft-resume-entry",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "entity": "*Draft",
          "kind_value": "internal"
        },
        {
          "kind": "intent-effect",
          "target": "session.activeDraftId|session.activeSessionId"
        }
      ]
    },
    "structure": {
      "slot": "hero",
      "description": "Если у текущего user есть *Draft с updatedAt в лимите (или без лимита), на верху feed/catalog показывается «Незавершённое» entry-card с continue-CTA, восстанавливающий activeDraftId"
    },
    "rationale": {
      "hypothesis": "Пользователь не помнит, что бросил черновик посреди wizard; явная точка возврата конвертирует незавершённые попытки в completed без давления",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "Верхний блок «Незавершённое» с кнопкой «Продолжить» над каталогом",
          "reliability": "high"
        },
        {
          "source": "medium.com",
          "description": "Draft-list с continue CTA в композере",
          "reliability": "high"
        },
        {
          "source": "stripe-checkout",
          "description": "Recovery-email с ссылкой на брошенный checkout",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "twitter-tweet",
          "description": "Draft хранится локально, но не выдаётся отдельной entry-card",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "my_listings",
          "reason": "у Listing может быть draft-состояние"
        },
        {
          "domain": "delivery",
          "projection": "customer_orders",
          "reason": "незавершённый cart-checkout"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations_list",
          "reason": "draft-message session-scoped, нет *Draft entity"
        },
        {
          "domain": "reflect",
          "projection": "mood_entries_feed",
          "reason": "запись фиксируется сразу, draft-flow нет"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-draft-resume-entry.json",
        "slot": "hero",
        "primarySource": "profi.ru",
        "description": "Если у текущего user есть *Draft с updatedAt в лимите (или без лимита), на верху feed/catalog показывается «Незавершённое» entry-card с cont"
      }
    ]
  },
  {
    "id": "elevated-facet-toggle",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "format|mode|delivery",
          "role": "categorical"
        },
        {
          "kind": "intent-effect",
          "target": "session.filters.format|session.filters.mode"
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Высокотрафиковый enum-фасет вытащен над общим filter-панелем как сегментированный toggle (Онлайн / Очно / Выезд); остальные фильтры остаются свёрнутыми"
    },
    "rationale": {
      "hypothesis": "Если один фасет переключают чаще остальных, его элевация снижает cognitive cost: первое решение юзер принимает в 1 клик, не сканируя панель",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "Кнопки «Онлайн / Очно / Выезд» выше всех фильтров",
          "reliability": "high"
        },
        {
          "source": "uber-eats",
          "description": "Delivery / Pickup toggle в верхней части",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "booking.com",
          "description": "Нет одного доминирующего фасета — все равноправны",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "merchants_browse",
          "reason": "pickup vs delivery — high-traffic toggle"
        },
        {
          "domain": "booking",
          "projection": "specialists_browse",
          "reason": "online/offline формат"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "positions_dashboard",
          "reason": "нет format-поля с равнозначными вариантами"
        },
        {
          "domain": "reflect",
          "projection": "mood_entries_feed",
          "reason": "нет formats"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-elevated-facet-toggle.json",
        "slot": "toolbar",
        "primarySource": "profi.ru",
        "description": "Высокотрафиковый enum-фасет вытащен над общим filter-панелем как сегментированный toggle (Онлайн / Очно / Выезд); остальные фильтры остаются"
      }
    ]
  },
  {
    "id": "feed-summary-header",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "child": "Bid|Order|Transaction",
          "parent": "*"
        },
        {
          "kind": "field-role-present",
          "roles": [
            "aggregate-count",
            "money",
            "status-new"
          ]
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Над inbox-like feed'ом — sticky summary-header c 2-4 агрегатами (всего, новых, средняя цена, max отклик) — сгущённая метрика по видимой выборке"
    },
    "rationale": {
      "hypothesis": "Когда в feed'е гетерогенные items с численными атрибутами, агрегаты сверху дают мгновенный контекст: юзер сразу видит объём и распределение, прежде чем скроллить",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "Над списком откликов: «12 откликов · 3 новых · в среднем 2500₽»",
          "reliability": "high"
        },
        {
          "source": "upwork-proposals",
          "description": "Header с count + average bid",
          "reliability": "high"
        },
        {
          "source": "gmail-inbox",
          "description": "Counter «N unread» сверху",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "twitter-timeline",
          "description": "Агрегаты бессмысленны для бесконечной ленты",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "invest",
          "projection": "portfolio_dashboard",
          "reason": "positions-count + total-value + day-change"
        },
        {
          "domain": "delivery",
          "projection": "dispatcher_orders",
          "reason": "active/pending/completed counts"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_entries_feed",
          "reason": "personal-scope, агрегаты не несут ценности над записями"
        },
        {
          "domain": "messenger",
          "projection": "conversations_list",
          "reason": "unread-count уже достаточен, без price/count breakdown"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-feed-summary-header.json",
        "slot": "header",
        "primarySource": "profi.ru",
        "description": "Над inbox-like feed'ом — sticky summary-header c 2-4 агрегатами (всего, новых, средняя цена, max отклик) — сгущённая метрика по видимой выбо"
      }
    ]
  },
  {
    "id": "multi-step-wizard-with-progress",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "*Draft"
        },
        {
          "kind": "entity-field",
          "entity": "*Draft",
          "field": "currentStep|draftStep",
          "role": "progress"
        },
        {
          "kind": "intent-effect",
          "target": "orderDraft.currentStep|draftDraft.currentStep"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Многошаговый wizard с progress-bar: start_*_draft → fill_*_step → advance_*_step → publish; каждый шаг renders as form-archetype инстанс с доступом к draft state"
    },
    "rationale": {
      "hypothesis": "Крупный form (≥5 полей разнородных) лучше нарезать на шаги с progress-bar: снижается drop-off, юзер видит прогресс, draft сохраняется между шагами",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "6-8 шагов для order creation с progress-bar сверху",
          "reliability": "high"
        },
        {
          "source": "stripe-checkout",
          "description": "3-шаговый wizard с явной progress-полоской",
          "reliability": "high"
        },
        {
          "source": "turbotax",
          "description": "Многошаговая декларация с progress",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "google-form",
          "description": "Длинный single-page form работает для коротких опросов",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "delivery",
          "projection": "order_checkout",
          "reason": "address → items → payment wizard"
        },
        {
          "domain": "booking",
          "projection": "booking_create",
          "reason": "specialist → slot → details wizard"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_log",
          "reason": "одношаговый лог без draft"
        },
        {
          "domain": "messenger",
          "projection": "send_message",
          "reason": "single composer, нет draft-entity"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-multi-step-wizard-with-progress.json",
        "slot": "body",
        "primarySource": "profi.ru",
        "description": "Многошаговый wizard с progress-bar: start_*_draft → fill_*_step → advance_*_step → publish; каждый шаг renders as form-archetype инстанс с д"
      }
    ]
  },
  {
    "id": "polymorphic-form-step",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "*Draft",
          "field": "categoryId|typeId|discriminatorId",
          "role": "reference"
        },
        {
          "kind": "entity-field",
          "entity": "*Draft",
          "field": "stepAnswers",
          "role": "polymorphic-bag"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Один шаг wizard-а рендерится полиморфно по значению discriminator (category): поля «класс» для tutor, «площадь» для repair, «проблема» для psychologist — подгружаются из category-specific schema"
    },
    "rationale": {
      "hypothesis": "Показывать все возможные поля одновременно — шум; условные поля по discriminator сужают внимание до релевантного и снижают ошибки заполнения",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "Шаг «Детали» меняет поля в зависимости от выбранной рубрики",
          "reliability": "high"
        },
        {
          "source": "avito.ru",
          "description": "Форма подачи объявления меняется по категории",
          "reliability": "high"
        },
        {
          "source": "typeform-logic-jumps",
          "description": "Условные ветки по ответу",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "contact-form",
          "description": "Плоский form без полиморфизма — полей мало и они одинаковы",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "workflow",
          "projection": "node_config",
          "reason": "node.type определяет config-поля"
        },
        {
          "domain": "delivery",
          "projection": "menu_item_edit",
          "reason": "MenuItem.type (dish/drink/combo) меняет поля"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_log",
          "reason": "единая форма без discriminator"
        },
        {
          "domain": "messenger",
          "projection": "send_message",
          "reason": "нет polymorphic bag"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-polymorphic-form-step.json",
        "slot": "body",
        "primarySource": "profi.ru",
        "description": "Один шаг wizard-а рендерится полиморфно по значению discriminator (category): поля «класс» для tutor, «площадь» для repair, «проблема» для p"
      }
    ]
  },
  {
    "id": "preview-before-publish",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "*",
          "irreversibility": "high"
        },
        {
          "kind": "intent-effect",
          "target": "*.previewMode"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Перед high-irreversibility publish интент показывается preview-рендер того же мира, что увидит counterparty (specialist — для клиента) — как mastering-view, убеждающий в полноте и корректности"
    },
    "rationale": {
      "hypothesis": "Preview-шаг перед необратимым коммитом снижает regret и поддерживает уверенность: юзер видит финальный артефакт до публикации, может уточнить без cancel-flow",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "«Предпросмотр задания» шаг перед публикацией order",
          "reliability": "high"
        },
        {
          "source": "medium.com",
          "description": "Preview-режим перед publish статьи",
          "reliability": "high"
        },
        {
          "source": "airbnb-listing-create",
          "description": "Preview объявления перед go-live",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "twitter-tweet",
          "description": "Нет preview — tweet публикуется сразу, preview избыточен для короткого текста",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_create",
          "reason": "publish_listing — irreversible publish"
        },
        {
          "domain": "delivery",
          "projection": "merchant_menu_publish",
          "reason": "публикация меню"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "send_message",
          "reason": "message ephemeral, preview избыточен"
        },
        {
          "domain": "reflect",
          "projection": "mood_log",
          "reason": "private-scope, нет counterparty"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-preview-before-publish.json",
        "slot": "body",
        "primarySource": "profi.ru",
        "description": "Перед high-irreversibility publish интент показывается preview-рендер того же мира, что увидит counterparty (specialist — для клиента) — как"
      }
    ]
  },
  {
    "id": "promoted-slot-injection",
    "version": 1,
    "status": "candidate",
    "archetype": "catalog",
    "trigger": {
      "requires": [
        {
          "kind": "entity-kind",
          "entity": "PromotionSlot|SponsoredSlot|FeaturedPlacement",
          "kind_value": "reference"
        },
        {
          "kind": "entity-field",
          "entity": "*",
          "field": "position|rank|tier",
          "role": "rank"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Первые N позиций каталога — промо-слоты, маркируются badge (TOP / Рекомендуем); ranking = композиция органического и paid-tier, promoted-кратч выводится как отдельная визуальная прослойка"
    },
    "rationale": {
      "hypothesis": "Явный badge на промо-слоте сохраняет доверие к ranking'у при монетизации — юзер видит, что позиция куплена, и может сравнить с органическим хвостом",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "2-4 верхние карточки с «TOP», рядом с органическими",
          "reliability": "high"
        },
        {
          "source": "yandex.market",
          "description": "«Спонсор» над карточкой товара в поиске",
          "reliability": "high"
        },
        {
          "source": "google-search",
          "description": "«Реклама» лейбл над paid-результатами",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "spotify-playlist",
          "description": "Нет монетизированных позиций внутри плейлиста — badge избыточен",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_browse",
          "reason": "маркетплейс с платными позициями"
        },
        {
          "domain": "delivery",
          "projection": "merchants_browse",
          "reason": "рестораны могут покупать верхние позиции"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "entries_feed",
          "reason": "нет монетизации порядка"
        },
        {
          "domain": "workflow",
          "projection": "nodes_canvas",
          "reason": "нет entity PromotionSlot"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-promoted-slot-injection.json",
        "slot": "body",
        "primarySource": "profi.ru",
        "description": "Первые N позиций каталога — промо-слоты, маркируются badge (TOP / Рекомендуем); ranking = композиция органического и paid-tier, promoted-кра"
      }
    ]
  },
  {
    "id": "stat-breakdown-header",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "field-role-present",
          "entity": "*",
          "roles": [
            "percentage",
            "count",
            "duration"
          ],
          "min": 3
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "В header detail вместо single-score (рейтинг) показывается раскладка из 3-5 ортогональных метрик репутации (опыт в месяцах, % ответов за час, повторные клиенты, сертификации), каждая — как отдельный stat-chip"
    },
    "rationale": {
      "hypothesis": "Single-score скрывает механику доверия; разбивка на ортогональные факторы даёт юзеру решать, какая метрика важна именно ему — и снижает манипулируемость рейтингом",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "Profile-header: «Опыт 7 лет · Отвечает за час 95% · 23 повторных клиента»",
          "reliability": "high"
        },
        {
          "source": "upwork",
          "description": "Job Success Score + hours + earned — multi-stat header",
          "reliability": "high"
        },
        {
          "source": "github-user",
          "description": "Contribution breakdown вместо single-score",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "imdb-movie",
          "description": "Single rating работает, потому что оценивают одну ось — фильм",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "seller_profile",
          "reason": "rating + sales-count + response-time"
        },
        {
          "domain": "delivery",
          "projection": "merchant_detail",
          "reason": "rating + avg-time + cancel-rate"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "личная запись без репутационных метрик"
        },
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "нет stat-полей в сущности"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-stat-breakdown-header.json",
        "slot": "header",
        "primarySource": "profi.ru",
        "description": "В header detail вместо single-score (рейтинг) показывается раскладка из 3-5 ортогональных метрик репутации (опыт в месяцах, % ответов за час"
      }
    ]
  },
  {
    "id": "sticky-cta-bar",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "parent": "*",
          "minChildren": 3
        },
        {
          "kind": "intent-creates",
          "entity": "CallIntent|Conversation|Bid",
          "role": "primary-action"
        }
      ]
    },
    "structure": {
      "slot": "footer",
      "description": "В detail с множественными sub-sections (≥3) primary-action CTA переезжает в sticky-bar внизу viewport'a (особенно на mobile), оставаясь всегда доступным при скролле контента"
    },
    "rationale": {
      "hypothesis": "Когда detail содержит много контента (tabs, portfolio, reviews), primary CTA из heading-bar уходит за viewport; sticky footer гарантирует постоянный доступ без скролла вверх",
      "evidence": [
        {
          "source": "profi.ru",
          "description": "Bottom-bar с «Написать / Позвонить» на profile",
          "reliability": "high"
        },
        {
          "source": "airbnb-listing",
          "description": "Sticky «Reserve» CTA внизу на mobile",
          "reliability": "high"
        },
        {
          "source": "booking-hotel",
          "description": "Sticky booking CTA внизу при длинном описании",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "wikipedia-article",
          "description": "Нет single primary action — sticky CTA избыточен",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "specialist_profile",
          "reason": "sections Services/Reviews/Portfolio + primary booking CTA"
        },
        {
          "domain": "delivery",
          "projection": "merchant_detail",
          "reason": "меню + отзывы + часы, primary — «Заказать»"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "нет primary external action"
        },
        {
          "domain": "workflow",
          "projection": "node_detail",
          "reason": "нет primary CTA в потребительском смысле"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-profi-ru-catalog-sticky-cta-bar.json",
        "slot": "footer",
        "primarySource": "profi.ru",
        "description": "В detail с множественными sub-sections (≥3) primary-action CTA переезжает в sticky-bar внизу viewport'a (особенно на mobile), оставаясь всег"
      }
    ]
  },
  {
    "id": "countdown-auto-transition",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "autoRelease*|expiresAt|*Deadline",
          "semanticRole": "timestamp-future"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "*.state|*.status",
          "trigger": "scheduled_timer"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "В header detail-проекции рендерится живой countdown ('авто-перевод в released через 2д 14ч') до scheduled_timer-события. Countdown — не декоративный таймер, а визуализация §4 schedule-правила с revokeOn-условием."
    },
    "rationale": {
      "hypothesis": "Scheduled state-transition без видимого таймера воспринимается как 'внезапный': пользователь не понимает, что бездействие = согласие. Countdown делает принцип 'silence is consent' явным и возвращает agency.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "SafeDeal.autoReleaseAt: countdown 'деньги уйдут исполнителю через X' с кнопкой 'запросить доработку' (revokeOn)",
          "reliability": "high"
        },
        {
          "source": "ebay",
          "description": "auction-end-countdown с возможностью bid до нуля",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "soft-deadlines",
          "description": "Дедлайн без auto-action (например, просто due-date задачи) — countdown создаёт ложное давление",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "auto_cancel_pending_booking через 24h (timer-driven)"
        },
        {
          "domain": "delivery",
          "projection": "order_detail",
          "reason": "auto-confirm after delivery window"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "нет автоматических transitions"
        },
        {
          "domain": "workflow",
          "projection": "workflow_detail",
          "reason": "transitions триггерятся event'ами, не timer'ом"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-countdown-auto-transition.json",
        "slot": "header",
        "primarySource": "workzilla-marketplace",
        "description": "В header detail-проекции рендерится живой countdown ('авто-перевод в released через 2д 14ч') до scheduled_timer-события. Countdown — не деко"
      }
    ]
  },
  {
    "id": "derived-tier-badge",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "User|Actor",
          "field": "*Count|*Total",
          "semanticRole": "cumulative"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "*.tier|*.rank|*.level",
          "basis": "threshold|aggregation"
        }
      ]
    },
    "structure": {
      "slot": "header",
      "description": "Tier-label (Новичок / Специалист / Профи / Мастер) — чисто derived-поле от threshold-правил над cumulative-метрикой. Визуализируется бейджем в header профиля + inline на карточках (см. trust-signal-badges)."
    },
    "rationale": {
      "hypothesis": "Authored tier создаёт inflation (каждый продавец 'Gold'). Derived tier от прозрачного threshold даёт калиброванную шкалу доверия: и автор видит 'сколько до следующего', и viewer — что bar реальный.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "completedTasksCount + positiveReviewsPercent → tier ∈ {novice,specialist,pro,master}",
          "reliability": "high"
        },
        {
          "source": "stackoverflow",
          "description": "reputation → derived privileges/badges",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "enterprise-sales-badge",
          "description": "'Partner Gold' часто authored-от-условий-контракта, не от метрики",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "seller_profile",
          "reason": "tier от completed-deals + rating"
        },
        {
          "domain": "booking",
          "projection": "specialist_profile",
          "reason": "tier от completed-bookings + rating"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "contact_profile",
          "reason": "нет tier-концепции"
        },
        {
          "domain": "lifequest",
          "projection": "user_profile",
          "reason": "приватная прогрессия — level, но не tier-для-других"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-derived-tier-badge.json",
        "slot": "header",
        "primarySource": "workzilla-marketplace",
        "description": "Tier-label (Новичок / Специалист / Профи / Мастер) — чисто derived-поле от threshold-правил над cumulative-метрикой. Визуализируется бейджем"
      }
    ]
  },
  {
    "id": "escalation-observer-readonly-bundle",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "entity": "Dispute|Escalation|Appeal"
        },
        {
          "kind": "has-role",
          "base": "observer",
          "withCapability": "read-across-entities"
        },
        {
          "kind": "sub-entity-exists",
          "foreignKey": "parent",
          "minCount": 2
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "При создании Dispute активируется arbiter-роль (observer с расширенным scope), которому собирается bundle: messages + attachments + state-history + review-context в одной read-only проекции, без возможности писать в исходные sub-entity."
    },
    "rationale": {
      "hypothesis": "Арбитр не участник конфликта — его роль require-evidence, а не participate. Собирать контекст по отдельным проекциям (Chat, Files, History) замедляет rule и создаёт информационную асимметрию. Escalation-bundle формализует read-only консолидацию всего контекста.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "Открытие Dispute → arbiter видит всю переписку + attachments + state-log одной проекцией",
          "reliability": "high"
        },
        {
          "source": "ebay-resolution-center",
          "description": "dispute-resolution: buyer+seller chat, photos, transaction history в одном view",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "code-review",
          "description": "Reviewer активный участник (write via comments) — не escalation-observer",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "dispute_detail",
          "reason": "арбитр видит chat + order-history + bid-context"
        },
        {
          "domain": "delivery",
          "projection": "order_dispute",
          "reason": "dispatcher escalation bundle: courier-chat + route + photos"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "нет dispute-эскалации"
        },
        {
          "domain": "invest",
          "projection": "position_detail",
          "reason": "advisor read-access штатный, не escalation"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-escalation-observer-readonly-bundle.json",
        "slot": "body",
        "primarySource": "workzilla-marketplace",
        "description": "При создании Dispute активируется arbiter-роль (observer с расширенным scope), которому собирается bundle: messages + attachments + state-hi"
      }
    ]
  },
  {
    "id": "highlight-important-flag",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "*",
          "type": "boolean",
          "semanticRole": "priority|featured"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Булев флаг 'важное/супер/featured' визуально поднимает карточку в ленте (фон / рамка / иконка / pin), не меняя её позицию в sort-результате. Ортогонально sort-as-parameter."
    },
    "rationale": {
      "hypothesis": "Priority-флаг — семантический сигнал автора, а не артефакт сортировки. Смешивание с sort приводит к тому, что 'важные' прячутся при переключении режима. Визуальное выделение сохраняет сигнал независимо от порядка.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "isSuperTask → повышенный визуальный вес карточки + бейдж",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "typical-product-catalog",
          "description": "Если 30%+ элементов 'featured' — паттерн теряет сигнал",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_feed",
          "reason": "promoted/featured объявления"
        },
        {
          "domain": "invest",
          "projection": "watchlist",
          "reason": "starred/critical активы"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "planning",
          "projection": "polls_feed",
          "reason": "нет priority-флага"
        },
        {
          "domain": "reflect",
          "projection": "mood_log",
          "reason": "равнозначные записи дневника"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-highlight-important-flag.json",
        "slot": "body",
        "primarySource": "workzilla-marketplace",
        "description": "Булев флаг 'важное/супер/featured' визуально поднимает карточку в ленте (фон / рамка / иконка / pin), не меняя её позицию в sort-результате."
      }
    ]
  },
  {
    "id": "inline-sub-creator-in-card",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "archetype": "feed"
        },
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "intent-confirmation",
          "target": "sub-entity creation",
          "confirmation": "enter"
        }
      ]
    },
    "structure": {
      "slot": "composer",
      "description": "Карточка feed-элемента содержит quick-apply композер, создающий sub-entity (Bid) без перехода в detail и без модалки. Распространение composer-entry на sub-entity из feed-слота."
    },
    "rationale": {
      "hypothesis": "Модалка / навигация в detail ради одного действия (оставить отклик / ставку) ломают сканируемость ленты. Inline-composer внутри карточки превращает lead-generation действие в нулевой клик.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "Карточка задачи: forma с ценой/сроком/сообщением прямо внутри card, submit → Bid",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "any-listing-feed",
          "description": "Там, где создание sub-entity требует многостраничной формы (контракт, ответ на RFP) — inline не масштабируется",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_feed",
          "reason": "Bid к Listing прямо из карточки"
        },
        {
          "domain": "planning",
          "projection": "polls_feed",
          "reason": "Vote к Poll inline"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "specialists_feed",
          "reason": "бронирование требует выбора TimeSlot → отдельный flow"
        },
        {
          "domain": "invest",
          "projection": "portfolio_feed",
          "reason": "нет sub-entity для быстрого создания"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-inline-sub-creator-in-card.json",
        "slot": "composer",
        "primarySource": "workzilla-marketplace",
        "description": "Карточка feed-элемента содержит quick-apply композер, создающий sub-entity (Bid) без перехода в detail и без модалки. Распространение compos"
      }
    ]
  },
  {
    "id": "polymorphic-value-field",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "*Type",
          "type": "enum",
          "role": "discriminator"
        },
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "*Min|*Max|*Value",
          "minCount": 2
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Discriminator-поле (*Type) переключает отображение связанного value: одно значение (fixed) vs диапазон (range). В form — switch input; в detail — adaptive label ('5 000₽' vs '5 000–10 000₽')."
    },
    "rationale": {
      "hypothesis": "Отдельные поля budget_fixed/budget_min/budget_max ломают семантическую целостность. Discriminator + материализованная проекция сохраняют одну концепцию 'бюджет' с двумя формами, а UI адаптируется автоматически.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "budgetType={fixed|range} + budgetMin/budgetMax — form и card рендерят адаптивно",
          "reliability": "high"
        },
        {
          "source": "profi-ru-catalog",
          "description": "цена как fixed/range/от с тем же discriminator-подходом",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "financial-reports",
          "description": "Фиксированная структура (open/high/low/close) — discriminator излишен",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "price fixed vs auction-range"
        },
        {
          "domain": "booking",
          "projection": "service_detail",
          "reason": "стоимость услуги fixed или от/до"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "invest",
          "projection": "position_detail",
          "reason": "quantity всегда скалярная"
        },
        {
          "domain": "messenger",
          "projection": "message_detail",
          "reason": "нет polymorphic полей"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-polymorphic-value-field.json",
        "slot": "body",
        "primarySource": "workzilla-marketplace",
        "description": "Discriminator-поле (*Type) переключает отображение связанного value: одно значение (fixed) vs диапазон (range). В form — switch input; в det"
      }
    ]
  },
  {
    "id": "role-scoped-state-transitions",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "state",
          "statusValues": "≥4"
        },
        {
          "kind": "has-role",
          "base": "owner",
          "minCount": 2
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "*.state",
          "roleScope": "role-specific"
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Когда один state-machine видим ≥2 owner-ролям (customer+performer), primary CTA фильтруется не только по phase, но и по role: в 'waiting_review' customer видит 'Принять/Запросить доработку', performer видит 'Ждём решение' (disabled / read-only). Расширение phase-aware-primary-cta ролевой осью."
    },
    "rationale": {
      "hypothesis": "Двое участников в одной сделке с симметричным detail-view, но разными available-actions. Одинаковые buttons, но некоторые disabled — создают confusion ('почему у меня красная, а у него зелёная?'). Role-scoped CTA: каждая роль видит только свои transition'ы как actionable, чужие — как status-indicator.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "SafeDeal.waiting_review: customer=[accept, request_revision, open_dispute], performer=[wait-indicator]; в accepted наоборот",
          "reliability": "high"
        },
        {
          "source": "fiverr-order",
          "description": "seller delivers → buyer review CTA only on buyer view",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "single-owner-entity",
          "description": "Когда только один owner (мой проект в lifequest) — role-ось избыточна, достаточно phase-aware",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "order_detail",
          "reason": "buyer и seller видят разные transition-кнопки"
        },
        {
          "domain": "delivery",
          "projection": "delivery_detail",
          "reason": "customer / courier / merchant — разные capabilities"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "single owner, phase-aware-primary-cta достаточен"
        },
        {
          "domain": "reflect",
          "projection": "mood_entry_detail",
          "reason": "приватный, нет multi-role"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-role-scoped-state-transitions.json",
        "slot": "primaryCTA",
        "primarySource": "workzilla-marketplace",
        "description": "Когда один state-machine видим ≥2 owner-ролям (customer+performer), primary CTA фильтруется не только по phase, но и по role: в 'waiting_rev"
      }
    ]
  },
  {
    "id": "sidebar-subcollection",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "intent-count",
          "target": "sub-entity",
          "minBids": 1
        },
        {
          "kind": "internal",
          "entity": "sub-entity"
        }
      ]
    },
    "structure": {
      "slot": "sections",
      "description": "Sub-entity (Bids / Offers / Responses) рендерится в правой колонке detail-проекции рядом с описанием главной сущности, а не ниже (как subcollections). Применяется, когда sub-entity — ключевой decision-driver, а не второстепенный контекст."
    },
    "rationale": {
      "hypothesis": "Когда вся цель просмотра detail — решить по sub-entity (выбрать исполнителя/оффер), засовывать её 'ниже fold' заставляет scroll и разрывает сравнение 'условия задачи ↔ предложения'. Side-by-side layout держит оба контекста в viewport.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "detail задачи: описание слева 60%, Bids справа 40%",
          "reliability": "high"
        },
        {
          "source": "upwork",
          "description": "job-detail со списком proposals в правой колонке",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "github-issue",
          "description": "Комментарии — below-контент (хронологический лог), sidebar был бы противоестественным",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "bids как decision-driver рядом с описанием"
        },
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "TimeOptions + Votes рядом с описанием встречи"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "messages — единственный контент, нет 'главного' слева"
        },
        {
          "domain": "lifequest",
          "projection": "goal_detail",
          "reason": "habits — chronological progress, не сравнение"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-sidebar-subcollection.json",
        "slot": "sections",
        "primarySource": "workzilla-marketplace",
        "description": "Sub-entity (Bids / Offers / Responses) рендерится в правой колонке detail-проекции рядом с описанием главной сущности, а не ниже (как subcol"
      }
    ]
  },
  {
    "id": "single-select-siblings-reject",
    "version": 1,
    "status": "candidate",
    "archetype": "detail",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "mainEntity",
          "field": "selected*Id",
          "role": "single-select-ref"
        },
        {
          "kind": "sub-entity-exists",
          "foreignKey": "mainEntity"
        },
        {
          "kind": "entity-field",
          "entity": "sub-entity",
          "field": "status",
          "statusValues": [
            "pending",
            "selected",
            "rejected",
            "*"
          ]
        }
      ]
    },
    "structure": {
      "slot": "primaryCTA",
      "description": "Кнопка 'Выбрать' на sub-entity материализует не только replace(mainEntity.selectedId), но и cascade-replace(sibling.status='rejected'). Паттерн делает workflow-инвариант видимым в подтверждающем диалоге ('выбор одного отклонит остальные N')."
    },
    "rationale": {
      "hypothesis": "Без явного показа cascade-эффекта пользователь не понимает, что его выбор — не mark, а transaction. Confirm-диалог без summary о rejected-siblings ведёт к недоумению у авторов отвергнутых bid'ов и претензиям к владельцу. Explicit cascade-summary снижает этот конфликт.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "select_performer confirm: 'выбрать Ивана, отклонить остальные 12 откликов, списать 5 000₽ в escrow'",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "multi-winner-auction",
          "description": "В multi-select сценариях cascade-reject неприменим",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listing_detail",
          "reason": "selected bid → остальные rejected"
        },
        {
          "domain": "planning",
          "projection": "poll_detail",
          "reason": "финальный time pick → остальные options closed"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "booking",
          "projection": "booking_detail",
          "reason": "один booking → один слот, нет siblings для reject"
        },
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "нет select-semantics"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-single-select-siblings-reject.json",
        "slot": "primaryCTA",
        "primarySource": "workzilla-marketplace",
        "description": "Кнопка 'Выбрать' на sub-entity материализует не только replace(mainEntity.selectedId), но и cascade-replace(sibling.status='rejected'). Патт"
      }
    ]
  },
  {
    "id": "sort-as-parameter",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "intent-creates",
          "archetype": "feed"
        },
        {
          "kind": "entity-field",
          "entity": "SavedFilter|Filter|Params",
          "field": "sortBy"
        },
        {
          "kind": "intent-effect",
          "α": "replace",
          "target": "*.sortBy",
          "minCount": 1
        }
      ]
    },
    "structure": {
      "slot": "toolbar",
      "description": "Несколько эквивалентных сортировок ленты рендерятся segmented-control / dropdown в toolbar как единый sort-параметр, а не как отдельные табы/проекции. Sort — атрибут одной feed-проекции, а не её размножение."
    },
    "rationale": {
      "hypothesis": "Tabs за sort создают ложное разнообразие: пользователь ожидает разный контент, а получает ту же ленту другим порядком. Параметр сохраняет модель 'одна лента, разные взгляды' и не умножает навигацию.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "Лента задач: 'Новые / Дорогие / Срочные / По рейтингу автора' — одна лента, четыре sort-режима",
          "reliability": "high"
        },
        {
          "source": "profi-ru-catalog",
          "description": "Каталог мастеров: сортировка как параметр поверх одного списка",
          "reliability": "medium"
        }
      ],
      "counterexample": [
        {
          "source": "gmail-inbox",
          "description": "Inbox / Promotions / Social — это НЕ сортировки, а фильтры по категории; табы оправданы",
          "reliability": "high"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_feed",
          "reason": "лента объявлений с вариантами sortBy"
        },
        {
          "domain": "delivery",
          "projection": "merchant_menu",
          "reason": "меню с сортировками по цене/популярности"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversation_detail",
          "reason": "chronological, нет альтернативных sort-режимов"
        },
        {
          "domain": "workflow",
          "projection": "canvas",
          "reason": "canvas не сортируется"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-sort-as-parameter.json",
        "slot": "toolbar",
        "primarySource": "workzilla-marketplace",
        "description": "Несколько эквивалентных сортировок ленты рендерятся segmented-control / dropdown в toolbar как единый sort-параметр, а не как отдельные табы"
      }
    ]
  },
  {
    "id": "trust-signal-badges-on-card",
    "version": 1,
    "status": "candidate",
    "archetype": "feed",
    "trigger": {
      "requires": [
        {
          "kind": "entity-field",
          "entity": "User",
          "field": "isVerified*|isNew*|rating"
        },
        {
          "kind": "intent-creates",
          "archetype": "feed"
        },
        {
          "kind": "field-role-present",
          "role": "trust-signal"
        }
      ]
    },
    "structure": {
      "slot": "body",
      "description": "Булевы/derived trust-поля автора элемента (verified, new, tier) выносятся бейджами на карточку в ленте, а не только в детальный профиль. Feed-уровень trust-decisioning."
    },
    "rationale": {
      "hypothesis": "В marketplace решение 'делать ли отклик' принимается в ленте за секунды. Trust-сигналы, скрытые за клик в профиль, теряются. Card-level badges сжимают signal-to-decision time.",
      "evidence": [
        {
          "source": "workzilla-marketplace",
          "description": "Бейджи 'Верифицированный' и 'Новый заказчик' на карточке задачи",
          "reliability": "high"
        },
        {
          "source": "airbnb",
          "description": "Superhost-badge на карточке листинга",
          "reliability": "high"
        }
      ],
      "counterexample": [
        {
          "source": "linkedin-feed",
          "description": "Professional context: badges уместны только в профиле, в ленте создают шум",
          "reliability": "medium"
        }
      ]
    },
    "falsification": {
      "shouldMatch": [
        {
          "domain": "sales",
          "projection": "listings_feed",
          "reason": "seller verified/rating на карточке"
        },
        {
          "domain": "booking",
          "projection": "specialists_feed",
          "reason": "verified professional + rating"
        }
      ],
      "shouldNotMatch": [
        {
          "domain": "messenger",
          "projection": "conversations",
          "reason": "trust уже установлен — это контакты"
        },
        {
          "domain": "lifequest",
          "projection": "goals_feed",
          "reason": "приватный домен, нет внешних авторов"
        }
      ]
    },
    "sources": [
      {
        "file": "2026-04-19-workzilla-marketplace-trust-signal-badges-on-card.json",
        "slot": "body",
        "primarySource": "workzilla-marketplace",
        "description": "Булевы/derived trust-поля автора элемента (verified, new, tier) выносятся бейджами на карточку в ленте, а не только в детальный профиль. Fee"
      }
    ]
  }
];
