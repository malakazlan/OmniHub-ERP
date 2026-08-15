"use client";

import React from "react";
import { Loader2, Car, Eye, BarChart3, Pencil, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { vehicleLabel } from "@/lib/fleetStats";

export default function FleetVehiclesRegister({
  rows = [],
  loading = false,
  onOpenVehicle,
  onEditVehicle,
  onOpenReport,
  onPayExpense,
}) {
  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-cyan-600 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="erp-ac-empty py-16">
        <Car className="w-10 h-10 text-cyan-200 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No vehicles in fleet register</p>
      </div>
    );
  }

  const footerMonth = rows.reduce((s, v) => s + (v.expenseStats?.month || 0), 0);
  const footerTotal = rows.reduce((s, v) => s + (v.expenseStats?.total || 0), 0);

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className="erp-ledger-grid erp-fleet-grid">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-num">#</th>
              <th className="erp-lg-th erp-fleet-th">Plate</th>
              <th className="erp-lg-th erp-fleet-th">Vehicle</th>
              <th className="erp-lg-th erp-fleet-th">Driver</th>
              <th className="erp-lg-th erp-fleet-th">Capacity</th>
              <th className="erp-lg-th erp-fleet-th erp-fleet-th-center">Status</th>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-money">This month</th>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-money">Total cost</th>
              <th className="erp-lg-th erp-fleet-th erp-fleet-th-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, idx) => (
              <tr
                key={v.id}
                className="erp-lg-row erp-fleet-row is-clickable"
                onClick={() => onOpenVehicle?.(v)}
              >
                <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                <td className="erp-lg-td">
                  <span className="erp-fleet-plate">{v.registrationNumber}</span>
                </td>
                <td className="erp-lg-td text-sm capitalize text-slate-800">{vehicleLabel(v)}</td>
                <td className="erp-lg-td text-xs text-slate-600">{v.driverName || "—"}</td>
                <td className="erp-lg-td text-xs text-slate-600">{v.capacity ? `${v.capacity} t` : "—"}</td>
                <td className="erp-lg-td erp-fleet-td-center">
                  <span className={`erp-fleet-status${v.isActive ? " is-active" : ""}`}>
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="erp-lg-td erp-lg-td-money text-amber-700">{formatCurrency(v.expenseStats?.month || 0)}</td>
                <td className="erp-lg-td erp-lg-td-money font-bold">{formatCurrency(v.expenseStats?.total || 0)}</td>
                <td className="erp-lg-td erp-fleet-td-center" onClick={(e) => e.stopPropagation()}>
                  <div className="erp-fleet-row-actions">
                    <button type="button" className="erp-fleet-icon-btn" onClick={() => onPayExpense?.(v)} title="Pay expense">
                      <Wallet className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="erp-fleet-icon-btn" onClick={() => onOpenVehicle?.(v)} title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="erp-fleet-icon-btn" onClick={() => onOpenReport?.(v)} title="Report">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="erp-fleet-icon-btn" onClick={() => onEditVehicle?.(v)} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="erp-fleet-foot">
              <td colSpan={6} className="erp-lg-td text-xs font-bold uppercase text-slate-500">
                {rows.length} vehicles
              </td>
              <td className="erp-lg-td erp-lg-td-money font-bold text-amber-700">{formatCurrency(footerMonth)}</td>
              <td className="erp-lg-td erp-lg-td-money font-black">{formatCurrency(footerTotal)}</td>
              <td className="erp-lg-td" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
