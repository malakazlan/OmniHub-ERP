"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft, FileText, Pencil, Plus, Wallet, Loader2, Trash2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { vehicleLabel } from "@/lib/fleetStats";
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
    <div className="space-y-0 page-enter -mx-1 sm:mx-0">
      <div className="rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white p-5 sm:p-6 shadow-lg shadow-blue-900/20">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBack} className="mt-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{vehicle.registrationNumber}</h1>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  vehicle.isActive ? "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30" : "bg-white/10 text-white/70"
                }`}>
                  {vehicle.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-blue-100/90 text-sm mt-1 capitalize">{vehicleLabel(vehicle)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onViewReport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold cursor-pointer">
              <FileText className="w-4 h-4" /> View report
            </button>
            <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold cursor-pointer">
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button type="button" onClick={onAddExpense} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F97316] hover:bg-orange-500 text-sm font-bold shadow-md cursor-pointer">
              <Plus className="w-4 h-4" /> Add expense
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 bg-white border border-slate-200 border-t-0 rounded-b-2xl overflow-hidden shadow-sm -mt-px">
        {[
          { label: "Total expenses", value: formatCurrency(stats.total), color: "text-rose-600" },
          { label: "This month", value: formatCurrency(stats.month), color: "text-rose-600" },
          { label: "Fuel cost", value: formatCurrency(stats.fuel), color: "text-rose-600" },
          { label: "Entries", value: stats.count, color: "text-slate-900" },
        ].map(({ label, value, color }, i) => (
          <div key={label} className={`px-4 py-4 text-center ${i < 3 ? "border-r border-slate-100" : ""}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`text-lg sm:text-xl font-black tabular-nums mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Expense history</p>
          <div className="flex flex-wrap gap-1">
            {[EXPENSE_FILTER_ALL, ...EXPENSE_TYPES.map((t) => t.key)].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer ${
                  typeFilter === key ? "bg-[#2563EB] text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {key === EXPENSE_FILTER_ALL ? "All" : key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No expenses yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">Record fuel, maintenance, or repair costs for this vehicle.</p>
            <button type="button" onClick={onAddExpense} className="text-sm font-bold text-[#2563EB] hover:underline cursor-pointer">
              Add expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {["Date", "Type", "Description", "Amount", "Payment", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(e.expenseDate)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">{e.expenseType}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-rose-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{e.paymentMethod?.replace("_", " ") || "—"}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onDeleteExpense(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
