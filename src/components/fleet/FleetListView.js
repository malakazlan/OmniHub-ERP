"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Car, Truck, Fuel, Wallet, Search, Plus, FileText, Loader2,
} from "lucide-react";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import FleetVehiclesRegister from "@/components/fleet/FleetVehiclesRegister";
import FleetExpensesRegister from "@/components/fleet/FleetExpensesRegister";

export default function FleetListView({
  vehicles,
  expenses,
  summary,
  loading,
  expensesLoading,
  onRegister,
  onPayExpense,
  onOpenReport,
  onOpenVehicle,
  onEditVehicle,
  onDeleteExpense,
  canDeleteExpense,
}) {
  const [tab, setTab] = useState("vehicles");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredVehicles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return vehicles.filter((v) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && v.isActive) ||
        (statusFilter === "inactive" && !v.isActive);
      const hay = [v.registrationNumber, v.make, v.model, v.driverName, v.vehicleType]
        .filter(Boolean).join(" ").toLowerCase();
      return matchStatus && (!q || hay.includes(q));
    });
  }, [vehicles, search, statusFilter]);

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.vehicle?.registrationNumber?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.expenseType?.toLowerCase().includes(q) ||
        e.account?.name?.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  return (
    <div className="erp-fleet-surface page-enter pb-8">
      <div className="erp-fleet-page space-y-5">
        <header className="erp-fleet-page-header">
          <div>
            <div className="erp-fleet-page-badge">
              <Car className="w-3.5 h-3.5" />
              Fleet management
            </div>
            <h1 className="erp-fleet-page-title">Fleet</h1>
            <p className="erp-fleet-page-desc">
              Register vehicles for dispatch, pay fuel and maintenance from cash or bank, and track operating costs.
            </p>
          </div>
          <div className="erp-fleet-header-actions">
            <Link href="/transport">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <Truck className="w-4 h-4" /> Deliveries
              </Button>
            </Link>
            <Button variant="outline" className="border-slate-200 text-slate-600" onClick={onOpenReport}>
              <FileText className="w-4 h-4" /> Cost report
            </Button>
            <Button onClick={() => onPayExpense()} className="bg-acc-transport border-0">
              <Wallet className="w-4 h-4" /> Pay expense
            </Button>
            <Button onClick={onRegister} className="bg-slate-800 border-0">
              <Plus className="w-4 h-4" /> Register vehicle
            </Button>
          </div>
        </header>

        <div className="erp-fleet-stats">
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><Car className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">Registered</p>
              <p className="erp-fleet-stat-value">{summary?.registered ?? 0}</p>
            </div>
          </div>
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><Truck className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">Active fleet</p>
              <p className="erp-fleet-stat-value">{summary?.active ?? 0}</p>
            </div>
          </div>
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><Fuel className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">This month</p>
              <p className="erp-fleet-stat-value">{formatCurrency(summary?.expensesThisMonth ?? 0)}</p>
            </div>
          </div>
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><Wallet className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">All-time cost</p>
              <p className="erp-fleet-stat-value">{formatCurrency(summary?.allTimeCost ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="erp-fleet-form-tabs">
          <button type="button" className={`erp-fleet-form-tab${tab === "vehicles" ? " is-active" : ""}`} onClick={() => setTab("vehicles")}>
            Vehicles ({vehicles.length})
          </button>
          <button type="button" className={`erp-fleet-form-tab${tab === "expenses" ? " is-active" : ""}`} onClick={() => setTab("expenses")}>
            Expense payments ({expenses.length})
          </button>
        </div>

        <div className="erp-fleet-toolbar">
          <div className="erp-fleet-search-wrap">
            <Search className="erp-fleet-search-icon" />
            <input
              type="text"
              placeholder={tab === "vehicles" ? "Search plate, model, driver..." : "Search vehicle, type, account..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === "vehicles" && (
            <div className="erp-fleet-status-filters">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`erp-fleet-filter-btn${statusFilter === key ? " is-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="erp-fleet-register">
          <div className="erp-fleet-register-head">
            <div>
              <p className="erp-fleet-register-title">
                {tab === "vehicles" ? "Fleet register" : "Fleet expense payments"}
              </p>
              <p className="erp-fleet-register-meta">
                {tab === "vehicles"
                  ? `${filteredVehicles.length} vehicles · click row to view details`
                  : `${filteredExpenses.length} payments · ledger posted to cash/bank`}
              </p>
            </div>
          </div>

          {tab === "vehicles" ? (
            loading ? (
              <div className="h-52 flex items-center justify-center"><Loader2 className="w-7 h-7 text-cyan-600 animate-spin" /></div>
            ) : (
              <FleetVehiclesRegister
                rows={filteredVehicles}
                onOpenVehicle={onOpenVehicle}
                onEditVehicle={onEditVehicle}
                onOpenReport={onOpenReport}
                onPayExpense={onPayExpense}
              />
            )
          ) : (
            <FleetExpensesRegister
              rows={filteredExpenses}
              loading={expensesLoading}
              onDeleteExpense={onDeleteExpense}
              canDelete={canDeleteExpense}
            />
          )}
        </div>
      </div>
    </div>
  );
}
