"use client";

import React from "react";
import { Loader2, Users, ShieldCheck, ShieldOff } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function EmployeesRegister({ rows = [], loading = false, onRowClick }) {
  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[var(--brand)] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="erp-ac-empty py-16">
            <Users className="w-10 h-10 text-[var(--brand-soft)] mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No employees found</p>
          </div>
        ) : (
          <table className="erp-ledger-grid erp-hr-grid">
            <colgroup>
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="erp-lg-th erp-hr-th erp-lg-th-num">#</th>
                <th className="erp-lg-th erp-hr-th">Employee</th>
                <th className="erp-lg-th erp-hr-th">Role / Title</th>
                <th className="erp-lg-th erp-hr-th">Department</th>
                <th className="erp-lg-th erp-hr-th">Phone</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Salary</th>
                <th className="erp-lg-th erp-hr-th">Joined</th>
                <th className="erp-lg-th erp-hr-th erp-hr-th-center">Login</th>
                <th className="erp-lg-th erp-hr-th erp-hr-th-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`erp-lg-row erp-hr-row${onRowClick ? " is-clickable" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                  <td className="erp-lg-td">
                    <span className="font-semibold text-slate-900">{row.name}</span>
                    {row.fatherName && <span className="block text-[10px] text-slate-500">S/o {row.fatherName}</span>}
                  </td>
                  <td className="erp-lg-td">
                    <span className="erp-hr-role-pill capitalize">{row.role || "—"}</span>
                    {row.designation && <span className="block text-[10px] text-slate-500 mt-0.5">{row.designation}</span>}
                  </td>
                  <td className="erp-lg-td text-xs text-slate-600">{row.department || "—"}</td>
                  <td className="erp-lg-td text-xs text-slate-600 font-mono">{row.phone || "—"}</td>
                  <td className="erp-lg-td erp-lg-td-money font-bold text-[var(--brand)]">{formatCurrency(row.salary)}</td>
                  <td className="erp-lg-td erp-lg-td-date">{formatDate(row.joiningDate)}</td>
                  <td className="erp-lg-td erp-hr-td-center">
                    {row.userId ? (
                      <span className="erp-hr-login-badge is-on" title="Has portal login"><ShieldCheck className="w-3 h-3" /></span>
                    ) : (
                      <span className="erp-hr-login-badge" title="No login assigned"><ShieldOff className="w-3 h-3" /></span>
                    )}
                  </td>
                  <td className="erp-lg-td erp-hr-td-center">
                    <span className={`erp-hr-status-pill${row.isActive ? " is-active" : ""}`}>
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
