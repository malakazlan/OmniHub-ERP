"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import {
  Settings,
  Loader2,
  Save,
  Users,
  MapPin,
  Building2,
  History,
  ChevronRight,
} from "lucide-react";

const SETTING_FIELDS = [
  { key: "company_name", label: "Company Name" },
  { key: "company_address", label: "Address", type: "textarea" },
  { key: "company_phone", label: "Phone" },
  { key: "company_email", label: "Email" },
  { key: "ntn", label: "NTN" },
  { key: "strn", label: "STRN" },
  { key: "currency", label: "Currency" },
  { key: "tax_rate", label: "Default Tax Rate (%)" },
  { key: "bag_weight", label: "Default Bag Weight (kg)" },
  { key: "fiscal_year_start", label: "Fiscal Year Start Month (1-12)" },
];

const SUB_PAGES = [
  {
    href: "/settings/users",
    icon: Users,
    title: "User Management",
    description: "Create and manage system users and roles.",
    adminOnly: true,
  },
  {
    href: "/settings/cities",
    icon: MapPin,
    title: "Cities",
    description: "Manage cities for routes and addresses.",
  },
  {
    href: "/settings/bank-accounts",
    icon: Building2,
    title: "Bank Accounts",
    description: "Company bank accounts for payments.",
  },
  {
    href: "/settings/activity-log",
    icon: History,
    title: "Activity Log",
    description: "Audit trail of key actions across the system.",
    adminOnly: true,
  },
];

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/auth/me"),
        ]);
        const sData = await sRes.json();
        const uData = await uRes.json();
        if (sRes.ok) setSettings(sData.settings || {});
        else showToast(sData.error || "Failed to load settings", "error");
        if (uRes.ok) setUserRole(uData.user?.role);
      } catch {
        showToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (key) => (e) => {
    setSettings({ ...settings, [key]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Settings saved!", "success");
        setSettings(data.settings || settings);
      } else showToast(data.error || "Failed to save settings", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleSubPages = SUB_PAGES.filter(
    (p) => !p.adminOnly || userRole === "admin"
  );

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="settings"
        title="Settings & Admin"
        description="Company profile, users, cities, and system configuration."
        icon={Settings}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleSubPages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="h-full hover:border-slate-300 transition-colors cursor-pointer group">
              <CardContent className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-100 text-acc-settings border border-slate-200 group-hover:scale-105 transition-transform">
                  <page.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{page.title}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{page.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent>
          <h3 className="text-sm font-bold text-slate-900 mb-4">General Settings</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-settings animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SETTING_FIELDS.map(({ key, label, type }) => (
                  <div
                    key={key}
                    className={`space-y-1 ${type === "textarea" ? "md:col-span-2" : ""}`}
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </label>
                    {type === "textarea" ? (
                      <textarea
                        value={settings[key] || ""}
                        onChange={handleChange(key)}
                        className="input-field h-20 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={settings[key] || ""}
                        onChange={handleChange(key)}
                        className="input-field"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-acc-settings hover:bg-slate-700 border-0 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
