export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

export function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function matchesPeriodFilter(dateValue, periodFilter, now = new Date()) {
  if (periodFilter === "all") return true;
  const day = startOfDay(new Date(dateValue));
  if (periodFilter === "today") return day.getTime() === startOfDay(now).getTime();
  if (periodFilter === "week") return day >= startOfWeek(now);
  if (periodFilter === "month") return day >= startOfMonth(now);
  return true;
}
