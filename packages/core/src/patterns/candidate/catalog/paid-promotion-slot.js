/**
 * Pinned promoted items в catalog body — явно помеченная, отделённая секция
 * над органическим выводом.
 * Source: profi.ru + avito.ru field research (2026-04-17-18).
 * Merged from profi-paid-promotion-slot + avito-paid-promotion-slot.
 *
 * Примечание: avito-вариант моделирует promotion-purchase flow (archetype: "form"
 * с Promotion entity + tier enum), profi-вариант — display-side (isPromoted flag
 * в catalog). Для matching-ready candidate выбрана profi-семантика (display),
 * как более универсальная и триггер-совместимая с entity-field. Avito-flow
 * останется отдельным кандидатом в будущем (promotion-tier-picker).
 */
export default {
  id: "paid-promotion-slot",
  version: 1,
  status: "candidate",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "entity-field", field: "isPromoted" },
    ],
  },
  structure: {
    slot: "body",
    description: "В catalog-feed первые N элементов (2–5) помечены как платно-продвинутые: визуально выделены бейджем 'ТОП' / 'Рекомендуем' / 'Продвинуто', фоновым tint'ом (светло-жёлтый / светло-синий), фиксированы над органикой независимо от активной сортировки. Pattern обогащает body: добавляет pinnedSection c элементами где isPromoted===true ИЛИ promotionTier!==null, отрезает их от основного отсортированного списка и вставляет перед ним. В каждой карточке promoted-секции — обязательный label (не убирается), чтобы соблюсти требование 'реклама' (Закон о рекламе / FTC disclosure). Альтернативный trigger: entity-field `promotionTier` с enum ('basic'|'featured'|'top'|'premium'). Паттерн не применяется в detail или feed — только catalog.",
  },
  rationale: {
    hypothesis: "Двусторонние маркетплейсы монетизируются через платные позиции в выдаче. Пользователи толерантны к рекламе, если она (а) явно помечена, (б) ограничена по объёму (не >30% видимой площади), (в) отделена от органики визуально. Простое вкидывание promoted-items в общий sort ломает доверие и иерархию signal'ов. Выделенная pinned-секция с явным бейджем разделяет коммерческую и органическую выдачу, сохраняя полезность каталога.",
    evidence: [
      { source: "profi.ru", description: "Первые 2–4 позиции в каталоге — бейдж 'ТОП', фон с tint'ом, фиксированы", reliability: "high" },
      { source: "avito", description: "'VIP-объявления' в верхней секции каталога с жёлтой плашкой; продвижение объявления через tier-picker (Бесплатно / Выделить / Премиум / XL)", reliability: "high" },
      { source: "youla", description: "'Продвинутые' объявления с фиксированной позицией", reliability: "high" },
      { source: "yandex-market", description: "'Спецпредложения' в отдельной sticky-секции над listing grid", reliability: "high" },
      { source: "ebay", description: "Sponsored listings с 'Ad' label в поиске", reliability: "high" },
      { source: "google-search", description: "Sponsored results с явным 'Ad' тэгом до органики; Google Shopping — sponsored products labeled + separated from organic", reliability: "high" },
    ],
    counterexample: [
      { source: "non-marketplace-feeds", description: "Personal feeds (messenger, lifequest, reflect) не монетизируются и не должны иметь promoted-items", reliability: "high" },
      { source: "detail-page", description: "Detail — single-item view, promoted-slot не имеет смысла", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales", projection: "listing_feed", reason: "Listing имеет или может иметь isPromoted boolean / promotionTier — маркетплейс с платными позициями" },
      { domain: "booking", projection: "specialists_catalog", reason: "Specialist.isPromoted для top-позиций в каталоге" },
      { domain: "delivery", projection: "merchants_catalog", reason: "Merchant.isPromoted в каталоге ресторанов/магазинов" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "chats_list", reason: "Personal feed без коммерческой составляющей" },
      { domain: "invest", projection: "portfolios_root", reason: "Портфели — личные объекты, без promotion" },
      { domain: "reflect", projection: "mood-entries", reason: "Личный feed настроений, не коммерческий" },
      { domain: "planning", projection: "my_polls", reason: "Polls — внутренние, нет монетизации" },
    ],
  },
};
