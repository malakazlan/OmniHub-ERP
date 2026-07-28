"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Fuel, Plus, Loader2, ArrowLeft, Trash2, Wrench } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const EXPENSE_TYPES = ["fuel", "maintenance", "repair", "toll", "salary", "other"];
const EXPENSE_VARIANTS = {
  fuel: "warning",
  maintenance: "info",
  repair: "danger",
  toll: "neutral",
  salary: "purple",
  other: "default",
};

const emptyForm = {
  vehicleId: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  expenseType: "fuel",
  amount: "",
  description: "",
  paymentMethod: "cash",
  accountId: "",
  notes: "",
};

export default function VehicleExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [vehicleFilter, setVehicleFilter] = useState("");

  const fetchExpenses = async (vId = "") => {
    try {
      const url = vId ? `/api/transport/vehicle-expenses?vehicleId=${vId}` : "/api/transport/vehicle-expenses";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses || []);
      else showToast(data.error || "Failed to load expenses", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [vRes, aRes] = await Promise.all([
          fetch("/api/transport/vehicles"),
          fetch("/api/accounts"),
        ]);
        const vData = await vRes.json();
        const aData = await aRes.json();
        if (vRes.ok) setVehicles(vData.vehicles || []);
        if (aRes.ok) setAccounts((aData.accounts || []).filter((a) => a.category === "cash" || a.category === "bank"));
      } catch {
        /* ignore */
      }
    };
    load();
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchExpenses(vehicleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleFilter]);

  const openCreate = () => {
    setForm({ ...emptyForm, vehicleId: vehicleFilter || (vehicles[0]?.id ? String(vehicles[0].id) : "") });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete this ${row.expenseType} expense of ${formatCurrency(row.amount)}?`)) return;
    try {
      const res = await fetch(`/api/transport/vehicle-expenses/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Expense deleted", "success");
        fetchExpenses(vehicleFilter);
      } else showToast(data.error || "Failed to delete expense", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleId || !form.amount) {
      showToast("Vehicle and amount are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transport/vehicle-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Expense recorded!", "success");
        setModalOpen(false);
        fetchExpenses(vehicleFilter);
      } else showToast(data.error || "Failed to save expense", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const fuelTotal = expenses.filter((e) => e.expenseType === "fuel").reduce((s, e) => s + e.amount, 0);
  const maintenanceTotal = expenses
    .filter((e) => e.expenseType === "maintenance" || e.expenseType === "repair")
    .reduce((s, e) => s + e.amount, 0);

  const columns = [
    {
      header: "Vehicle",
      accessor: "vehicle",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-transport">
          {row.vehicle?.registrationNumber || "—"}
        </span>
      ),
    },
    {
      header: "Type",
      accessor: "expenseType",
      cell: (row) => (
        <Badge variant={EXPENSE_VARIANTS[row.expenseType] || "neutral"}>{row.expenseType}</Badge>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      cell: (row) => <span className="text-xs text-slate-600">{row.description || "—"}</span>,
    },
    {
      header: "Amount",
      accessor: "amount",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-red-600">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      header: "Method",
      accessor: "paymentMethod",
      cell: (row) => <span className="text-xs capitalize text-slate-600">{row.paymentMethod}</span>,
    },
    {
      header: "Date",
      accessor: "expenseDate",
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.expenseDate)}</span>,
    },
    {
      header: "",
      accessor: "id",
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="transport"
        title="Vehicle Expenses"
        description="Track fuel, maintenance, and other fleet running costs."
        icon={Fuel}
        breadcrumbs={[
          { label: "Transport", href: "/transport" },
          { label: "Fleet", href: "/transport/vehicles" },
          { label: "Expenses" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/transport/vehicles">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-transport hover:bg-cyan-600 border-0">
              <Plus className="w-4 h-4" /> Add Expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="transport" label="Total Expenses" value={formatCurrency(totalAmount)} icon={Fuel} valueClassName="text-red-500" />
        <StatCard module="transport" label="Fuel Costs" value={formatCurrency(fuelTotal)} icon={Fuel} />
        <StatCard module="transport" label="Maintenance & Repairs" value={formatCurrency(maintenanceTotal)} icon={Wrench} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setVehicleFilter("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${!vehicleFilter ? "bg-acc-transport text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
        >
          All Vehicles
        </button>
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setVehicleFilter(String(v.id))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${vehicleFilter === String(v.id) ? "bg-acc-transport text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
          >
            {v.registrationNumber}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-transport animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={expenses} searchKey="expenseType" placeholder="Search expenses..." />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Vehicle Expense" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vehicle *</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                required
                className="input-field"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.vehicleType})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Expense Type *</label>
              <select
                value={form.expenseType}
                onChange={(e) => setForm({ ...form, expenseType: e.target.value })}
                className="input-field"
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="input-field"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paid From Account</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="input-field"
              >
                <option value="">— None —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
                placeholder="e.g. Diesel refill at Shahdara"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field h-16 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting} className="bg-acc-transport hover:bg-cyan-600 border-0">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
