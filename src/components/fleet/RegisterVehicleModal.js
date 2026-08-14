"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Loader2 } from "lucide-react";
import { VEHICLE_TYPES, emptyVehicleForm } from "@/components/fleet/fleetConstants";

export default function RegisterVehicleModal({ isOpen, onClose, onSuccess, vehicle = null }) {
  const { showToast } = useToast();
  const isEdit = Boolean(vehicle?.id);
  const [form, setForm] = useState(emptyVehicleForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (vehicle) {
      setForm({
        registrationNumber: vehicle.registrationNumber || "",
        vehicleType: vehicle.vehicleType || "truck",
        make: vehicle.make || "",
        model: vehicle.model || "",
        year: vehicle.year ? String(vehicle.year) : "",
        capacity: vehicle.capacity ? String(vehicle.capacity) : "",
        driverName: vehicle.driverName || "",
        driverPhone: vehicle.driverPhone || "",
        isOwned: vehicle.isOwned !== false,
        isActive: vehicle.isActive !== false,
        notes: vehicle.notes || "",
      });
    } else {
      setForm(emptyVehicleForm);
    }
  }, [isOpen, vehicle]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/transport/vehicles/${vehicle.id}` : "/api/transport/vehicles";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess?.(data.vehicle);
        onClose();
      } else {
        showToast(data.error || "Failed to save vehicle", "error");
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
      <Button type="submit" form="fleet-register-form" disabled={submitting} className="bg-[#2563EB] hover:bg-blue-700 border-0 min-w-[120px]">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save changes" : "Register vehicle"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit vehicle" : "Register vehicle"}
      size="lg"
      footer={footer}
    >
      <form id="fleet-register-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          Fleet vehicles are for dispatch and gate pass. No ledger account is created.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Plate / registration *</label>
            <input className="input-field w-full" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} placeholder="LEA 5055" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Vehicle type *</label>
            <select className="input-field w-full" value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}>
              {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Capacity (tons)</label>
            <input type="number" step="any" className="input-field w-full" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </div>
          {[
            ["make", "Make"],
            ["model", "Model"],
            ["year", "Year"],
            ["driverName", "Default driver"],
            ["driverPhone", "Driver phone"],
          ].map(([key, label]) => (
            <div key={key} className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
              <input type={key === "year" ? "number" : "text"} className="input-field w-full" value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isOwned} onChange={(e) => set("isOwned", e.target.checked)} />
              Company owned
            </label>
            {isEdit && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Active
              </label>
            )}
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Notes</label>
            <textarea className="input-field w-full min-h-[64px] resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
