"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  CalendarCheck,
  Wallet,
  CheckCircle2,
  ArrowDownCircle,
  Percent,
  FileText,
  Bell,
  Loader2,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

const HR_SECTIONS = [
  {
    title: "Workforce",
    subtitle: "Employee records and onboarding",
    items: [
      {
        href: "/hr/employees",
        title: "Employee register",
        desc: "Add and manage staff profiles, contact details, salary, and portal access.",
        icon: UserPlus,
        tone: "rose",
      },
    ],
  },
  {
    title: "Attendance",
    subtitle: "Daily presence and monthly charts",
    items: [
      {
        href: "/hr/attendance?tab=hazri",
        title: "Attendance chart",
        desc: "Mark present, absent, leave, and holidays on a monthly day-by-day grid.",
        icon: CalendarCheck,
        tone: "emerald",
      },
      {
        href: "/hr/attendance",
        title: "Daily attendance",
        desc: "Quick bulk marking for a single day and monthly summary register.",
        icon: ClipboardList,
        tone: "teal",
      },
    ],
  },
  {
    title: "Payroll & compensation",
    subtitle: "Salary processing, advances, and commissions",
    items: [
      {
        href: "/hr/salary",
        title: "Salary register",
        desc: "View monthly payroll, process salaries, and print individual pay slips.",
        icon: Wallet,
        tone: "indigo",
      },
      {
        href: "/hr/salary/clearance",
        title: "Salary clearance",
        desc: "Finalize net pay with advance deductions and commission bonuses applied.",
        icon: CheckCircle2,
        tone: "violet",
      },
      {
        href: "/hr/advances",
        title: "Salary advances",
        desc: "Issue mid-month advances and track outstanding balances per employee.",
        icon: ArrowDownCircle,
        tone: "amber",
      },
      {
        href: "/hr/commission",
        title: "Sales commission",
        desc: "Review commission earned from sales and sync from linked salesperson accounts.",
        icon: Percent,
        tone: "purple",
      },
      {
        href: "/hr/salary",
        title: "Salary receipts",
        desc: "Print or export monthly salary slips and payment receipts for each worker.",
        icon: FileText,
        tone: "sky",
      },
      {
        href: "/hr/reminders",
        title: "Payroll reminders",
        desc: "Employees with missing salary records or pending payments this month.",
        icon: Bell,
        tone: "cyan",
        badgeKey: "reminders",
      },
    ],
  },
];

export default function HRHubPage() {
  const [reminderCount, setReminderCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    Promise.all([
      fetch(`/api/hr/reminders?month=${month}&year=${year}`).then((r) => r.json()),
      fetch("/api/hr/employees").then((r) => r.json()),
    ])
      .then(([remData, empData]) => {
        if (remData.reminders) setReminderCount(remData.reminders.length);
        const list = empData.employees || [];
        setEmployeeCount(list.length);
        setActiveCount(list.filter((e) => e.isActive).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="erp-hr-surface page-enter pb-10">
      <div className="erp-hr-page space-y-6">
        <header className="erp-hr-hub-hero">
          <div className="erp-hr-hub-hero-main">
            <div className="erp-hr-page-badge">
              <Users className="w-3.5 h-3.5" />
              Human resources
            </div>
            <h1 className="erp-hr-page-title">Workforce & payroll center</h1>
            <p className="erp-hr-page-desc">
              Manage employees, attendance, salary processing, advances, commissions, and payment receipts from one place.
            </p>
          </div>
          <div className="erp-hr-hub-stats">
            <div className="erp-hr-hub-stat">
              <p className="erp-hr-hub-stat-label">Total staff</p>
              <p className="erp-hr-hub-stat-value">{loading ? "—" : employeeCount}</p>
            </div>
            <div className="erp-hr-hub-stat">
              <p className="erp-hr-hub-stat-label">Active</p>
              <p className="erp-hr-hub-stat-value">{loading ? "—" : activeCount}</p>
            </div>
            <div className="erp-hr-hub-stat erp-hr-hub-stat-alert">
              <p className="erp-hr-hub-stat-label">Action required</p>
              <p className="erp-hr-hub-stat-value">{loading ? "—" : reminderCount}</p>
            </div>
          </div>
        </header>

        {HR_SECTIONS.map((section) => (
          <section key={section.title} className="erp-hr-hub-section">
            <div className="erp-hr-hub-section-head">
              <h2 className="erp-hr-hub-section-title">{section.title}</h2>
              <p className="erp-hr-hub-section-sub">{section.subtitle}</p>
            </div>
            <div className="erp-hr-hub-grid">
              {section.items.map((mod) => {
                const Icon = mod.icon;
                const badge =
                  mod.badgeKey === "reminders" && reminderCount > 0 ? reminderCount : null;
                return (
                  <Link
                    key={mod.href + mod.title}
                    href={mod.href}
                    className={`erp-hr-hub-card tone-${mod.tone}`}
                  >
                    <div className="erp-hr-hub-card-icon-wrap">
                      <div className="erp-hr-hub-card-icon">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      {badge != null && (
                        <span className="erp-hr-hub-badge">{badge}</span>
                      )}
                    </div>
                    <div className="erp-hr-hub-card-body">
                      <h3 className="erp-hr-hub-card-title">{mod.title}</h3>
                      <p className="erp-hr-hub-card-desc">{mod.desc}</p>
                    </div>
                    <ChevronRight className="erp-hr-hub-card-chevron w-5 h-5 shrink-0" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {loading && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading dashboard…
          </p>
        )}
      </div>
    </div>
  );
}
