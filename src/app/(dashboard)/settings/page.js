"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import {
  Settings, Loader2, Save, Users, MapPin, History, Building2, ChevronRight, Shield,
} from "lucide-react";

const COMPANY_FIELDS = [
  { key: "company_name", label: "Company name", required: true },
  { key: "company_phone", label: "Phone" },
  { key: "company_email", label: "Email", type: "email" },
  { key: "ntn", label: "NTN" },
  { key: "strn", label: "STRN" },
  { key: "company_address", label: "Address", type: "textarea", span: 2 },
];

const ADMIN_LINKS = [
  {
    href: "/settings/users",
    icon: Users,
    title: "Users & roles",
    desc: "Login accounts, module access, and cash assignment",
  },
  {
    href: "/admin/withdrawals",
    icon: Shield,
    title: "Owner withdrawals",
    desc: "Personal withdrawals with private notes (admin only)",
    adminOnly: true,
  },
  {
    href: "/settings/activity-log",
    icon: History,
    title: "Activity log",
    desc: "Audit trail of system actions",
    adminOnly: true,
  },
];

const CONFIG_LINKS = [
  {
    href: "/settings/cities",
    icon: MapPin,
    title: "Cities",
    desc: "Cities used on transport routes",
  },
  {
    href: "/accounts/directory/bank",
    icon: Building2,
    title: "Bank accounts",
    desc: "Manage bank ledger accounts (Accounts module)",
  },
];

export default function SettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
        else showToast(d.error || "Failed to load settings", "error");
      })
      .catch(() => showToast("Error connecting to server", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key) => (e) => {
    setSettings({ ...settings, [key]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {};
      for (const f of COMPANY_FIELDS) {
        if (settings[f.key] !== undefined) payload[f.key] = settings[f.key];
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Company profile saved", "success");
        setSettings(data.settings || settings);
      } else showToast(data.error || "Failed to save settings", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const adminLinks = ADMIN_LINKS.filter((l) => !l.adminOnly || isAdmin);
  const canEdit = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="erp-settings-surface page-enter pb-8">
      <div className="erp-settings-page space-y-5">
        <header className="erp-settings-page-header">
          <div>
            <div className="erp-settings-page-badge">
              <Settings className="w-3.5 h-3.5" />
              Configuration
            </div>
            <h1 className="erp-settings-page-title">Settings</h1>
            <p className="erp-settings-page-desc">
              Company profile for invoices and reports. User management and reference data live in the links below.
            </p>
          </div>
        </header>

        <section className="erp-settings-links-section">
          <h2 className="erp-settings-links-title">Administration</h2>
          <div className="erp-settings-links-grid">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="erp-settings-link-card">
                  <div className="erp-settings-link-icon">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3>{link.title}</h3>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                    <p>{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="erp-settings-links-section">
          <h2 className="erp-settings-links-title">Reference data</h2>
          <div className="erp-settings-links-grid">
            {CONFIG_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="erp-settings-link-card">
                  <div className="erp-settings-link-icon is-muted">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3>{link.title}</h3>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                    <p>{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="erp-settings-register">
          <div className="erp-settings-register-head">
            <div>
              <p className="erp-settings-register-title">Company profile</p>
              <p className="erp-settings-register-meta">Used on sales invoices, payment receipts, salary slips, and PDF exports</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
              </div>
            ) : !canEdit ? (
              <p className="text-sm text-slate-500 py-6 text-center">Only admin or manager can edit company profile.</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COMPANY_FIELDS.map(({ key, label, type, span, required }) => (
                    <div key={key} className={span === 2 ? "md:col-span-2 space-y-1" : "space-y-1"}>
                      <label className="erp-finance-label">{label}</label>
                      {type === "textarea" ? (
                        <textarea
                          value={settings[key] || ""}
                          onChange={handleChange(key)}
                          className="erp-finance-input w-full h-20 resize-none"
                        />
                      ) : (
                        <input
                          type={type || "text"}
                          required={required}
                          value={settings[key] || ""}
                          onChange={handleChange(key)}
                          className="erp-finance-input w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <Button type="submit" disabled={submitting} className="bg-slate-800 border-0">
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
