"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import AttendanceDailyPanel from "@/components/hr/AttendanceDailyPanel";
import AttendanceMonthlyRegister from "@/components/hr/AttendanceMonthlyRegister";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import {
  CalendarCheck, Loader2, ArrowLeft, Save, Users, UserCheck, UserX, Search,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { ATTENDANCE_STATUSES, buildMonthlySummary, countStatuses } from "@/lib/attendance";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHLY_PRINT_COLS = [
  { key: "emp", label: "Employee", get: (r) => r.employee?.name || "—", pdfWidth: 36 },
  { key: "dept", label: "Department", get: (r) => r.employee?.department || "—", pdfWidth: 24 },
  { key: "p", label: "Present", align: "right", get: (r) => String(r.present), pdfWidth: 14 },
  { key: "a", label: "Absent", align: "right", get: (r) => String(r.absent), pdfWidth: 14 },
  { key: "h", label: "Half", align: "right", get: (r) => String(r.half_day), pdfWidth: 12 },
  { key: "l", label: "Leave", align: "right", get: (r) => String(r.leave), pdfWidth: 12 },
  { key: "hd", label: "Holiday", align: "right", get: (r) => String(r.holiday), pdfWidth: 14 },
  { key: "rate", label: "Rate %", align: "right", get: (r) => `${r.rate}%`, pdfWidth: 14, bold: true },
];

export default function AttendancePage() {
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const fetchDaily = async (selectedDate) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
        const map = {};
        for (const rec of data.attendance || []) map[rec.employeeId] = rec.status;
        for (const emp of data.employees || []) {
          if (!map[emp.id]) map[emp.id] = "present";
        }
        setRecords(map);
        setAttendance(data.attendance || []);
      } else showToast(data.error || "Failed to load attendance", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance?month=${month}&year=${year}`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
        setAttendance(data.attendance || []);
      } else showToast(data.error || "Failed to load attendance", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) setCompanySettings(d.settings);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "daily") fetchDaily(date);
    else fetchMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date, month, year]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const dailyCounts = useMemo(() => countStatuses(
    filteredEmployees.map((e) => ({ status: records[e.id] || "present" }))
  ), [filteredEmployees, records]);

  const monthlyRows = useMemo(() => {
    const summary = buildMonthlySummary(employees, attendance, parseInt(year, 10), parseInt(month, 10));
    const q = searchQuery.toLowerCase().trim();
    if (!q) return summary;
    return summary.filter(
      (r) =>
        r.employee.name?.toLowerCase().includes(q) ||
        r.employee.department?.toLowerCase().includes(q)
    );
  }, [employees, attendance, year, month, searchQuery]);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Attendance Summary",
    subtitle: `${MONTHS[parseInt(month, 10) - 1]} ${year} · ${monthlyRows.length} employees`,
    company: companySettings,
    columns: MONTHLY_PRINT_COLS,
    rows: monthlyRows,
    footers: [{
      label: "Employees",
      value: String(monthlyRows.length),
      valueColumn: "rate",
      labelColumn: "hd",
    }],
    filename: `attendance-${year}-${month}.pdf`,
  });

  const setStatus = (employeeId, status) => {
    setRecords((prev) => ({ ...prev, [employeeId]: status }));
  };

  const markAll = (status) => {
    const next = {};
    for (const emp of filteredEmployees) next[emp.id] = status;
    setRecords((prev) => ({ ...prev, ...next }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const payload = {
        records: filteredEmployees.map((emp) => ({
          employeeId: emp.id,
          date,
          status: records[emp.id] || "present",
        })),
      };
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) showToast(`Attendance saved for ${formatDate(date)}`, "success");
      else showToast(data.error || "Failed to save attendance", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5">
        <header className="erp-hr-page-header">
          <div>
            <div className="erp-hr-page-badge">
              <CalendarCheck className="w-3.5 h-3.5" />
              Attendance
            </div>
            <h1 className="erp-hr-page-title">Employee attendance</h1>
            <p className="erp-hr-page-desc">
              Mark daily attendance or review monthly summaries. Export register for payroll reconciliation.
            </p>
          </div>
          <div className="erp-hr-header-actions">
            <Link href="/hr">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> HR
              </Button>
            </Link>
            {tab === "daily" && (
              <Button
                onClick={handleSave}
                disabled={submitting || loading}
                className="bg-acc-hr border-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save attendance
                  </>
                )}
              </Button>
            )}
          </div>
        </header>

        <div className="erp-hr-form-tabs">
          <button
            type="button"
            className={`erp-hr-form-tab${tab === "daily" ? " is-active" : ""}`}
            onClick={() => setTab("daily")}
          >
            Daily marking
          </button>
          <button
            type="button"
            className={`erp-hr-form-tab${tab === "monthly" ? " is-active" : ""}`}
            onClick={() => setTab("monthly")}
          >
            Monthly register
          </button>
        </div>

        {tab === "daily" ? (
          <div className="erp-hr-filter-bar">
            <div className="erp-hr-filter-field">
              <label>Attendance date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="erp-finance-input" />
            </div>
            <div className="erp-att-quick-actions">
              <span className="text-[10px] font-bold uppercase text-slate-500">Mark all:</span>
              {ATTENDANCE_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => markAll(s.value)}
                  className={`erp-att-quick-btn is-${s.tone}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
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
        )}

        <div className="erp-hr-stats">
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><Users className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Employees</p>
              <p className="erp-hr-stat-value">{filteredEmployees.length}</p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><UserCheck className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">{tab === "daily" ? "Present today" : "Avg rate"}</p>
              <p className="erp-hr-stat-value">
                {tab === "daily"
                  ? dailyCounts.present + dailyCounts.half_day
                  : monthlyRows.length
                    ? `${Math.round(monthlyRows.reduce((s, r) => s + r.rate, 0) / monthlyRows.length)}%`
                    : "—"}
              </p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><UserX className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">{tab === "daily" ? "Absent today" : "Total absent days"}</p>
              <p className="erp-hr-stat-value">
                {tab === "daily"
                  ? dailyCounts.absent
                  : monthlyRows.reduce((s, r) => s + r.absent, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="erp-hr-toolbar">
          <div className="erp-hr-search-wrap">
            <Search className="erp-hr-search-icon" />
            <input
              type="text"
              placeholder="Search employee, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-hr-register">
          <div className="erp-hr-register-head">
            <div>
              <p className="erp-hr-register-title">
                {tab === "daily" ? `Daily attendance · ${formatDate(date)}` : `${MONTHS[parseInt(month, 10) - 1]} ${year} summary`}
              </p>
              <p className="erp-hr-register-meta">
                {tab === "daily"
                  ? `${filteredEmployees.length} employees · P Present · A Absent · H Half · L Leave · HD Holiday`
                  : `${monthlyRows.length} employees · attendance rate excludes holidays`}
              </p>
            </div>
            {tab === "monthly" && (
              <RegisterExportToolbar
                onPrint={onPrint}
                onExportPdf={onExportPdf}
                pdfLoading={pdfLoading}
                disabled={monthlyRows.length === 0}
                resultCount={monthlyRows.length}
                label="employees"
              />
            )}
          </div>

          {tab === "daily" ? (
            <AttendanceDailyPanel
              employees={filteredEmployees}
              records={records}
              loading={loading}
              onStatusChange={setStatus}
            />
          ) : (
            <AttendanceMonthlyRegister rows={monthlyRows} loading={loading} />
          )}
        </div>
      </div>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Attendance Summary"
          subtitle={`${MONTHS[parseInt(month, 10) - 1]} ${year}`}
          company={companySettings}
          columns={MONTHLY_PRINT_COLS}
          rows={monthlyRows}
          footers={[{
            label: "Employees",
            value: String(monthlyRows.length),
            valueColumn: "rate",
            labelColumn: "hd",
          }]}
        />
      </div>
    </div>
  );
}
