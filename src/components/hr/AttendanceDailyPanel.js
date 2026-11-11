"use client";

import React from "react";
import { Loader2, CalendarCheck } from "lucide-react";
import AttendanceStatusPill from "@/components/hr/AttendanceStatusPill";
import AttendanceStatusSelect from "@/components/hr/AttendanceStatusSelect";

export default function AttendanceDailyPanel({
  employees = [],
  records = {},
  loading = false,
  submitting = false,
  onStatusChange,
}) {
  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[var(--brand)] animate-spin" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="erp-ac-empty py-16">
        <CalendarCheck className="w-10 h-10 text-[var(--brand-soft)] mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No active employees found</p>
      </div>
    );
  }

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className="erp-ledger-grid erp-hr-grid erp-att-daily-grid">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-hr-th erp-lg-th-num">#</th>
              <th className="erp-lg-th erp-hr-th">Employee</th>
              <th className="erp-lg-th erp-hr-th">Department</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Status</th>
              <th className="erp-lg-th erp-hr-th">Mark attendance</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const current = records[emp.id] || "";
              return (
                <tr key={emp.id} className="erp-lg-row erp-hr-row">
                  <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                  <td className="erp-lg-td">
                    <span className="font-semibold text-slate-900">{emp.name}</span>
                    {emp.designation && (
                      <span className="block text-[10px] text-slate-500">{emp.designation}</span>
                    )}
                  </td>
                  <td className="erp-lg-td text-xs text-slate-600">{emp.department || "—"}</td>
                  <td className="erp-lg-td erp-hr-td-center">
                    {current ? (
                      <AttendanceStatusPill status={current} compact />
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Not marked</span>
                    )}
                  </td>
                  <td className="erp-lg-td">
                    <AttendanceStatusSelect
                      allowEmpty
                      value={current}
                      disabled={submitting}
                      onChange={(status) => onStatusChange?.(emp.id, status)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
