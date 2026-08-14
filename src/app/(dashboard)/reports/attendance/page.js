"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import ReportShell from "@/components/reports/ReportShell";
import AttendanceMonthlyRegister from "@/components/hr/AttendanceMonthlyRegister";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { CalendarCheck, Users, UserCheck, UserX } from "lucide-react";
import { buildMonthlySummary } from "@/lib/attendance";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PRINT_COLS = [
  { key: "emp", label: "Employee", get: (r) => r.employee?.name || "—", pdfWidth: 36 },
  { key: "dept", label: "Department", get: (r) => r.employee?.department || "—", pdfWidth: 24 },
  { key: "p", label: "Present", align: "right", get: (r) => String(r.present), pdfWidth: 14 },
  { key: "a", label: "Absent", align: "right", get: (r) => String(r.absent), pdfWidth: 14 },
  { key: "h", label: "Half", align: "right", get: (r) => String(r.half_day), pdfWidth: 12 },
  { key: "l", label: "Leave", align: "right", get: (r) => String(r.leave), pdfWidth: 12 },
  { key: "rate", label: "Rate %", align: "right", get: (r) => `${r.rate}%`, pdfWidth: 14, bold: true },
];

export default function AttendanceReportPage() {
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/attendance?month=${month}&year=${year}`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
        setAttendance(data.attendance || []);
        setTotals(data.totals || {});
      } else showToast(data.error || "Failed to load attendance report", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const rows = useMemo(() => {
    const summary = buildMonthlySummary(employees, attendance, parseInt(year, 10), parseInt(month, 10));
    const q = searchQuery.toLowerCase().trim();
    if (!q) return summary;
    return summary.filter(
      (r) =>
        r.employee.name?.toLowerCase().includes(q) ||
        r.employee.department?.toLowerCase().includes(q)
    );
  }, [employees, attendance, year, month, searchQuery]);

  const avgRate = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.rate, 0) / rows.length)
    : 0;

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Attendance Report",
    subtitle: `${MONTHS[parseInt(month, 10) - 1]} ${year}`,
    company: companySettings,
    columns: PRINT_COLS,
    rows,
    footers: [{ label: "Employees", value: String(rows.length), valueColumn: "rate", labelColumn: "l" }],
    filename: `attendance-report-${year}-${month}.pdf`,
  });

  return (
    <ReportShell
      surfaceClass="erp-hr-surface"
      badge="HR"
      badgeIcon={CalendarCheck}
      title="Attendance report"
      description="Monthly attendance summary with present, absent, leave counts and attendance rate."
      accentClass="text-acc-hr"
      filterBar={
        <div className="erp-hr-filter-bar">
          <div className="erp-hr-filter-field">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="erp-finance-input">
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="erp-hr-filter-field">
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="erp-finance-input w-28 font-mono" />
          </div>
        </div>
      }
      stats={[
        { label: "Employees", value: employees.length, icon: Users },
        { label: "Records marked", value: totals.records || 0, icon: CalendarCheck },
        { label: "Avg attendance", value: `${avgRate}%`, icon: UserCheck },
        { label: "Absent days", value: totals.absent || 0, icon: UserX },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search employee..."
      registerTitle={`${MONTHS[parseInt(month, 10) - 1]} ${year} attendance`}
      registerMeta={`${rows.length} employees`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={rows.length}
      exportLabel="employees"
      loadingOnly={loading && rows.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={rows}
      printFooters={[{ label: "Employees", value: String(rows.length), valueColumn: "rate", labelColumn: "l" }]}
    >
      <AttendanceMonthlyRegister rows={rows} loading={loading} />
    </ReportShell>
  );
}
