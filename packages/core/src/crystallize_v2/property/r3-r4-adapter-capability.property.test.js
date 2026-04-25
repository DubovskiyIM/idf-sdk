/**
 * R3→R4 adapter capability property.
 *
 * Свойство: artifact не использует primitive, который adapter не объявил
 * в capabilities.
 *
 * Примечание: этот тест требует импорта @intent-driven/renderer и jsdom
 * для монтирования адаптера. В monorepo packages/core не имеет зависимости
 * на renderer, поэтому полная реализация вынесена в follow-up issue.
 *
 * TODO: follow-up — перенести в packages/renderer, добавить там fast-check,
 * смонтировать stubAdapter через registerUIAdapter и проверять getCapability.
 * Tracking: test(renderer): R3→R4 capability property test
 */
import { it } from "vitest";

it.skip(
  "R3→R4 capability: artifact не запрашивает primitive вне capabilities адаптера — требует renderer + jsdom (follow-up)",
  () => {
    // Реализация: см. комментарий выше.
    // Будет добавлен в packages/renderer/src/property/r3-r4-adapter-capability.property.test.js
    // после того как renderer получит fast-check devDependency.
  }
);
