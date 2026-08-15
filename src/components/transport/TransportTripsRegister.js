"use client";

import React from "react";
import { Truck, ArrowRight, Loader2, Wallet, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { tripBalanceDue } from "@/lib/transport";
import TransportStatusSelect from "@/components/transport/TransportStatusSelect";

function PaymentBadge({ trip }) {
  const due = tripBalanceDue(trip);
  if ((trip.paymentStatus || "unpaid") === "paid" || due <= 0) {
    return <span className="erp-fleet-paid-badge">Paid</span>;
  }
  if ((trip.paymentStatus || "unpaid") === "partial" || (trip.paidAmount || 0) > 0) {
    return (
      <div className="text-center">
        <span className="erp-fleet-unpaid-badge">Partial</span>
        <p className="text-[10px] font-mono text-rose-600 mt-0.5">{formatCurrency(due)} due</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <span className="erp-fleet-unpaid-badge">Unpaid</span>
      {trip.totalCharges > 0 && (
        <p className="text-[10px] font-mono text-rose-600 mt-0.5">{formatCurrency(trip.totalCharges)}</p>
      )}
    </div>
  );
}

export default function TransportTripsRegister({
  rows = [],
  loading = false,
  onOpenTrip,
  onStatusChange,
  onPayTrip,
  statusUpdatingId = null,
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
        <Truck className="w-10 h-10 text-cyan-200 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No transport trips recorded</p>
        <p className="text-xs text-slate-400 mt-1">Create a new trip to track freight and delivery routes</p>
      </div>
    );
  }

  const footerCharges = rows.reduce((s, t) => s + (t.totalCharges || 0), 0);
  const footerPaid = rows.reduce((s, t) => s + (t.paidAmount || 0), 0);
  const footerWeight = rows.reduce((s, t) => s + (t.loadWeight || 0), 0);

  const stop = (e) => e.stopPropagation();

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className="erp-ledger-grid erp-fleet-grid erp-trip-grid">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-num">#</th>
              <th className="erp-lg-th erp-fleet-th">TR #</th>
              <th className="erp-lg-th erp-fleet-th">Route</th>
              <th className="erp-lg-th erp-fleet-th">Driver / vehicle</th>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-money">Load</th>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-money">Charges</th>
              <th className="erp-lg-th erp-fleet-th erp-fleet-th-center">Payment</th>
              <th className="erp-lg-th erp-fleet-th erp-fleet-th-center">Status</th>
              <th className="erp-lg-th erp-fleet-th">Dispatch</th>
              <th className="erp-lg-th erp-fleet-th erp-fleet-th-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, idx) => {
              const balanceDue = tripBalanceDue(t);
              return (
                <tr
                  key={t.id}
                  className="erp-lg-row erp-fleet-row is-clickable"
                  onClick={() => onOpenTrip?.(t)}
                >
                  <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                  <td className="erp-lg-td">
                    <span className="erp-trip-tr-num">{t.transportNumber}</span>
                  </td>
                  <td className="erp-lg-td">
                    <div className="erp-trip-route">
                      <span>{t.originCity}</span>
                      <ArrowRight className="w-3 h-3 shrink-0 text-cyan-500" />
                      <span>{t.destinationCity}</span>
                    </div>
                  </td>
                  <td className="erp-lg-td">
                    <p className="text-sm font-semibold text-slate-800">{t.driverName}</p>
                    {(t.vehicle?.registrationNumber || t.vehicleNumber) && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {t.vehicle?.registrationNumber || t.vehicleNumber}
                      </p>
                    )}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money text-xs text-slate-600">
                    {t.loadWeight ? `${t.loadWeight} t` : "—"}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money">
                    <p className="font-mono text-sm font-bold text-slate-900">{formatCurrency(t.totalCharges)}</p>
                    {(t.paidAmount || 0) > 0 && (
                      <p className="text-[10px] font-mono text-emerald-600">Paid {formatCurrency(t.paidAmount)}</p>
                    )}
                  </td>
                  <td className="erp-lg-td erp-fleet-td-center" onClick={stop}>
                    <PaymentBadge trip={t} />
                  </td>
                  <td className="erp-lg-td erp-fleet-td-center" onClick={stop}>
                    <TransportStatusSelect
                      status={t.status}
                      updating={statusUpdatingId === t.id}
                      onChange={(next) => onStatusChange?.(t, next)}
                    />
                  </td>
                  <td className="erp-lg-td text-xs text-slate-500">
                    {t.dispatchDate ? formatDate(t.dispatchDate) : "—"}
                  </td>
                  <td className="erp-lg-td erp-fleet-td-center" onClick={stop}>
                    <div className="erp-fleet-row-actions justify-center">
                      {balanceDue > 0 && (t.totalCharges || 0) > 0 && (
                        <button
                          type="button"
                          className="erp-fleet-icon-btn"
                          title="Pay freight"
                          onClick={() => onPayTrip?.(t)}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="erp-fleet-icon-btn"
                        title="Edit trip"
                        onClick={() => onOpenTrip?.(t)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="erp-fleet-foot">
              <td className="erp-lg-td" colSpan={4}>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {rows.length} trip{rows.length !== 1 ? "s" : ""}
                </span>
              </td>
              <td className="erp-lg-td erp-lg-td-money text-xs font-bold text-slate-600">
                {footerWeight ? `${footerWeight.toFixed(2)} t` : "—"}
              </td>
              <td className="erp-lg-td erp-lg-td-money">
                <p className="font-mono text-sm font-black text-cyan-700">{formatCurrency(footerCharges)}</p>
                {footerPaid > 0 && (
                  <p className="text-[10px] font-mono text-emerald-600">Paid {formatCurrency(footerPaid)}</p>
                )}
              </td>
              <td className="erp-lg-td" colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
