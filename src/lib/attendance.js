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
