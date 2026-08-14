"use client";

import React, { forwardRef } from "react";
import { formatCurrencyForPdf, pdfSafeText } from "@/lib/formatters";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SalarySlipPrintView = forwardRef(function SalarySlipPrintView(
  { record, company = {}, employee = {} },
  ref
) {
  if (!record) return null;

  const companyName = company?.company_name || "Warraich Traders";
  const emp = employee?.name ? employee : record.employee || {};
  const period = `${MONTHS[(record.month || 1) - 1]} ${record.year}`;
  const printedAt = new Date().toLocaleString();

  const rows = [
    ["Base salary", formatCurrencyForPdf(record.baseSalary)],
    ["Bonus", formatCurrencyForPdf(record.bonus)],
    ["Deductions", formatCurrencyForPdf(record.deductions)],
    ["Net salary", formatCurrencyForPdf(record.netSalary)],
    ["Cash paid", formatCurrencyForPdf(record.cashAmount)],
    ["Bank paid", formatCurrencyForPdf(record.bankAmount)],
    ["Total paid", formatCurrencyForPdf(record.paidAmount)],
  ];

  return (
    <div ref={ref} className="erp-salary-slip-print">
      <header className="erp-salary-slip-banner">
        <div>
          <p className="erp-salary-slip-brand">{companyName}</p>
          {company?.address && <p className="erp-salary-slip-meta">{company.address}</p>}
        </div>
        <div className="erp-salary-slip-banner-side">
          <p className="erp-salary-slip-type">Salary slip</p>
          <p className="erp-salary-slip-meta">{printedAt}</p>
        </div>
      </header>

      <div className="erp-salary-slip-titlebar">
        <h1>Payroll — {period}</h1>
        <span className={`erp-salary-slip-status${record.status === "paid" ? " is-paid" : ""}`}>
          {record.status}
        </span>
      </div>

      <div className="erp-salary-slip-info">
        <div><span className="label">Employee</span><span>{emp.name || "—"}</span></div>
        <div><span className="label">Department</span><span>{emp.department || "—"}</span></div>
        <div><span className="label">Designation</span><span>{emp.designation || "—"}</span></div>
        <div><span className="label">CNIC</span><span className="font-mono">{emp.cnic || "—"}</span></div>
        <div><span className="label">Slip ref</span><span className="font-mono">SAL-{record.id}</span></div>
        <div><span className="label">Payment date</span><span>{record.paymentDate ? new Date(record.paymentDate).toLocaleDateString("en-PK") : "—"}</span></div>
      </div>

      <table className="erp-salary-slip-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className={label === "Net salary" || label === "Total paid" ? "is-total" : ""}>
              <td>{label}</td>
              <td className="num">{pdfSafeText(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {record.notes && (
        <div className="erp-salary-slip-notes">
          <p className="label">Notes</p>
          <p>{record.notes}</p>
        </div>
      )}

      <footer className="erp-salary-slip-footer">
        <span>{companyName}</span>
        <span>Salary slip · {period}</span>
        <span>Generated {printedAt}</span>
      </footer>
    </div>
  );
});

export default SalarySlipPrintView;
