"use client";

import React, { useMemo } from "react";
import { ChevronLeft, FileText, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { vehicleLabel } from "@/lib/fleetStats";
import { EXPENSE_TYPES } from "@/components/fleet/fleetConstants";

export default function FleetReportView({
  vehicles,
  expenses,
  loading,
  focusVehicle,
  onBack,
  onOpenVehicle,
}) {
  const reportRows = useMemo(() => {
    const list = focusVehicle ? vehicles.filter((v) => v.id === focusVehicle.id) : vehicles;
    return list.map((v) => {
      const vExpenses = expenses.filter((e) => e.vehicleId === v.id);
      const byType = {};
      for (const t of EXPENSE_TYPES) byType[t.key] = 0;
      let total = 0;
      let month = 0;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      for (const e of vExpenses) {
        const amt = Number(e.amount) || 0;
        total += amt;
        if (byType[e.expenseType] !== undefined) byType[e.expenseType] += amt;
        else byType.other = (byType.other || 0) + amt;
        if (new Date(e.expenseDate) >= monthStart) month += amt;
      }
      return { vehicle: v, total, month, byType, entries: vExpenses.length };
    });
  }, [vehicles, expenses, focusVehicle]);

  const grandTotal = reportRows.reduce((s, r) => s + r.total, 0);
  const grandMonth = reportRows.reduce((s, r) => s + r.month, 0);

  return (
    <div className="space-y-5 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB]">Office · Fleet</p>
            <h1 className="text-2xl font-black text-slate-900">
              {focusVehicle ? `Vehicle report — ${focusVehicle.registrationNumber}` : "Fleet cost report"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {focusVehicle ? vehicleLabel(focusVehicle) : "Combined operating costs across all registered vehicles"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white">
          <FileText className="w-4 h-4 opacity-70" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide opacity-70">All-time total</p>
            <p className="text-lg font-black tabular-nums">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">Vehicles in report</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{reportRows.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">This month</p>
          <p className="text-2xl font-black text-amber-600 tabular-nums mt-1">{formatCurrency(grandMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-slate-400">All-time cost</p>
          <p className="text-2xl font-black text-rose-600 tabular-nums mt-1">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 text-left">Plate</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 text-left">Vehicle</th>
                  {EXPENSE_TYPES.map((t) => (
                    <th key={t.key} className="px-3 py-3 text-[10px] font-bold uppercase text-slate-400 text-right">{t.label}</th>
                  ))}
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 text-right">This month</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 text-right">Total</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 text-center">Entries</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map(({ vehicle, byType, month, total, entries }) => (
                  <tr key={vehicle.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onOpenVehicle(vehicle)} className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded cursor-pointer hover:bg-slate-700">
                        {vehicle.registrationNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-slate-700">{vehicleLabel(vehicle)}</td>
                    {EXPENSE_TYPES.map((t) => (
                      <td key={t.key} className="px-3 py-3 text-xs text-right tabular-nums text-slate-600">
                        {formatCurrency(byType[t.key] || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums text-amber-700">{formatCurrency(month)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-slate-900">{formatCurrency(total)}</td>
                    <td className="px-4 py-3 text-sm text-center tabular-nums text-slate-500">{entries}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-xs uppercase text-slate-500">Totals</td>
                  {EXPENSE_TYPES.map((t) => {
                    const sum = reportRows.reduce((s, r) => s + (r.byType[t.key] || 0), 0);
                    return (
                      <td key={t.key} className="px-3 py-3 text-xs text-right tabular-nums">{formatCurrency(sum)}</td>
                    );
                  })}
                  <td className="px-4 py-3 text-sm text-right tabular-nums text-amber-700">{formatCurrency(grandMonth)}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{formatCurrency(grandTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
