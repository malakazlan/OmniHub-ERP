"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { CalendarCheck, Loader2, ArrowLeft, Save } from "lucide-react";
import { formatDate } from "@/lib/formatters";

const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present", variant: "success" },
  { value: "absent", label: "Absent", variant: "danger" },
  { value: "half_day", label: "Half Day", variant: "warning" },
  { value: "leave", label: "Leave", variant: "info" },
  { value: "holiday", label: "Holiday", variant: "neutral" },
];

export default function AttendancePage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchAttendance = async (selectedDate) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
        const map = {};
        for (const rec of data.attendance || []) {
          map[rec.employeeId] = rec.status;
        }
        for (const emp of data.employees || []) {
          if (!map[emp.id]) map[emp.id] = "present";
        }
        setRecords(map);
      } else showToast(data.error || "Failed to load attendance", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(date);
  }, [date]);

  const setStatus = (employeeId, status) => {
    setRecords((prev) => ({ ...prev, [employeeId]: status }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const payload = {
        records: employees.map((emp) => ({
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
      if (res.ok) {
        showToast(`Attendance saved for ${formatDate(date)}`, "success");
      } else showToast(data.error || "Failed to save attendance", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(records).filter((s) => s === "present").length;
  const absentCount = Object.values(records).filter((s) => s === "absent").length;

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="hr"
        title="Daily Attendance"
        description="Mark employee attendance for the selected date."
        icon={CalendarCheck}
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Attendance" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/hr">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={submitting || loading}
              className="bg-acc-hr hover:bg-pink-600 border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Attendance
                </>
              )}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Attendance Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field max-w-xs"
              />
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-slate-500">
                Present: <strong className="text-emerald-600">{presentCount}</strong>
              </span>
              <span className="text-slate-500">
                Absent: <strong className="text-red-500">{absentCount}</strong>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-hr animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No active employees found.</p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-white"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-500">
                      {[emp.department, emp.designation].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(emp.id, s.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          records[emp.id] === s.value
                            ? "ring-2 ring-pink-300 border-pink-200 bg-pink-50 text-acc-hr"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
