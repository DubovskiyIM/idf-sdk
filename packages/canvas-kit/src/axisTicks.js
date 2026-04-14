export function axisTicks([min, max], count, { format = (v) => String(v) } = {}) {
  if (count < 2) throw new Error("axisTicks: count must be >= 2");
  const step = (max - min) / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const value = min + step * i;
    ticks.push({ value, position: i / (count - 1), label: format(value) });
  }
  return ticks;
}
