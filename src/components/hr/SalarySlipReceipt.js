"use client";

import React from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildSalarySlipReceipt } from "@/lib/salarySlipReceiptModel";

function XlsCell({ children, className = "", colSpan, rowSpan, align }) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`${className}${align === "right" ? " is-right" : ""}${align === "center" ? " is-center" : ""}`.trim()}
    >
      {children}
    </td>
  );
}

function XlsHead({ children, colSpan, align }) {
  return (
    <th colSpan={colSpan} className={align === "right" ? "is-right" : align === "center" ? "is-center" : ""}>
      {children}
    </th>
  );
}

function XlsMoney({ value, tone }) {
  return <span className={`erp-sal-xls-num${tone ? ` is-${tone}` : ""}`}>{value}</span>;
}

export default function SalarySlipReceipt({
  record,
  preview,
  company = {},
  clearanceExtras = {},
  className = "",
  printMode = false,
}) {
  const data = buildSalarySlipReceipt({ record, preview, company, clearanceExtras });
  if (!data) return null;

  const { company: co, employee, attendance, advanceDetail, payment, salaryBreakdown } = data;
  const isPaid = data.status === "paid";
  const statusLabel = isPaid ? "CLEARED" : String(data.status || "pending").toUpperCase();
  const sb = salaryBreakdown || {};
  const monthRows = advanceDetail.monthRows || [];
  const monthAdvanceTotal = advanceDetail.monthGross ?? monthRows.reduce((s, r) => s + (r.amount || 0), 0);
  const openingOwed = advanceDetail.openingOwed ?? advanceDetail.previousBalance + monthAdvanceTotal;
  const payMethod = String(payment.method || "cash").replace(/_/g, " ").toUpperCase();
  const payAccount = payment.accountName || (payment.cash > 0 ? "Cash account" : "Bank account");

  return (
    <article className={`erp-sal-xls${printMode ? " is-print" : ""} ${className}`.trim()}>
      <table className="erp-sal-xls-sheet">
        <tbody>
          {/* ── Header ── */}
          <tr className="erp-sal-xls-header">
            <XlsCell colSpan={4} className="is-brand">
              <strong>{co.name}</strong>
              <span className="erp-sal-xls-sub">
                {[co.address, co.phone].filter(Boolean).join(" · ")}
              </span>
            </XlsCell>
            <XlsCell colSpan={4} align="center" className="is-title">
              <span className="erp-sal-xls-kicker">Official Document</span>
              <strong>Monthly Pay Stub</strong>
              <span>{data.periodLabel.toUpperCase()}</span>
            </XlsCell>
            <XlsCell colSpan={4} className="is-meta">
              <div><span>Receipt ref</span><strong>{data.ref}</strong></div>
              <div><span>Cleared</span><strong>{data.paymentDate ? formatDate(data.paymentDate) : "—"}</strong></div>
              <span className={`erp-sal-xls-badge${isPaid ? " is-paid" : data.isPreview ? " is-preview" : ""}`}>
                {statusLabel}
              </span>
            </XlsCell>
          </tr>

          {/* ── Employee + Advances ── */}
          <tr className="erp-sal-xls-band">
            <XlsHead colSpan={6}>Employee</XlsHead>
            <XlsHead colSpan={6}>Salary Advances — This Month (regular only)</XlsHead>
          </tr>
          <tr className="erp-sal-xls-split">
            <XlsCell colSpan={6} className="is-pad-none">
              <table className="erp-sal-xls-inner">
                <tbody>
                  {[
                    ["Employee ID", employee.id],
                    ["Name", employee.name],
                    ["Father name", employee.fatherName || "—"],
                    ["SSN / Tax ID", employee.cnic || "—"],
                    ["Phone", employee.phone || "—"],
                    ["Designation", employee.designation || employee.department || "—"],
                    ["Monthly contract", formatCurrency(employee.contractSalary)],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td className="is-label">{label}</td>
                      <td className={`is-val${label === "Monthly contract" ? " is-mono is-bold" : ""}`}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </XlsCell>
            <XlsCell colSpan={6} className="is-pad-none">
              <table className="erp-sal-xls-inner">
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Date</th>
                    <th className="is-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="is-muted">
                    <td colSpan={2}>Previous balance (before this month)</td>
                    <td className="is-right is-mono">{formatCurrency(advanceDetail.previousBalance)}</td>
                  </tr>
                  {monthRows.length === 0 ? (
                    <tr><td colSpan={3} className="is-empty">No regular advances this month</td></tr>
                  ) : (
                    monthRows.map((row) => (
                      <tr key={row.id ?? `${row.advanceDate}-${row.amount}`}>
                        <td className="is-mono">{row.id ? `ADV-${row.id}` : "—"}</td>
                        <td>{row.advanceDate ? formatDate(row.advanceDate) : "—"}</td>
                        <td className="is-right is-mono">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="is-total">
                    <td colSpan={2}>Total taken (this month)</td>
                    <td className="is-right is-mono">{formatCurrency(monthAdvanceTotal)}</td>
                  </tr>
                  {advanceDetail.newOnClearance > 0 && (
                    <tr className="is-clearance">
                      <td colSpan={2}>New advance at clearance (paid out)</td>
                      <td className="is-right is-mono">+ {formatCurrency(advanceDetail.newOnClearance)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </XlsCell>
          </tr>

          {/* ── Attendance ── */}
          {attendance && (
            <>
              <tr className="erp-sal-xls-band">
                <XlsHead colSpan={12}>Attendance Summary</XlsHead>
              </tr>
              <tr>
                <XlsHead colSpan={3}>Period</XlsHead>
                <XlsHead>Days</XlsHead>
                <XlsHead>Present</XlsHead>
                <XlsHead>Leave</XlsHead>
                <XlsHead>Absent</XlsHead>
                <XlsHead>Hol.</XlsHead>
                <XlsHead colSpan={2}>Working</XlsHead>
                <XlsHead colSpan={2} />
              </tr>
              <tr className="is-data-row">
                <XlsCell colSpan={3}>{data.periodLabel}</XlsCell>
                <XlsCell align="center" className="is-mono">{attendance.days ?? data.calendarDays ?? "—"}</XlsCell>
                <XlsCell align="center" className="is-present">{attendance.present ?? 0}</XlsCell>
                <XlsCell align="center">{attendance.leave ?? 0}</XlsCell>
                <XlsCell align="center" className="is-absent">{attendance.absent ?? 0}</XlsCell>
                <XlsCell align="center">{attendance.holiday ?? 0}</XlsCell>
                <XlsCell colSpan={2} align="center" className="is-mono">{Number(attendance.working ?? 0).toFixed(1)}</XlsCell>
                <XlsCell colSpan={2} />
              </tr>
            </>
          )}

          {/* ── Salary calc ── */}
          <tr className="erp-sal-xls-band">
            <XlsHead colSpan={12}>Salary Calculation</XlsHead>
          </tr>
          <tr>
            <XlsHead>Contract</XlsHead>
            <XlsHead>Daily Rate</XlsHead>
            <XlsHead>Absence</XlsHead>
            <XlsHead>Holiday</XlsHead>
            <XlsHead>Earned</XlsHead>
            <XlsHead>Comm.</XlsHead>
            <XlsHead colSpan={2}>Gross</XlsHead>
            <XlsHead colSpan={4}>{sb.formulaNote ? "Formula" : ""}</XlsHead>
          </tr>
          <tr className="is-data-row">
            <XlsCell className="is-mono">{formatCurrency(sb.contract)}</XlsCell>
            <XlsCell className="is-mono">{formatCurrency(sb.dailyRate)}</XlsCell>
            <XlsCell className="is-mono is-deduct">{formatCurrency(sb.absenceDeduction)}</XlsCell>
            <XlsCell className="is-mono is-bonus">{formatCurrency(sb.holidayBonus)}</XlsCell>
            <XlsCell className="is-mono">{formatCurrency(sb.earnedBasePay)}</XlsCell>
            <XlsCell className="is-mono">{formatCurrency(sb.commission)}</XlsCell>
            <XlsCell colSpan={2} className="is-mono is-strong">{formatCurrency(sb.grossAmount)}</XlsCell>
            <XlsCell colSpan={4} className="is-note">{sb.formulaNote || ""}</XlsCell>
          </tr>

          {/* ── Recovery + Totals ── */}
          <tr className="erp-sal-xls-band">
            <XlsHead colSpan={6}>Extra Advance / Recovery</XlsHead>
            <XlsHead colSpan={6}>Payment Summary</XlsHead>
          </tr>
          {data.advanceSummaryText && (
            <tr>
              <XlsCell colSpan={12} className="is-pad-none">
                <p className="erp-sal-xls-lead">{data.advanceSummaryText}</p>
              </XlsCell>
            </tr>
          )}
          <tr className="erp-sal-xls-split is-tall">
            <XlsCell colSpan={6} className="is-pad-none is-recovery">
              <table className="erp-sal-xls-inner">
                <tbody>
                  <tr><td className="is-label">Owed before recovery</td><td className="is-right is-mono">{formatCurrency(openingOwed)}</td></tr>
                  <tr className="is-muted"><td className="is-label">↳ Previous months</td><td className="is-right is-mono">{formatCurrency(advanceDetail.previousBalance)}</td></tr>
                  {monthAdvanceTotal > 0 && (
                    <tr className="is-muted"><td className="is-label">↳ This month (regular)</td><td className="is-right is-mono">{formatCurrency(monthAdvanceTotal)}</td></tr>
                  )}
                  <tr className="is-deduct"><td className="is-label">Recovered from salary</td><td className="is-right is-mono">− {formatCurrency(advanceDetail.deducted)}</td></tr>
                  {advanceDetail.newOnClearance > 0 && (
                    <tr className="is-advance"><td className="is-label">New advance at clearance</td><td className="is-right is-mono">+ {formatCurrency(advanceDetail.newOnClearance)}</td></tr>
                  )}
                  <tr className="is-pending"><td className="is-label">Pending (next salary)</td><td className="is-right is-mono is-bold">{formatCurrency(advanceDetail.pendingAfterClearance ?? 0)}</td></tr>
                </tbody>
              </table>
            </XlsCell>
            <XlsCell colSpan={6} className="is-pad-none is-summary">
              <table className="erp-sal-xls-inner">
                <tbody>
                  <tr><td className="is-label">Total salary (contract)</td><td className="is-right is-mono">{formatCurrency(sb.contract)}</td></tr>
                  <tr><td className="is-label">Earned this month</td><td className="is-right is-mono">{formatCurrency(sb.earnedBasePay)}</td></tr>
                  <tr><td className="is-label">Total amount</td><td className="is-right is-mono is-bold">{formatCurrency(sb.grossAmount)}</td></tr>
                  {advanceDetail.deducted > 0 && (
                    <tr className="is-deduct"><td className="is-label">Advance recovered</td><td className="is-right is-mono">− {formatCurrency(advanceDetail.deducted)}</td></tr>
                  )}
                  <tr><td className="is-label">Net salary paid</td><td className="is-right is-mono is-bold">{formatCurrency(data.netPayable)}</td></tr>
                  {payment.newAdvance > 0 && (
                    <tr className="is-advance"><td className="is-label">Extra advance paid</td><td className="is-right is-mono">+ {formatCurrency(payment.newAdvance)}</td></tr>
                  )}
                  <tr className="is-grand">
                    <td className="is-label">TOTAL CASH PAID</td>
                    <td className="is-right is-mono"><XlsMoney value={formatCurrency(payment.totalDisbursement || payment.total)} tone="paid" /></td>
                  </tr>
                </tbody>
              </table>
            </XlsCell>
          </tr>

          {/* ── Disbursement + footer ── */}
          <tr className="erp-sal-xls-band">
            <XlsHead colSpan={12}>Payment Disbursement</XlsHead>
          </tr>
          <tr>
            <XlsCell colSpan={3} className="is-label-cell">Payment method</XlsCell>
            <XlsCell colSpan={3}>{payMethod}</XlsCell>
            <XlsCell colSpan={3} className="is-label-cell">Account</XlsCell>
            <XlsCell colSpan={3}>{payAccount}</XlsCell>
          </tr>
          <tr>
            <XlsCell colSpan={3} className="is-label-cell">Amount disbursed</XlsCell>
            <XlsCell colSpan={3} className="is-mono is-bold">{formatCurrency(payment.totalDisbursement || payment.total)}</XlsCell>
            <XlsCell colSpan={6} className="is-note">
              {payment.salaryNet > 0 && `Salary ${formatCurrency(payment.salaryNet)}`}
              {payment.salaryNet > 0 && payment.newAdvance > 0 && " + "}
              {payment.newAdvance > 0 && `Advance ${formatCurrency(payment.newAdvance)}`}
            </XlsCell>
          </tr>
          {data.notes && (
            <tr>
              <XlsCell colSpan={2} className="is-label-cell">Notes</XlsCell>
              <XlsCell colSpan={10}>{data.notes}</XlsCell>
            </tr>
          )}
          <tr className="erp-sal-xls-footer">
            <XlsCell colSpan={12}>
              {co.name} · {data.periodLabel} · {data.isPreview ? "Preview" : data.printedAt}
            </XlsCell>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
