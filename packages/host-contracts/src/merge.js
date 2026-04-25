export function mergeNavSections(...sectionsLists) {
  const bySectionId = new Map();
  const conflicts = [];

  for (const list of sectionsLists) {
    if (!Array.isArray(list)) continue;
    for (const section of list) {
      if (!section || typeof section.id !== "string") continue;
      const existing = bySectionId.get(section.id);
      if (!existing) {
        bySectionId.set(section.id, {
          id: section.id,
          label: section.label,
          order: section.order,
          items: [...(section.items ?? [])],
        });
        continue;
      }
      if (section.label !== undefined && existing.label === undefined) existing.label = section.label;
      if (section.order !== undefined && existing.order === undefined) existing.order = section.order;
      const existingItemIds = new Set(existing.items.map((it) => it && it.id).filter(Boolean));
      for (const item of section.items ?? []) {
        if (item && existingItemIds.has(item.id)) {
          conflicts.push(`section "${section.id}" item id collision: "${item.id}"`);
          continue;
        }
        existing.items.push(item);
        if (item && item.id) existingItemIds.add(item.id);
      }
    }
  }

  const merged = [...bySectionId.values()].sort((a, b) => {
    const oa = a.order ?? Number.POSITIVE_INFINITY;
    const ob = b.order ?? Number.POSITIVE_INFINITY;
    return oa - ob;
  });

  if (conflicts.length > 0) {
    Object.defineProperty(merged, "conflicts", {
      value: conflicts,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  return merged;
}
