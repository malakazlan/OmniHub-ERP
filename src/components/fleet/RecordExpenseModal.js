"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Loader2 } from "lucide-react";
import { EXPENSE_TYPES, emptyExpenseForm } from "@/components/fleet/fleetConstants";
import { vehicleLabel } from "@/lib/fleetStats";
import { formatCurrency } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

export default function RecordExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  vehicle = null,
  vehicles = [],
  cashAccounts = [],
  bankAccounts = [],
}) {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [form, setForm] = useState(emptyExpenseForm);
  const [submitting, setSubmitting] = useState(false);

  const defaultCashId = useMemo(() => {
    if (defaultCashAccountId) return String(defaultCashAccountId);
    if (!cashAccounts.length) return "";
    return String(cashAccounts[0].id);
  }, [defaultCashAccountId, cashAccounts]);

  const defaultBankId = useMemo(() => {
    if (!bankAccounts.length) return "";
    return String(bankAccounts[0].id);
  }, [bankAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...emptyExpenseForm,
      vehicleId: vehicle?.id ? String(vehicle.id) : "",
      accountId: defaultCashId,
    });
  }, [isOpen, vehicle, defaultCashId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setPaymentChannel = (channel) => {
    setForm((f) => ({
      ...f,
      paymentChannel: channel,
      accountId: channel === "cash" ? defaultCashId : defaultBankId,
    }));
  };

  const accountList = form.paymentChannel === "cash" ? cashAccounts : bankAccounts;
  const selectedAccount = accountList.find((a) => String(a.id) === String(form.accountId)) || accountList[0];

  const selectedVehicle = useMemo(() => {
    if (vehicle?.id) return vehicle;
    return vehicles.find((v) => String(v.id) === String(form.vehicleId)) || null;
  }, [vehicle, vehicles, form.vehicleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vid = vehicle?.id || parseInt(form.vehicleId, 10);
    if (!vid || !form.amount || !form.accountId) {
      showToast("Vehicle, amount, and payment account are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transport/vehicle-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vid,
          expenseDate: form.expenseDate,
          expenseType: form.expenseType,
          amount: form.amount,
          description: form.description,
          paymentMethod: form.paymentChannel === "cash" ? "cash" : "bank_transfer",
          accountId: form.accountId,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess?.(data.expense);
        onClose();
      } else {
        showToast(data.error || "Failed to record payment", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
        Cancel
      </button>
      <Button type="submit" form="fleet-expense-form" disabled={submitting} className="bg-acc-transport hover:bg-cyan-600 border-0 min-w-[140px]">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record & pay"}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay fleet expense" size="md" footer={footer}>
      <form id="fleet-expense-form" onSubmit={handleSubmit} className="erp-fleet-form space-y-4">
        <p className="text-xs text-cyan-900 bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2">
          Payment is posted to your selected cash or bank account in the general ledger.
        </p>

        {!vehicle && (
          <div className="space-y-1">
            <label className="erp-finance-label">Vehicle *</label>
            <select
              required
              value={form.vehicleId}
              onChange={(e) => set("vehicleId", e.target.value)}
              className="erp-finance-input w-full"
            >
              <option value="">Select vehicle...</option>
              {vehicles.filter((v) => v.isActive !== false).map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.registrationNumber} · {vehicleLabel(v)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedVehicle && vehicle && (
          <p className="text-sm font-semibold text-slate-800">
            {selectedVehicle.registrationNumber} · <span className="text-slate-500 font-normal capitalize">{vehicleLabel(selectedVehicle)}</span>
          </p>
        )}

        <div>
          <p className="erp-finance-label mb-2">Expense type</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {EXPENSE_TYPES.map(({ key, label, icon: Icon }) => {
              const active = form.expenseType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("expenseType", key)}
                  className={`erp-fleet-type-btn${active ? " is-active" : ""}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="erp-finance-label">Date</label>
            <input type="date" className="erp-finance-input w-full" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="erp-finance-label">Amount *</label>
            <input type="number" min="0.01" step="any" className="erp-finance-input w-full font-mono" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="erp-finance-label">Description</label>
            <input type="text" className="erp-finance-input w-full" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Diesel fill, oil change, tyre repair..." />
          </div>
        </div>

        <div className="space-y-2">
          <p className="erp-finance-label">Pay from *</p>
          <div className="erp-fleet-pay-tabs">
            {["cash", "bank"].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setPaymentChannel(ch)}
                className={`erp-fleet-pay-tab${form.paymentChannel === ch ? " is-active" : ""}`}
              >
                {ch === "cash" ? "Cash" : "Bank"}
              </button>
            ))}
          </div>
          {accountList.length === 0 ? (
            <p className="text-xs text-red-600">No {form.paymentChannel} accounts found. Add one under Accounts.</p>
          ) : (
            <div className="erp-fleet-pay-panel">
              <select
                required
                className="erp-finance-input w-full"
                value={form.accountId}
                onChange={(e) => set("accountId", e.target.value)}
              >
                {accountList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · Bal {formatCurrency(a.balance || 0)}
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <p className="text-[11px] text-cyan-800 mt-2">
                  Available: <strong className="font-mono">{formatCurrency(selectedAccount.balance || 0)}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="erp-finance-label">Notes (optional)</label>
          <textarea className="erp-finance-input w-full h-16 resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
