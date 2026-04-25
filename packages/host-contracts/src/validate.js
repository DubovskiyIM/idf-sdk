import { HEADER_SLOTS } from "./constants.js";

const isString = (v) => typeof v === "string" && v.length > 0;
const isArray = (v) => Array.isArray(v);
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function pushIf(errors, condition, message) {
  if (condition) errors.push(message);
}

function validateNavItem(item, path, errors) {
  if (!isObject(item)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  pushIf(errors, !isString(item.id), `${path}.id: must be non-empty string`);
  pushIf(errors, !isString(item.label), `${path}.label: must be non-empty string`);
  pushIf(errors, !isString(item.path), `${path}.path: must be non-empty string`);
  if (item.children !== undefined) {
    pushIf(errors, !isArray(item.children), `${path}.children: must be array if provided`);
    if (isArray(item.children)) {
      item.children.forEach((child, i) => validateNavItem(child, `${path}.children[${i}]`, errors));
    }
  }
}

function validateNavSection(section, path, errors, seenIds) {
  if (!isObject(section)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  pushIf(errors, !isString(section.id), `${path}.id: must be non-empty string`);
  pushIf(errors, !isArray(section.items), `${path}.items: must be array`);
  if (isString(section.id)) {
    if (seenIds.has(section.id)) {
      errors.push(`${path}.id: duplicate section id "${section.id}"`);
    } else {
      seenIds.add(section.id);
    }
  }
  if (isArray(section.items)) {
    const itemIds = new Set();
    section.items.forEach((item, i) => {
      validateNavItem(item, `${path}.items[${i}]`, errors);
      if (isObject(item) && isString(item.id)) {
        if (itemIds.has(item.id)) {
          errors.push(`${path}.items[${i}].id: duplicate item id "${item.id}" within section`);
        } else {
          itemIds.add(item.id);
        }
      }
    });
  }
}

function validateRoute(route, path, errors) {
  if (!isObject(route)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  pushIf(errors, !isString(route.path), `${path}.path: must be non-empty string`);
  pushIf(
    errors,
    route.beforeLoad !== undefined && typeof route.beforeLoad !== "function",
    `${path}.beforeLoad: must be function if provided`,
  );
}

function validateCommand(cmd, path, errors) {
  if (!isObject(cmd)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  pushIf(errors, !isString(cmd.id), `${path}.id: must be non-empty string`);
  pushIf(errors, !isString(cmd.label), `${path}.label: must be non-empty string`);
  pushIf(errors, typeof cmd.run !== "function", `${path}.run: must be function`);
}

export function validateModuleManifest(manifest) {
  const errors = [];
  if (!isObject(manifest)) {
    return { ok: false, errors: ["manifest: must be an object"] };
  }

  pushIf(errors, !isString(manifest.id), "manifest.id: must be non-empty string");
  pushIf(errors, !isString(manifest.basePath), "manifest.basePath: must be non-empty string");
  if (isString(manifest.basePath)) {
    pushIf(errors, !manifest.basePath.startsWith("/"), "manifest.basePath: must start with '/'");
  }

  if (manifest.navSections !== undefined) {
    pushIf(errors, !isArray(manifest.navSections), "manifest.navSections: must be array");
    if (isArray(manifest.navSections)) {
      const seenSectionIds = new Set();
      manifest.navSections.forEach((section, i) =>
        validateNavSection(section, `manifest.navSections[${i}]`, errors, seenSectionIds),
      );
    }
  } else {
    errors.push("manifest.navSections: must be array (use [] if module has no nav)");
  }

  if (manifest.routes !== undefined) {
    pushIf(errors, !isArray(manifest.routes), "manifest.routes: must be array");
    if (isArray(manifest.routes)) {
      manifest.routes.forEach((route, i) => validateRoute(route, `manifest.routes[${i}]`, errors));
    }
  } else {
    errors.push("manifest.routes: must be array (use [] if module has no routes)");
  }

  if (manifest.commands !== undefined) {
    pushIf(errors, !isArray(manifest.commands), "manifest.commands: must be array if provided");
    if (isArray(manifest.commands)) {
      manifest.commands.forEach((cmd, i) => validateCommand(cmd, `manifest.commands[${i}]`, errors));
    }
  }

  if (manifest.headerSlots !== undefined) {
    if (!isObject(manifest.headerSlots)) {
      errors.push("manifest.headerSlots: must be object if provided");
    } else {
      const allowed = new Set(HEADER_SLOTS);
      Object.keys(manifest.headerSlots).forEach((slot) => {
        if (!allowed.has(slot)) {
          errors.push(`manifest.headerSlots: unknown slot "${slot}" (allowed: ${HEADER_SLOTS.join(", ")})`);
        }
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
