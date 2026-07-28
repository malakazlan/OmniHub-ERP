"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";
import { employeeRoleLabel } from "@/lib/employeeDashboard";
import { MODULE_ACCENTS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  LayoutDashboard,
  Loader2,
  CalendarCheck,
  Wallet,
  ClipboardList,
  Store,
  Package,
  DollarSign,
  Truck,
  ChevronRight,
  Briefcase,
  UserCircle,
} from "lucide-react";

const ATTENDANCE_VARIANT = {
  present: "success",
  absent: "danger",
  half_day: "warning",
  leave: "info",
  holiday: "neutral",
};

const SALARY_VARIANT = { paid: "success", pending: "warning", partial: "warning" };

const SHORTCUT_DEFS = [
  { module: "orders", href: "/orders/my", label: "My orders", icon: ClipboardList, tone: "orange" },
  { module: "sales", href: "/sales/new", label: "New sale", icon: DollarSign, tone: "green" },
  { module: "shops", href: "/shops", label: "Shops", icon: Store, tone: "amber" },
  { module: "products", href: "/products", label: "Products", icon: Package, tone: "violet" },
  { module: "transport", href: "/transport", label: "Transport", icon: Truck, tone: "cyan" },
];

function toneClass(tone) {
  const map = {
    orange: "emp-shortcut-orange",
    green: "emp-shortcut-green",
    amber: "emp-shortcut-amber",
    violet: "emp-shortcut-violet",
    cyan: "emp-shortcut-cyan",
  };
  return map[tone] || "emp-shortcut-slate";
}

export default function EmployeeDashboard() {
  const { user, hasModuleAccess } = useAuth();
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/employee")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const shortcuts = useMemo(() => {
    return SHORTCUT_DEFS.filter((s) => hasModuleAccess(s.module));
  }, [hasModuleAccess]);

  const displayName = data?.employee?.name || user?.name || "Team member";
  const jobRole = data?.employee?.role || user?.role;
  const roleLabel = employeeRoleLabel(user?.role);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const period = data?.period;
  const summary = data?.attendanceSummary || {};
  const latest = data?.latestSalary;

  return (
    <div className="page-enter max-w-lg mx-auto lg:max-w-3xl pb-10">
      <header className="emp-dash-hero">
        <div className="flex items-start gap-3.5">
          <div className="emp-dash-avatar" aria-hidden>
            <UserCircle className="w-9 h-9 text-white/95" strokeWidth={1.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-indigo-100/95">Staff portal</p>
            <h1 className="text-2xl font-bold text-white tracking-tight truncate mt-0.5">
              {displayName}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="emp-dash-pill">{roleLabel}</span>
              {jobRole && jobRole !== user?.role && (
                <span className="emp-dash-pill emp-dash-pill-muted capitalize">{jobRole}</span>
              )}
              {data?.employee?.department && (
                <span className="emp-dash-pill emp-dash-pill-muted">{data.employee.department}</span>
              )}
            </div>
            {data?.employee?.designation && (
              <p className="text-sm text-indigo-50/90 mt-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 opacity-80" strokeWidth={2} />
                {data.employee.designation}
              </p>
            )}
          </div>
        </div>

        {data?.employee && (
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="emp-dash-stat">
              <p className="text-lg font-bold text-white tabular-nums">{summary.present || 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-indigo-100/85 font-semibold mt-0.5">
                Present
              </p>
            </div>
            <div className="emp-dash-stat">
              <p className="text-sm font-bold text-white min-h-[1.75rem] flex items-center justify-center">
                {latest ? (
                  <Badge variant={SALARY_VARIANT[latest.status] || "neutral"} className="text-[10px] capitalize">
                    {latest.status}
                  </Badge>
                ) : (
                  <span className="text-indigo-100/80">—</span>
                )}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-indigo-100/85 font-semibold mt-0.5">
                Last pay
              </p>
            </div>
            <div className="emp-dash-stat">
              <p className="text-lg font-bold text-white tabular-nums">{shortcuts.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-indigo-100/85 font-semibold mt-0.5">
                Shortcuts
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="emp-tab-bar mt-5" role="tablist" aria-label="Staff sections">
        {[
          ["home", "Overview", LayoutDashboard],
          ["attendance", "Attendance", CalendarCheck],
          ["pay", "Salary", Wallet],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`emp-tab ${tab === id ? "emp-tab-active" : ""}`}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {!data?.employee && (
        <div className="emp-panel emp-panel-muted mt-4 text-sm">
          <p className="font-semibold text-slate-800">HR profile not linked</p>
          <p className="mt-1 text-slate-500 leading-relaxed">
            Ask admin to link your login to an employee record for attendance and salary here.
          </p>
        </div>
      )}

      {tab === "home" && (
        <div className="mt-4 space-y-3.5">
          {data?.orderSummary && (
            <div className="emp-panel">
              <p className="emp-panel-title">My orders</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="emp-metric emp-metric-warn">
                  <p className="text-xl font-bold tabular-nums">{data.orderSummary.pending}</p>
                  <p className="text-[10px] uppercase font-semibold mt-0.5 opacity-90">Pending</p>
                </div>
                <div className="emp-metric emp-metric-ok">
                  <p className="text-xl font-bold tabular-nums">{data.orderSummary.accepted}</p>
                  <p className="text-[10px] uppercase font-semibold mt-0.5 opacity-90">Approved</p>
                </div>
                <div className="emp-metric emp-metric-neutral">
                  <p className="text-xl font-bold tabular-nums">{data.orderSummary.convertedThisMonth}</p>
                  <p className="text-[10px] uppercase font-semibold mt-0.5 opacity-90">Sold (mo.)</p>
                </div>
              </div>
              <Link href="/orders/my" className="emp-link-row mt-4">
                Open my orders <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {shortcuts.length > 0 && (
            <div className="emp-panel">
              <p className="emp-panel-title">Your shortcuts</p>
              <p className="text-xs text-slate-500 mt-1">Modules assigned to your login.</p>
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 mt-3">
                {shortcuts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link key={s.href} href={s.href} className={`emp-shortcut ${toneClass(s.tone)}`}>
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={2.25} />
                      <span>{s.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {(user?.allowedModules || []).length > 0 && (
            <div className="emp-panel">
              <p className="emp-panel-title">Access</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {user.allowedModules.map((slug) => (
                  <span key={slug} className="emp-access-tag">
                    {MODULE_ACCENTS[slug]?.label || slug}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data?.employee && latest && (
            <div className="emp-panel">
              <p className="emp-panel-title">Latest salary</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{formatCurrency(latest.netSalary)}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {period?.monthName} · Paid {formatCurrency(latest.paidAmount)} ·{" "}
                <span className="capitalize font-semibold text-slate-700">{latest.status}</span>
              </p>
              <button type="button" onClick={() => setTab("pay")} className="emp-link-row mt-3">
                View pay history <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "attendance" && (
        <div className="mt-4 emp-panel">
          <p className="emp-panel-title">
            Attendance · {period?.monthName} {period?.year}
          </p>
          {!data?.employee ? (
            <p className="text-sm text-slate-500 py-8 text-center">No employee record linked.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  ["present", "Present", summary.present],
                  ["absent", "Absent", summary.absent],
                  ["leave", "Leave", summary.leave],
                  ["half_day", "Half day", summary.half_day],
                ].map(([key, label, count]) => (
                  <span key={key} className="emp-access-tag">
                    {label}: {count || 0}
                  </span>
                ))}
              </div>
              <ul className="mt-4 space-y-0 max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                {(data.attendance || []).length === 0 ? (
                  <li className="text-sm text-slate-500 py-10 text-center">No attendance posted this month yet.</li>
                ) : (
                  data.attendance.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <span className="text-sm font-medium text-slate-800">{formatDate(row.date)}</span>
                      <Badge variant={ATTENDANCE_VARIANT[row.status] || "neutral"} className="capitalize">
                        {String(row.status).replace("_", " ")}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "pay" && (
        <div className="mt-4 emp-panel">
          <p className="emp-panel-title">Salary history</p>
          {!data?.employee ? (
            <p className="text-sm text-slate-500 py-8 text-center">No employee record linked.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(data.salaryRecords || []).length === 0 ? (
                <li className="text-sm text-slate-500 py-10 text-center">No salary records yet.</li>
              ) : (
                data.salaryRecords.map((row) => {
                  const monthLabel = [
                    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                  ][row.month];
                  return (
                    <li key={row.id} className="emp-pay-row">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {monthLabel} {row.year}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Net {formatCurrency(row.netSalary)} · Paid {formatCurrency(row.paidAmount)}
                        </p>
                      </div>
                      <Badge variant={SALARY_VARIANT[row.status] || "neutral"} className="capitalize shrink-0">
                        {row.status}
                      </Badge>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          {data?.employee?.salary != null && (
            <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Contract monthly salary:{" "}
              <span className="font-semibold text-slate-800">{formatCurrency(data.employee.salary)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
