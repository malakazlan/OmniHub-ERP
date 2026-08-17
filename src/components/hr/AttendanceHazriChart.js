"use client";

import React, { useMemo, memo } from "react";
import { ATTENDANCE_STATUSES, daysInMonth, toDateKey, dayFromDateKey } from "@/lib/attendance";
import AttendanceHazriCell from "@/components/hr/AttendanceHazriCell";

const HazriRow = memo(function HazriRow({ emp, dayNumbers, grid, onCellChange }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
        {emp.name}
      </td>
      {dayNumbers.map((d) => {
        const status = grid[`${emp.id}-${d}`] || "";
        return (
          <td key={d} className="p-0.5 text-center align-middle">
            <AttendanceHazriCell
              status={status}
              onChange={(next) => onCellChange?.(emp.id, d, next)}
            />
          </td>
        );
      })}
    </tr>
  );
});

export default function AttendanceHazriChart({
  employees = [],
  attendance = [],
  year,
  month,
  onCellChange,
}) {
  const days = daysInMonth(year, month);

  const grid = useMemo(() => {
    const byKey = {};
    for (const row of attendance) {
      const dateKey = toDateKey(row.date);
      if (parseInt(dateKey.slice(5, 7), 10) !== month || parseInt(dateKey.slice(0, 4), 10) !== year) {
        continue;
      }
      byKey[`${row.employeeId}-${dayFromDateKey(dateKey)}`] = row.status;
    }
    return byKey;
  }, [attendance, month, year]);

  const dayNumbers = useMemo(
    () => Array.from({ length: days }, (_, i) => i + 1),
    [days]
  );

  return (
    <div className="erp-hr-hazri-wrap overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="erp-hr-hazri-table min-w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600 min-w-[140px]">
              Employee
            </th>
            {dayNumbers.map((d) => (
              <th key={d} className="px-0.5 py-2 text-center font-bold text-slate-500 w-9 min-w-[36px]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <HazriRow
              key={emp.id}
              emp={emp}
              dayNumbers={dayNumbers}
              grid={grid}
              onCellChange={onCellChange}
            />
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-slate-500">
        {ATTENDANCE_STATUSES.map((s) => (
          <span key={s.value} className="font-semibold">
            {s.abbrev} = {s.label}
          </span>
        ))}
        <span className="text-slate-400">· Click cell to pick status</span>
      </div>
    </div>
  );
}
