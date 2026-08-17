"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import AttendanceDailyPanel from "@/components/hr/AttendanceDailyPanel";
import AttendanceMonthlyRegister from "@/components/hr/AttendanceMonthlyRegister";
import AttendanceHazriChart from "@/components/hr/AttendanceHazriChart";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import {
  CalendarCheck, Loader2, ArrowLeft, Save, Users, UserCheck, UserX, Search,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import {
  ATTENDANCE_STATUSES,
  buildMonthlySummary,
  countStatuses,
  mergeAttendanceRows,
  recordsMapForDate,
  toDateKey,
  todayDateKey,
} from "@/lib/attendance";

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

function viewMonthYear(month, year) {
  return { month: parseInt(month, 10), year: parseInt(year, 10) };
}

export default function AttendancePage() {
  const { showToast } = useToast();
  const printRef = useRef(null);
  const employeesLoaded = useRef(false);
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab =
    initialTabParam === "hazri" ? "hazri" : initialTabParam === "monthly" ? "monthly" : "daily";

  const [tab, setTab] = useState(initialTab);
  const [date, setDate] = useState(todayDateKey);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employees, setEmployees] = useState([]);
  const [savedAttendance, setSavedAttendance] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const loadMonth = parseInt(month, 10);
  const loadYear = parseInt(year, 10);
  const { month: viewMonth, year: viewYear } = viewMonthYear(month, year);

  const fetchAttendance = useCallback(async ({ background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);

    try {
      const skipEmployees = employeesLoaded.current ? "1" : "0";
      const res = await fetch(
        `/api/hr/attendance?month=${loadMonth}&year=${loadYear}&skipEmployees=${skipEmployees}`
      );
      const data = await res.json();
      if (res.ok) {
        if (data.employees?.length) {
          setEmployees(data.employees);
          employeesLoaded.current = true;
        }
        setSavedAttendance(data.attendance || []);
        setPendingEdits([]);
      } else showToast(data.error || "Failed to load attendance", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadMonth, loadYear, showToast]);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) setCompanySettings(d.settings);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAttendance({ background: employeesLoaded.current });
  }, [fetchAttendance]);

  const handleDateChange = (nextDate) => {
    setDate(nextDate);
    const dm = parseInt(nextDate.slice(5, 7), 10);
    const dy = nextDate.slice(0, 4);
    if (String(dm) !== month || dy !== year) {
      setMonth(String(dm));
      setYear(dy);
    }
  };

  const handleMonthChange = (nextMonth) => {
    setMonth(nextMonth);
    const prefix = `${year}-${String(nextMonth).padStart(2, "0")}`;
    if (!date.startsWith(prefix)) {
      setDate(`${prefix}-01`);
    }
  };

  const handleYearChange = (nextYear) => {
    setYear(nextYear);
    const prefix = `${nextYear}-${String(month).padStart(2, "0")}`;
    if (!date.startsWith(prefix)) {
      setDate(`${prefix}-01`);
    }
  };

  const attendance = useMemo(
    () => mergeAttendanceRows(savedAttendance, pendingEdits),
    [savedAttendance, pendingEdits]
  );

  const records = useMemo(
    () => recordsMapForDate(attendance, date),
    [attendance, date]
  );

  const unsavedCount = pendingEdits.length;

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
    filteredEmployees
      .map((e) => records[e.id])
      .filter(Boolean)
      .map((status) => ({ status }))
  ), [filteredEmployees, records]);

  const monthlyRows = useMemo(() => {
    const summary = buildMonthlySummary(employees, attendance, viewYear, viewMonth);
    const q = searchQuery.toLowerCase().trim();
    if (!q) return summary;
    return summary.filter(
      (r) =>
        r.employee.name?.toLowerCase().includes(q) ||
        r.employee.department?.toLowerCase().includes(q)
    );
  }, [employees, attendance, viewYear, viewMonth, searchQuery]);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Attendance Summary",
    subtitle: `${MONTHS[viewMonth - 1]} ${viewYear} · ${monthlyRows.length} employees`,
    company: companySettings,
    columns: MONTHLY_PRINT_COLS,
    rows: monthlyRows,
    footers: [{
      label: "Employees",
      value: String(monthlyRows.length),
      valueColumn: "rate",
      labelColumn: "hd",
    }],
    filename: `attendance-${viewYear}-${viewMonth}.pdf`,
  });

  const clearAttendance = async (employeeId, dateStr) => {
    const res = await fetch("/api/hr/attendance", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, date: dateStr }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to clear");
  };

  const applyLocalEdit = (employeeId, dateStr, status) => {
    const dateKey = toDateKey(dateStr);
    if (!status) {
      setPendingEdits((prev) => {
        const rest = prev.filter(
          (r) => !(r.employeeId === employeeId && toDateKey(r.date) === dateKey)
        );
        return [...rest, { employeeId, date: dateKey, _deleted: true }];
      });
    } else {
      setPendingEdits((prev) => {
        const rest = prev.filter(
          (r) => !(r.employeeId === employeeId && toDateKey(r.date) === dateKey)
        );
        return [...rest, { employeeId, date: dateKey, status }];
      });
    }
  };

  const handleStatusChange = (employeeId, status) => {
    applyLocalEdit(employeeId, date, status);
  };

  const markAll = (status) => {
    const edits = employees.map((emp) => ({
      employeeId: emp.id,
      date,
      status,
    }));
    setPendingEdits((prev) => mergeAttendanceRows(prev, edits));
  };

  const handleSaveAttendance = async () => {
    if (pendingEdits.length === 0) {
      showToast("No changes to save", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const toClear = pendingEdits.filter((e) => e._deleted);
      const toSave = pendingEdits.filter((e) => !e._deleted && e.status);

      if (toClear.length > 0) {
        await Promise.all(
          toClear.map((e) => clearAttendance(e.employeeId, toDateKey(e.date)))
        );
      }

      if (toSave.length > 0) {
        const res = await fetch("/api/hr/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: toSave.map((e) => ({
              employeeId: e.employeeId,
              date: toDateKey(e.date),
              status: e.status,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");
      }

      setPendingEdits([]);
      showToast(`Attendance saved (${toSave.length + toClear.length} changes)`, "success");
      await fetchAttendance({ background: true });
    } catch (err) {
      showToast(err.message || "Error saving attendance", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHazriCellChange = (employeeId, day, status) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    applyLocalEdit(employeeId, dateStr, status);
  };

  const switchTab = (nextTab) => {
    if (nextTab === "daily") {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      if (!date.startsWith(prefix)) {
        setDate(`${prefix}-01`);
      }
    }
    setTab(nextTab);
  };

  const markedToday = filteredEmployees.filter((e) => records[e.id]).length;
  const panelLoading = loading && employees.length === 0;

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5">
        <header className="erp-hr-page-header">
          <div>
            <div className="erp-hr-page-badge">
              <CalendarCheck className="w-3.5 h-3.5" />
              Attendance
              {refreshing && <Loader2 className="w-3 h-3 animate-spin ml-1.5 inline" />}
            </div>
            <h1 className="erp-hr-page-title">Employee attendance</h1>
            <p className="erp-hr-page-desc">
              Daily marking, monthly register, and chart stay in sync. Salary uses the same attendance data.
            </p>
          </div>
          <div className="erp-hr-header-actions">
            <Link href="/hr">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> HR
              </Button>
            </Link>
            {(tab === "daily" || tab === "hazri") && (
              <Button
                onClick={handleSaveAttendance}
                disabled={submitting || panelLoading || unsavedCount === 0}
                className="bg-acc-hr border-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save attendance
                    {unsavedCount > 0 ? ` (${unsavedCount})` : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </header>

        <div className="erp-hr-form-tabs">
          <button type="button" className={`erp-hr-form-tab${tab === "daily" ? " is-active" : ""}`} onClick={() => switchTab("daily")}>
            Daily marking
          </button>
          <button type="button" className={`erp-hr-form-tab${tab === "monthly" ? " is-active" : ""}`} onClick={() => switchTab("monthly")}>
            Monthly register
          </button>
          <button type="button" className={`erp-hr-form-tab${tab === "hazri" ? " is-active" : ""}`} onClick={() => switchTab("hazri")}>
            Attendance chart
          </button>
        </div>

        {tab === "daily" ? (
          <div className="erp-hr-filter-bar">
            <div className="erp-hr-filter-field">
              <label>Attendance date</label>
              <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className="erp-finance-input" />
            </div>
            <div className="erp-att-quick-actions">
              <span className="text-[10px] font-bold uppercase text-slate-500">Mark all:</span>
              {ATTENDANCE_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => markAll(s.value)}
                  disabled={submitting || panelLoading}
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
              <select value={month} onChange={(e) => handleMonthChange(e.target.value)} className="erp-finance-input">
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
            <div className="erp-hr-filter-field">
              <label>Year</label>
              <input type="number" value={year} onChange={(e) => handleYearChange(e.target.value)} className="erp-finance-input w-28 font-mono" />
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
                {tab === "daily"
                  ? `Daily attendance · ${formatDate(date)}`
                  : tab === "hazri"
                    ? `Attendance chart · ${MONTHS[viewMonth - 1]} ${viewYear}`
                    : `${MONTHS[viewMonth - 1]} ${viewYear} summary`}
              </p>
              <p className="erp-hr-register-meta">
                {tab === "daily"
                  ? `${markedToday} of ${filteredEmployees.length} marked${unsavedCount ? ` · ${unsavedCount} unsaved — click Save attendance` : " · click Save attendance when done"}`
                  : tab === "hazri"
                    ? `Click cell to mark P, A, H, L, HD${unsavedCount ? ` · ${unsavedCount} unsaved — click Save attendance` : " · click Save attendance when done"}`
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
              loading={panelLoading}
              submitting={submitting}
              onStatusChange={handleStatusChange}
            />
          ) : tab === "hazri" ? (
            panelLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-pink-500 animate-spin" />
              </div>
            ) : (
              <AttendanceHazriChart
                employees={filteredEmployees}
                attendance={attendance}
                year={viewYear}
                month={viewMonth}
                onCellChange={handleHazriCellChange}
              />
            )
          ) : (
            <AttendanceMonthlyRegister rows={monthlyRows} loading={panelLoading} />
          )}
        </div>
      </div>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Attendance Summary"
          subtitle={`${MONTHS[viewMonth - 1]} ${viewYear}`}
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
