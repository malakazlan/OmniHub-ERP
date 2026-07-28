"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { Truck, Loader2, ArrowLeft, Save } from "lucide-react";
import { TRANSPORT_STATUSES } from "@/lib/constants";

const emptyForm = {
  vehicleId: "",
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  originCity: "",
  originAddress: "",
  destinationCity: "",
  destinationAddress: "",
  loadWeight: "",
  loadDescription: "",
  freightCharges: "",
  loadingCharges: "",
  unloadingCharges: "",
  tollCharges: "",
  otherCharges: "",
  status: "pending",
  dispatchDate: "",
  deliveryDate: "",
  notes: "",
};

function NewTransportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [vehicles, setVehicles] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [vRes, cRes] = await Promise.all([
          fetch("/api/transport/vehicles"),
          fetch("/api/settings/cities"),
        ]);
        const vData = await vRes.json();
        const cData = await cRes.json();
        if (vRes.ok) setVehicles(vData.vehicles || []);
        if (cRes.ok) setCities(cData.cities || []);
      } catch {
        /* ignore */
      }
    };
    loadRefs();
  }, []);

  useEffect(() => {
    if (!editId) return;
    const loadTransport = async () => {
      try {
        const res = await fetch(`/api/transport/${editId}`);
        const data = await res.json();
        if (res.ok && data.transport) {
          const t = data.transport;
          setForm({
            vehicleId: t.vehicleId ? String(t.vehicleId) : "",
            vehicleNumber: t.vehicleNumber || "",
            driverName: t.driverName || "",
            driverPhone: t.driverPhone || "",
            originCity: t.originCity || "",
            originAddress: t.originAddress || "",
            destinationCity: t.destinationCity || "",
            destinationAddress: t.destinationAddress || "",
            loadWeight: t.loadWeight ? String(t.loadWeight) : "",
            loadDescription: t.loadDescription || "",
            freightCharges: t.freightCharges ? String(t.freightCharges) : "",
            loadingCharges: t.loadingCharges ? String(t.loadingCharges) : "",
            unloadingCharges: t.unloadingCharges ? String(t.unloadingCharges) : "",
            tollCharges: t.tollCharges ? String(t.tollCharges) : "",
            otherCharges: t.otherCharges ? String(t.otherCharges) : "",
            status: t.status || "pending",
            dispatchDate: t.dispatchDate ? t.dispatchDate.slice(0, 10) : "",
            deliveryDate: t.deliveryDate ? t.deliveryDate.slice(0, 10) : "",
            notes: t.notes || "",
          });
        } else showToast(data.error || "Transport not found", "error");
      } catch {
        showToast("Error loading transport", "error");
      } finally {
        setLoading(false);
      }
    };
    loadTransport();
  }, [editId]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "vehicleId" && value) {
        const v = vehicles.find((veh) => String(veh.id) === value);
        if (v) {
          next.vehicleNumber = v.registrationNumber;
          if (v.driverName && !prev.driverName) next.driverName = v.driverName;
          if (v.driverPhone && !prev.driverPhone) next.driverPhone = v.driverPhone;
        }
      }
      return next;
    });
  };

  const totalCharges =
    (parseFloat(form.freightCharges) || 0) +
    (parseFloat(form.loadingCharges) || 0) +
    (parseFloat(form.unloadingCharges) || 0) +
    (parseFloat(form.tollCharges) || 0) +
    (parseFloat(form.otherCharges) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.driverName || !form.originCity || !form.destinationCity) {
      showToast("Driver, origin, and destination are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const url = editId ? `/api/transport/${editId}` : "/api/transport";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          editId ? "Transport updated!" : `Transport ${data.transport?.transportNumber} created!`,
          "success"
        );
        router.push("/transport");
      } else showToast(data.error || "Failed to save transport", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const cityOptions = cities.map((c) => c.name);

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="transport"
        title={editId ? "Edit Transport" : "New Transport"}
        description="Record a freight trip with route, load, and charges."
        icon={Truck}
        breadcrumbs={[
          { label: "Transport", href: "/transport" },
          { label: editId ? "Edit" : "New" },
        ]}
        actions={
          <Link href="/transport">
            <Button variant="outline" className="border-slate-200 text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acc-transport animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Vehicle & Driver</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Fleet Vehicle
                  </label>
                  <select value={form.vehicleId} onChange={handleChange("vehicleId")} className="input-field">
                    <option value="">— Hired / Manual —</option>
                    {vehicles.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={handleChange("vehicleNumber")}
                    className="input-field"
                    placeholder="ABC-1234"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    value={form.driverName}
                    onChange={handleChange("driverName")}
                    required
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Driver Phone
                  </label>
                  <input
                    type="text"
                    value={form.driverPhone}
                    onChange={handleChange("driverPhone")}
                    className="input-field"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Route</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Origin City *
                  </label>
                  <input
                    type="text"
                    list="city-list"
                    value={form.originCity}
                    onChange={handleChange("originCity")}
                    required
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    list="city-list"
                    value={form.destinationCity}
                    onChange={handleChange("destinationCity")}
                    required
                    className="input-field"
                  />
                </div>
                <datalist id="city-list">
                  {cityOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Origin Address
                  </label>
                  <input
                    type="text"
                    value={form.originAddress}
                    onChange={handleChange("originAddress")}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Destination Address
                  </label>
                  <input
                    type="text"
                    value={form.destinationAddress}
                    onChange={handleChange("destinationAddress")}
                    className="input-field"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Load & Charges</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Load Weight (tons)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.loadWeight}
                    onChange={handleChange("loadWeight")}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </label>
                  <select value={form.status} onChange={handleChange("status")} className="input-field">
                    {TRANSPORT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Load Description
                  </label>
                  <input
                    type="text"
                    value={form.loadDescription}
                    onChange={handleChange("loadDescription")}
                    className="input-field"
                    placeholder="Feed bags, raw material, etc."
                  />
                </div>
                {[
                  ["freightCharges", "Freight Charges"],
                  ["loadingCharges", "Loading Charges"],
                  ["unloadingCharges", "Unloading Charges"],
                  ["tollCharges", "Toll Charges"],
                  ["otherCharges", "Other Charges"],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form[key]}
                      onChange={handleChange(key)}
                      className="input-field"
                    />
                  </div>
                ))}
                <div className="md:col-span-2 p-3 rounded-xl bg-cyan-50 border border-cyan-100">
                  <p className="text-xs text-slate-500">Total Charges</p>
                  <p className="text-xl font-black font-mono text-acc-transport">
                    ₨ {totalCharges.toLocaleString("en-PK")}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={form.dispatchDate}
                    onChange={handleChange("dispatchDate")}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={handleChange("deliveryDate")}
                    className="input-field"
                  />
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/transport">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-acc-transport hover:bg-cyan-600 border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {editId ? "Update Transport" : "Create Transport"}
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewTransportPage() {
  return (
    <Suspense
      fallback={
        <div className="h-48 flex items-center justify-center page-enter">
          <Loader2 className="w-8 h-8 text-acc-transport animate-spin" />
        </div>
      }
    >
      <NewTransportForm />
    </Suspense>
  );
}
