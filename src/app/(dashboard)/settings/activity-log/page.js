"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { History, Loader2, ArrowLeft, LogIn, LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

const ACTION_VARIANTS = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "neutral",
  LOGOUT: "neutral",
};

const ACTION_ICONS = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  LOGIN: LogIn,
  LOGOUT: LogOut,
};

const MODULES = [
  "auth", "companies", "products", "purchases", "sales", "orders",
  "transport", "accounts", "hr", "settings",
];

export default function ActivityLogPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = moduleFilter ? `/api/activity-log?module=${moduleFilter}` : "/api/activity-log";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setLogs(data.logs || []);
      else showToast(data.error || "Failed to load activity log", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter]);

  const createCount = logs.filter((l) => l.action === "CREATE").length;
  const deleteCount = logs.filter((l) => l.action === "DELETE").length;
  const loginCount = logs.filter((l) => l.action === "LOGIN").length;

  const columns = [
    {
      header: "Action",
      accessor: "action",
      cell: (row) => {
        const Icon = ACTION_ICONS[row.action] || History;
        return (
          <Badge variant={ACTION_VARIANTS[row.action] || "neutral"}>
            <Icon className="w-3 h-3" /> {row.action}
          </Badge>
        );
      },
    },
    {
      header: "Module",
      accessor: "module",
      cell: (row) => <span className="text-xs font-semibold capitalize text-slate-700">{row.module}</span>,
    },
    {
      header: "Entity",
      accessor: "entityType",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.entityType ? `${row.entityType} #${row.entityId}` : "—"}
        </span>
      ),
    },
    {
      header: "User",
      accessor: "user",
      cell: (row) => (
        <div className="text-xs">
          <p className="text-slate-900 font-semibold">{row.user?.name || "—"}</p>
          <p className="text-slate-400">{row.user?.role}</p>
        </div>
      ),
    },
    {
      header: "Details",
      accessor: "details",
      cell: (row) => {
        if (!row.details) return <span className="text-xs text-slate-400">—</span>;
        try {
          const parsed = JSON.parse(row.details);
          return (
            <span className="text-xs font-mono text-slate-500 truncate max-w-[220px] block">
              {Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(", ")}
            </span>
          );
        } catch {
          return <span className="text-xs text-slate-400">—</span>;
        }
      },
    },
    {
      header: "When",
      accessor: "createdAt",
      cell: (row) => <span className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="settings"
        title="Activity Log"
        description="Audit trail of key actions performed across the system."
        icon={History}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Activity Log" },
        ]}
        actions={
          <Link href="/settings">
            <Button variant="outline" className="border-slate-200 text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="settings" label="Records Created" value={createCount} icon={Plus} />
        <StatCard module="settings" label="Records Deleted" value={deleteCount} icon={Trash2} />
        <StatCard module="settings" label="Logins" value={loginCount} icon={LogIn} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setModuleFilter("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${!moduleFilter ? "bg-acc-settings text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
        >
          All
        </button>
        {MODULES.map((m) => (
          <button
            key={m}
            onClick={() => setModuleFilter(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${moduleFilter === m ? "bg-acc-settings text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-settings animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={logs} searchKey="module" placeholder="Search logs..." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
