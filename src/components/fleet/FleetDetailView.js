"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft, FileText, Pencil, Plus, Wallet, Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { vehicleLabel } from "@/lib/fleetStats";
import FleetExpensesRegister from "@/components/fleet/FleetExpensesRegister";
import { EXPENSE_TYPES, EXPENSE_FILTER_ALL } from "@/components/fleet/fleetConstants";

export default function FleetDetailView({
  vehicle,
  expenses,
  loading,
  onBack,
  onEdit,
  onAddExpense,
  onViewReport,
  onDeleteExpense,
  canDeleteExpense,
}) {
  const [typeFilter, setTypeFilter] = useState(EXPENSE_FILTER_ALL);

  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = expenses.filter((e) => new Date(e.expenseDate) >= monthStart).reduce((s, e) => s + e.amount, 0);
    const fuel = expenses.filter((e) => e.expenseType === "fuel").reduce((s, e) => s + e.amount, 0);
    return { total, month, fuel, count: expenses.length };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (typeFilter === EXPENSE_FILTER_ALL) return expenses;
    return expenses.filter((e) => e.expenseType === typeFilter);
  }, [expenses, typeFilter]);

  if (!vehicle) return null;

  return (
    <div className="erp-fleet-surface page-enter pb-8">
      <div className="erp-fleet-page space-y-5">
        <header className="erp-fleet-detail-banner">
          <div className="erp-fleet-detail-top">
            <button type="button" onClick={onBack} className="erp-fleet-back-btn">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="erp-fleet-detail-plate">{vehicle.registrationNumber}</h1>
                <span className={`erp-fleet-status${vehicle.isActive ? " is-active" : ""}`}>
                  {vehicle.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="erp-fleet-detail-sub capitalize">{vehicleLabel(vehicle)}</p>
              {(vehicle.driverName || vehicle.capacity) && (
                <p className="erp-fleet-detail-meta">
                  {[vehicle.driverName, vehicle.capacity ? `${vehicle.capacity} ton` : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="erp-fleet-detail-actions">
            <button type="button" onClick={onViewReport} className="erp-fleet-banner-btn">
              <FileText className="w-4 h-4" /> Report
            </button>
            <button type="button" onClick={onEdit} className="erp-fleet-banner-btn">
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button type="button" onClick={onAddExpense} className="erp-fleet-banner-btn is-primary">
              <Wallet className="w-4 h-4" /> Pay expense
            </button>
          </div>
        </header>

        <div className="erp-fleet-stats erp-fleet-stats-inline">
          <div className="erp-fleet-stat">
            <p className="erp-fleet-stat-label">Total paid</p>
            <p className="erp-fleet-stat-value text-red-600">{formatCurrency(stats.total)}</p>
          </div>
          <div className="erp-fleet-stat">
            <p className="erp-fleet-stat-label">This month</p>
            <p className="erp-fleet-stat-value">{formatCurrency(stats.month)}</p>
          </div>
          <div className="erp-fleet-stat">
            <p className="erp-fleet-stat-label">Fuel cost</p>
            <p className="erp-fleet-stat-value">{formatCurrency(stats.fuel)}</p>
          </div>
          <div className="erp-fleet-stat">
            <p className="erp-fleet-stat-label">Payments</p>
            <p className="erp-fleet-stat-value">{stats.count}</p>
          </div>
        </div>

        <div className="erp-fleet-register">
          <div className="erp-fleet-register-head">
            <div>
              <p className="erp-fleet-register-title">Payment history</p>
              <p className="erp-fleet-register-meta">All fleet charges paid for this vehicle</p>
            </div>
            <div className="erp-fleet-type-filters">
              {[EXPENSE_FILTER_ALL, ...EXPENSE_TYPES.map((t) => t.key)].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  className={`erp-fleet-filter-btn${typeFilter === key ? " is-active" : ""}`}
                >
                  {key === EXPENSE_FILTER_ALL ? "All" : key}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-cyan-600 animate-spin" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="erp-ac-empty py-16">
              <Wallet className="w-10 h-10 text-cyan-200 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No payments for this vehicle</p>
              <button type="button" onClick={onAddExpense} className="mt-3 text-sm font-bold text-cyan-700 hover:underline cursor-pointer">
                <Plus className="w-3.5 h-3.5 inline mr-1" /> Pay first expense
              </button>
            </div>
          ) : (
            <FleetExpensesRegister
              rows={filteredExpenses}
              onDeleteExpense={onDeleteExpense}
              canDelete={canDeleteExpense}
            />
          )}
        </div>
      </div>
    </div>
  );
}
