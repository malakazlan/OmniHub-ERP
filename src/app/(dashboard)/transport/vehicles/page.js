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
import { Car, Loader2, ArrowLeft, Truck, Pencil, Fuel, Plus } from "lucide-react";
import { DirectoryRegisterBanner } from "@/components/accounts/DirectoryShell";

const emptyForm = {
  registrationNumber: "",
  vehicleType: "truck",
  make: "",
  model: "",
  year: "",
  capacity: "",
  driverName: "",
  driverPhone: "",
  isOwned: true,
  isActive: true,
  notes: "",
};

const VEHICLE_TYPES = ["truck", "pickup", "trailer", "dumper", "van", "other"];

export default function VehiclesPage() {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/transport/vehicles");
      const data = await res.json();
      if (res.ok) setVehicles(data.vehicles || []);
      else showToast(data.error || "Failed to load vehicles", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      registrationNumber: row.registrationNumber || "",
      vehicleType: row.vehicleType || "truck",
      make: row.make || "",
      model: row.model || "",
      year: row.year ? String(row.year) : "",
      capacity: row.capacity ? String(row.capacity) : "",
      driverName: row.driverName || "",
      driverPhone: row.driverPhone || "",
      isOwned: row.isOwned !== false,
      isActive: row.isActive !== false,
      notes: row.notes || "",
    });
    setModalOpen(true);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.registrationNumber || !form.vehicleType) {
      showToast("Registration and type are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      if (!editingId) {
        showToast("Register new vehicles in All Accounts", "warning");
        return;
      }
      const res = await fetch(`/api/transport/vehicles/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Vehicle updated!", "success");
        setModalOpen(false);
        fetchVehicles();
      } else showToast(data.error || "Failed to save vehicle", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = vehicles.filter((v) => v.isActive).length;
  const ownedCount = vehicles.filter((v) => v.isOwned).length;

  const columns = [
    {
      header: "Registration",
      accessor: "registrationNumber",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-transport">
          {row.registrationNumber}
        </span>
      ),
    },
    {
      header: "Type",
      accessor: "vehicleType",
      cell: (row) => (
        <span className="text-xs capitalize text-slate-700">{row.vehicleType}</span>
      ),
    },
    {
      header: "Make / Model",
      accessor: "make",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {[row.make, row.model].filter(Boolean).join(" ") || "—"}
        </span>
      ),
    },
    {
      header: "Capacity",
      accessor: "capacity",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.capacity ? `${row.capacity} tons` : "—"}
        </span>
      ),
    },
    {
      header: "Driver",
      accessor: "driverName",
      cell: (row) => (
        <div className="text-xs">
          <p className="text-slate-900">{row.driverName || "—"}</p>
          {row.driverPhone && <p className="text-slate-500">{row.driverPhone}</p>}
        </div>
      ),
    },
    {
      header: "Ownership",
      accessor: "isOwned",
      cell: (row) => (
        <Badge variant={row.isOwned ? "success" : "info"}>
          {row.isOwned ? "Owned" : "Hired"}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "neutral"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "",
      accessor: "id",
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openEdit(row);
          }}
          className="p-1.5 rounded-lg hover:bg-cyan-50 text-slate-400 hover:text-acc-transport transition-colors cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="transport"
        title="Fleet Vehicles"
        description="Manage owned and hired vehicles in your fleet."
        icon={Car}
        breadcrumbs={[
          { label: "Transport", href: "/transport" },
          { label: "Fleet" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/transport">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Link href="/transport/vehicles/expenses">
              <Button variant="outline" className="border-cyan-200 text-acc-transport hover:bg-cyan-50">
                <Fuel className="w-4 h-4" /> Expenses
              </Button>
            </Link>
            <Link href="/accounts?category=transport&mode=vehicle&create=1">
              <Button variant="outline" className="border-cyan-200 text-acc-transport hover:bg-cyan-50">
                <Plus className="w-4 h-4" /> Register in All Accounts
              </Button>
            </Link>
          </div>
        }
      />

      <DirectoryRegisterBanner category="transport" label="vehicle" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="transport" label="Total Vehicles" value={vehicles.length} icon={Car} />
        <StatCard module="transport" label="Active" value={activeCount} icon={Truck} />
        <StatCard module="transport" label="Owned Fleet" value={ownedCount} icon={Car} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-transport animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={vehicles}
              searchKey="registrationNumber"
              placeholder="Search registration..."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Vehicle"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Registration No. *
              </label>
              <input
                type="text"
                value={form.registrationNumber}
                onChange={handleChange("registrationNumber")}
                required
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Vehicle Type *
              </label>
              <select
                value={form.vehicleType}
                onChange={handleChange("vehicleType")}
                className="input-field"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {[
              ["make", "Make"],
              ["model", "Model"],
              ["year", "Year"],
              ["capacity", "Capacity (tons)"],
              ["driverName", "Default Driver"],
              ["driverPhone", "Driver Phone"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </label>
                <input
                  type={key === "year" || key === "capacity" ? "number" : "text"}
                  value={form[key]}
                  onChange={handleChange(key)}
                  className="input-field"
                />
              </div>
            ))}
            <div className="space-y-1 flex items-center gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isOwned}
                  onChange={handleChange("isOwned")}
                  className="rounded border-slate-300"
                />
                Company owned
              </label>
              {editingId && (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={handleChange("isActive")}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
              )}
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={handleChange("notes")}
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
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Vehicle"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
