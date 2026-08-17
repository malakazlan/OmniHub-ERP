export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present", abbrev: "P", tone: "present" },
  { value: "absent", label: "Absent", abbrev: "A", tone: "absent" },
  { value: "half_day", label: "Half Day", abbrev: "H", tone: "half" },
  { value: "leave", label: "Leave", abbrev: "L", tone: "leave" },
  { value: "holiday", label: "Holiday", abbrev: "HD", tone: "holiday" },
];

export const STATUS_BY_VALUE = Object.fromEntries(
  ATTENDANCE_STATUSES.map((s) => [s.value, s])
);

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function countStatuses(attendanceRows = []) {
  const counts = { present: 0, absent: 0, half_day: 0, leave: 0, holiday: 0 };
  for (const row of attendanceRows) {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
  }
  return counts;
}

/** Build per-employee monthly summary from flat attendance rows. */
export function buildMonthlySummary(employees, attendanceRows, year, month) {
  const days = daysInMonth(year, month);
  const byEmployee = {};

  for (const emp of employees) {
    byEmployee[emp.id] = {
      employee: emp,
      present: 0,
      absent: 0,
      half_day: 0,
      leave: 0,
      holiday: 0,
      marked: 0,
      days,
    };
  }

  for (const row of attendanceRows) {
    const bucket = byEmployee[row.employeeId];
    if (!bucket) continue;
    if (bucket[row.status] !== undefined) bucket[row.status] += 1;
    bucket.marked += 1;
  }

  return Object.values(byEmployee).map((row) => {
    const effectivePresent = row.present + row.half_day * 0.5;
    const workingDays = days - row.holiday;
    const rate = workingDays > 0 ? Math.round((effectivePresent / workingDays) * 100) : 0;
    return { ...row, effectivePresent, rate };
  });
}

export function statusLabel(value) {
  return STATUS_BY_VALUE[value]?.label || value || "—";
}

export function statusAbbrev(value) {
  return STATUS_BY_VALUE[value]?.abbrev || "—";
}

/** Local calendar date as YYYY-MM-DD (no UTC drift). */
export function toDateKey(input) {
  if (!input) return "";
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.slice(0, 10);
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD to local midnight Date. */
export function parseDateOnly(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Today as local YYYY-MM-DD. */
export function todayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Month bounds for queries (local time). */
export function monthDateRange(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0, 0),
    end: new Date(y, m, 0, 23, 59, 59, 999),
  };
}

/** Serialize attendance row dates for API JSON. */
export function serializeAttendanceRow(row) {
  if (!row) return row;
  return { ...row, date: toDateKey(row.date) };
}

export function dayFromDateKey(dateKey) {
  return parseInt(String(dateKey).slice(8, 10), 10);
}

export function attendanceRowKey(employeeId, dateKey) {
  return `${employeeId}-${dateKey}`;
}

/** Merge attendance rows by employee + date; pass `{ _deleted: true }` to remove. */
export function mergeAttendanceRows(existing = [], updates = []) {
  const map = new Map();
  for (const row of existing) {
    map.set(attendanceRowKey(row.employeeId, toDateKey(row.date)), row);
  }
  for (const row of updates) {
    const key = attendanceRowKey(row.employeeId, toDateKey(row.date));
    if (row._deleted) map.delete(key);
    else map.set(key, row);
  }
  return Array.from(map.values());
}

/** Daily status map for one date from flat attendance rows. */
export function recordsMapForDate(attendanceRows = [], dateKey) {
  const map = {};
  for (const row of attendanceRows) {
    if (toDateKey(row.date) === dateKey) map[row.employeeId] = row.status;
  }
  return map;
}

/** Per-employee summary row for one employee from flat attendance. */
export function employeeMonthlySummary(employee, attendanceRows, year, month) {
  const rows = buildMonthlySummary([employee], attendanceRows, year, month);
  return rows[0] || null;
}

/** Salary deduction from attendance using per-employee absence rules. */
export function computeAttendancePayroll(employee = {}, summaryRow) {
  const base = parseFloat(employee.salary ?? employee.baseSalary) || 0;
  const allowedAbsences = Math.max(parseInt(employee.allowedAbsences, 10) || 0, 0);

  if (!summaryRow) {
    return {
      baseSalary: base,
      deductions: 0,
      grossEarned: base,
      rate: 0,
      effectivePresent: 0,
      workingDays: 0,
      calendarDays: 0,
      present: 0,
      absent: 0,
      leave: 0,
      half_day: 0,
      holiday: 0,
      marked: 0,
      unmarked: 0,
      allowedAbsences,
      chargeableAbsences: 0,
      perDayDeduction: 0,
      halfDayDeduction: 0,
    };
  }

  const calendarDays = summaryRow.days;
  const workingDays = Math.max(summaryRow.days - summaryRow.holiday, 0);
  let perDay = parseFloat(employee.absenceDeductionPerDay);
  if (!perDay || perDay <= 0) {
    // Daily rate = contract ÷ calendar days in month
    perDay = calendarDays > 0 && base > 0 ? base / calendarDays : 0;
  }
  const halfDayDeduction = perDay / 2;

  const absent = summaryRow.absent || 0;
  const half_day = summaryRow.half_day || 0;
  const chargeableAbsences = Math.max(absent - allowedAbsences, 0);
  const absenceDeduction =
    chargeableAbsences * perDay + half_day * halfDayDeduction;
  const deductions = Math.round(absenceDeduction * 100) / 100;
  const grossEarned = Math.round(Math.max(base - deductions, 0) * 100) / 100;

  return {
    baseSalary: base,
    deductions,
    grossEarned,
    rate: summaryRow.rate,
    effectivePresent: summaryRow.effectivePresent,
    workingDays,
    calendarDays,
    present: summaryRow.present,
    absent,
    leave: summaryRow.leave,
    holiday: summaryRow.holiday,
    half_day,
    marked: summaryRow.marked,
    unmarked: summaryRow.days - summaryRow.marked,
    allowedAbsences,
    chargeableAbsences,
    perDayDeduction: Math.round(perDay * 100) / 100,
    halfDayDeduction: Math.round(halfDayDeduction * 100) / 100,
  };
}
