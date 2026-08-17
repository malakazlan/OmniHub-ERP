"use client";

import React from "react";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";

const TONE_CLASS = {
  present: "erp-att-select-present",
  absent: "erp-att-select-absent",
  half_day: "erp-att-select-half",
  leave: "erp-att-select-leave",
  holiday: "erp-att-select-holiday",
};

export default function AttendanceStatusSelect({
  value = "",
  onChange,
  disabled = false,
  compact = false,
  allowEmpty = false,
  className = "",
}) {
  const tone = value ? TONE_CLASS[value] || "" : "erp-att-select-empty";

  return (
    <select
      value={value || ""}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={`erp-att-status-select ${compact ? "is-compact" : ""} ${tone} ${className}`.trim()}
      aria-label="Attendance status"
    >
      {allowEmpty && <option value="">—</option>}
      {!allowEmpty && !value && (
        <option value="" disabled>
          Select…
        </option>
      )}
      {ATTENDANCE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {compact ? s.abbrev : `${s.abbrev} — ${s.label}`}
        </option>
      ))}
    </select>
  );
}
