import type { NavSection } from "./index.js";

export function mergeNavSections(...sectionsLists: NavSection[][]): NavSection[] & { conflicts?: string[] };
