export function calendarGrid(anyDateInMonth) {
  const y = anyDateInMonth.getFullYear();
  const m = anyDateInMonth.getMonth();
  const first = new Date(y, m, 1);
  const firstIsoDay = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - firstIsoDay);

  const last = new Date(y, m + 1, 0);
  const lastIsoDay = (last.getDay() + 6) % 7;
  const end = new Date(y, m + 1, (6 - lastIsoDay));

  const cells = [];
  let week = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = (cursor.getDay() + 6) % 7;
    cells.push({ week, day, date: new Date(cursor) });
    cursor.setDate(cursor.getDate() + 1);
    if (day === 6) week++;
  }
  return cells;
}
