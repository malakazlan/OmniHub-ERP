"use client";

import React, { useMemo, useState } from "react";
import {
  Car, Truck, Fuel, Wallet, Search, LayoutGrid, FileText, Plus,
  Eye, BarChart3, Pencil, Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { vehicleLabel } from "@/lib/fleetStats";

function StatTile({ label, value, sub, icon: Icon, accent }) {
  const accents = {
    blue: "border-l-[#2563EB] text-[#2563EB]",
    green: "border-l-emerald-500 text-emerald-600",
    amber: "border-l-amber-400 text-amber-600",
    rose: "border-l-rose-500 text-rose-600",
  };
  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 border-l-[4px] ${accents[accent]} shadow-sm p-4 flex items-start justify-between gap-3`}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 ${accents[accent].split(" ")[1]}`}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
    </div>
  );
}

export default function FleetListView({
  vehicles,
  summary,
  loading,
  viewMode,
  onViewModeChange,
  onRegister,
  onOpenReport,
  onOpenVehicle,
  onEditVehicle,
  onOpenVehicleReport,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter((v) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && v.isActive) ||
        (statusFilter === "inactive" && !v.isActive);
      const hay = [
        v.registrationNumber,
        v.make,
        v.model,
        v.driverName,
        v.vehicleType,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchStatus && hay.includes(q);
    });
  }, [vehicles, search, statusFilter]);

  const footerMonth = filtered.reduce((s, v) => s + (v.expenseStats?.month || 0), 0);
  const footerTotal = filtered.reduce((s, v) => s + (v.expenseStats?.total || 0), 0);

  return (
    <div className="space-y-5 page-enter">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">Office · Fleet</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Fleet & Vehicles</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Register vehicles for gate pass and dispatch · Track fuel, maintenance and operating costs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
              viewMode === "list" ? "bg-white border-slate-300 text-slate-900 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Fleet list
          </button>
          <button
            type="button"
            onClick={onOpenReport}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
              viewMode === "report" ? "bg-white border-slate-300 text-slate-900 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Reports
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#2563EB] text-white shadow-md shadow-blue-900/15 hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Register vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile label="Registered vehicles" value={summary?.registered ?? 0} sub="Total in fleet register" icon={Car} accent="blue" />
        <StatTile label="Active fleet" value={summary?.active ?? 0} sub="Available for dispatch" icon={Truck} accent="green" />
        <StatTile label="Expenses this month" value={formatCurrency(summary?.expensesThisMonth ?? 0)} sub="All vehicles combined" icon={Fuel} accent="amber" />
        <StatTile label="All-time fleet cost" value={formatCurrency(summary?.allTimeCost ?? 0)} sub="Fuel, maint. & repairs" icon={Wallet} accent="rose" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plate, model, driver..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    statusFilter === key ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={onOpenReport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
              <FileText className="w-3.5 h-3.5" /> Fleet report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No vehicles found</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Register your first fleet vehicle to get started.</p>
            <button type="button" onClick={onRegister} className="text-sm font-bold text-[#2563EB] hover:underline cursor-pointer">
              + Register vehicle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {["Plate", "Vehicle", "Driver", "Capacity", "Status", "This month", "Total cost", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onOpenVehicle(v)}
                    className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-block bg-slate-900 group-hover:bg-[#2563EB] text-white text-xs font-bold font-mono px-2.5 py-1 rounded-md tracking-wide transition-colors">
                        {v.registrationNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 capitalize group-hover:text-[#2563EB] transition-colors">{vehicleLabel(v)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.driverName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.capacity ? `${v.capacity} t` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        v.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums text-amber-700">
                      {formatCurrency(v.expenseStats?.month || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-slate-900">
                      {formatCurrency(v.expenseStats?.total || 0)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => onOpenVehicle(v)} title="View" className="p-2 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 cursor-pointer">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => onOpenVehicleReport(v)} title="Report" className="p-2 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 cursor-pointer">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => onEditVehicle(v)} title="Edit" className="p-2 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 border-t border-slate-200">
                  <td colSpan={5} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {filtered.length} vehicles shown
                  </td>
                  <td className="px-4 py-3 text-sm font-bold tabular-nums text-amber-700">{formatCurrency(footerMonth)}</td>
                  <td className="px-4 py-3 text-sm font-black tabular-nums text-slate-900">{formatCurrency(footerTotal)}</td>
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
