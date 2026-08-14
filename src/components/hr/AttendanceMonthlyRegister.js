"use client";

import React from "react";
import { Loader2, CalendarCheck } from "lucide-react";
import AttendanceStatusPill from "@/components/hr/AttendanceStatusPill";

export default function AttendanceMonthlyRegister({ rows = [], loading = false }) {
  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="erp-ac-empty py-16">
        <CalendarCheck className="w-10 h-10 text-pink-200 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No employees for this period</p>
      </div>
    );
  }

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className="erp-ledger-grid erp-hr-grid">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-hr-th erp-lg-th-num">#</th>
              <th className="erp-lg-th erp-hr-th">Employee</th>
              <th className="erp-lg-th erp-hr-th">Department</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Present</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Absent</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Half</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Leave</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Holiday</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Marked</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Rate</th>
              <th className="erp-lg-th erp-hr-th erp-hr-th-center">Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.employee.id} className="erp-lg-row erp-hr-row">
                <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                <td className="erp-lg-td">
                  <span className="font-semibold text-slate-900">{row.employee.name}</span>
                  {row.employee.designation && (
                    <span className="block text-[10px] text-slate-500">{row.employee.designation}</span>
                  )}
                </td>
                <td className="erp-lg-td text-xs text-slate-600">{row.employee.department || "—"}</td>
                <td className="erp-lg-td erp-hr-td-center">
                  <span className="erp-att-count is-present">{row.present}</span>
                </td>
                <td className="erp-lg-td erp-hr-td-center">
                  <span className="erp-att-count is-absent">{row.absent}</span>
                </td>
                <td className="erp-lg-td erp-hr-td-center">
                  <span className="erp-att-count is-half">{row.half_day}</span>
                </td>
                <td className="erp-lg-td erp-hr-td-center">
                  <span className="erp-att-count is-leave">{row.leave}</span>
                </td>
                <td className="erp-lg-td erp-hr-td-center">
                  <span className="erp-att-count is-holiday">{row.holiday}</span>
                </td>
                <td className="erp-lg-td erp-hr-td-center font-mono text-xs">{row.marked}</td>
                <td className="erp-lg-td erp-hr-td-center">
                  <span className={`erp-att-rate${row.rate >= 90 ? " is-good" : row.rate < 75 ? " is-low" : ""}`}>
                    {row.rate}%
                  </span>
                </td>
                <td className="erp-lg-td erp-hr-td-center font-mono text-xs text-slate-500">{row.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
