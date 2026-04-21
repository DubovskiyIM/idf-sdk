export function substitute(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `__${key}__`;
    result = result.split(placeholder).join(value);
  }
  return result;
}
