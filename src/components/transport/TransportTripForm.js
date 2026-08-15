"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Loader2, Save, Truck, MapPin, ArrowRight,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import { TRANSPORT_STATUSES } from "@/lib/constants";
import {
  calcTripTotalCharges,
  mapTransportToForm,
  validateTripStep,
} from "@/lib/transport";
import {
  TRIP_FORM_STEPS,
  CHARGE_FIELDS,
  emptyTripForm,
  TRANSPORT_STATUS_META,
} from "@/components/transport/transportConstants";
import TransportStatusPill from "@/components/transport/TransportStatusPill";
import TripDriverPicker from "@/components/transport/TripDriverPicker";

function Field({ label, required, children, span2 }) {
  return (
    <div className={span2 ? "erp-finance-field-span2" : undefined}>
      <label className="erp-finance-label">
        {label}{required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

export default function TransportTripForm({ editId = null, initialTransport = null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState("vehicle");
  const [form, setForm] = useState(emptyTripForm);
  const [vehicles, setVehicles] = useState([]);
  const [cities, setCities] = useState([]);
  const [transportMeta, setTransportMeta] = useState(null);
  const [loading, setLoading] = useState(!!editId && !initialTransport);
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
    if (initialTransport) {
      setForm(mapTransportToForm(initialTransport));
      setTransportMeta(initialTransport);
      setLoading(false);
      return;
    }
    if (!editId) return;
    const loadTransport = async () => {
      try {
        const res = await fetch(`/api/transport/${editId}`);
        const data = await res.json();
        if (res.ok && data.transport) {
          setForm(mapTransportToForm(data.transport));
          setTransportMeta(data.transport);
        } else showToast(data.error || "Transport not found", "error");
      } catch {
        showToast("Error loading transport", "error");
      } finally {
        setLoading(false);
      }
    };
    loadTransport();
  }, [editId, initialTransport, showToast]);

  const setField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "vehicleId" && value) {
        const v = vehicles.find((veh) => String(veh.id) === String(value));
        if (v) {
          next.vehicleNumber = v.registrationNumber;
          if (v.driverName && !prev.driverName) next.driverName = v.driverName;
          if (v.driverPhone && !prev.driverPhone) next.driverPhone = v.driverPhone;
        }
      }
      return next;
    });
  };

  const handleChange = (field) => (e) => setField(field, e.target.value);

  const totalCharges = useMemo(() => calcTripTotalCharges(form), [form]);
  const cityOptions = cities.map((c) => c.name);
  const stepIndex = TRIP_FORM_STEPS.findIndex((s) => s.key === step);
  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId));

  const goNext = () => {
    const err = validateTripStep(step, form);
    if (err) {
      showToast(err, "warning");
      return;
    }
    const next = TRIP_FORM_STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  };

  const goBack = () => {
    const prev = TRIP_FORM_STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateTripStep("route", form) || validateTripStep("vehicle", form);
    if (err) {
      showToast(err, "warning");
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
          editId ? "Trip updated" : `Trip ${data.transport?.transportNumber} created`,
          "success"
        );
        router.push("/transport");
      } else showToast(data.error || "Failed to save trip", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="erp-fleet-surface page-enter pb-8">
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="erp-fleet-surface page-enter pb-8">
      <div className="erp-fleet-page space-y-5">
        <header className="erp-fleet-page-header">
          <div>
            <div className="erp-fleet-page-badge">
              <Truck className="w-3.5 h-3.5" />
              {editId ? "Edit trip" : "New trip"}
            </div>
            <h1 className="erp-fleet-page-title">
              {editId
                ? transportMeta?.transportNumber || "Edit transport trip"
                : "Create transport trip"}
            </h1>
            <p className="erp-fleet-page-desc">
              Assign vehicle and driver, define the route, enter load details and freight charges.
            </p>
          </div>
          <div className="erp-fleet-header-actions">
            <Link href="/transport">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ChevronLeft className="w-4 h-4" /> Back to trips
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-trip-stepper">
          {TRIP_FORM_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isDone = idx < stepIndex;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  if (idx <= stepIndex) setStep(s.key);
                }}
                className={`erp-trip-step${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}`}
              >
                <span className="erp-trip-step-num">{idx + 1}</span>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="erp-trip-step-label">{s.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="erp-trip-form-layout">
          <div className="erp-trip-form-main">
            {step === "vehicle" && (
              <section className="erp-finance-form-section">
                <div className="erp-finance-section-label erp-trip-section-label">Vehicle & driver</div>
                <div className="erp-finance-form-grid">
                  <Field label="Fleet vehicle">
                    <select value={form.vehicleId} onChange={handleChange("vehicleId")} className="erp-finance-input">
                      <option value="">— Hired / manual entry —</option>
                      {vehicles.filter((v) => v.isActive).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} ({v.vehicleType})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Vehicle number">
                    <input
                      type="text"
                      value={form.vehicleNumber}
                      onChange={handleChange("vehicleNumber")}
                      className="erp-finance-input font-mono"
                      placeholder="ABC-1234"
                    />
                  </Field>
                  <Field label="Driver" required span2>
                    <TripDriverPicker
                      driverName={form.driverName}
                      driverPhone={form.driverPhone}
                      onDriverNameChange={(val) => setField("driverName", val)}
                      onDriverPhoneChange={(val) => setField("driverPhone", val)}
                      vehicles={vehicles}
                    />
                  </Field>
                  <Field label="Driver phone">
                    <input
                      type="text"
                      value={form.driverPhone}
                      onChange={handleChange("driverPhone")}
                      className="erp-finance-input"
                      placeholder="03xx-xxxxxxx"
                    />
                  </Field>
                  {selectedVehicle && (
                    <div className="erp-finance-field-span2 erp-trip-vehicle-hint">
                      Fleet vehicle <strong>{selectedVehicle.registrationNumber}</strong>
                      {selectedVehicle.capacity ? ` · ${selectedVehicle.capacity} ton capacity` : ""}
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === "route" && (
              <section className="erp-finance-form-section">
                <div className="erp-finance-section-label erp-trip-section-label">Route</div>
                <div className="erp-finance-form-grid">
                  <Field label="Origin city" required>
                    <input
                      type="text"
                      list="trip-city-list"
                      value={form.originCity}
                      onChange={handleChange("originCity")}
                      required
                      className="erp-finance-input"
                    />
                  </Field>
                  <Field label="Destination city" required>
                    <input
                      type="text"
                      list="trip-city-list"
                      value={form.destinationCity}
                      onChange={handleChange("destinationCity")}
                      required
                      className="erp-finance-input"
                    />
                  </Field>
                  <datalist id="trip-city-list">
                    {cityOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <Field label="Origin address" span2>
                    <input
                      type="text"
                      value={form.originAddress}
                      onChange={handleChange("originAddress")}
                      className="erp-finance-input"
                      placeholder="Warehouse, farm gate, etc."
                    />
                  </Field>
                  <Field label="Destination address" span2>
                    <input
                      type="text"
                      value={form.destinationAddress}
                      onChange={handleChange("destinationAddress")}
                      className="erp-finance-input"
                      placeholder="Delivery point"
                    />
                  </Field>
                  {(form.originCity || form.destinationCity) && (
                    <div className="erp-finance-field-span2 erp-trip-route-preview">
                      <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                      <span>{form.originCity || "Origin"}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{form.destinationCity || "Destination"}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === "load" && (
              <>
                <section className="erp-finance-form-section">
                  <div className="erp-finance-section-label erp-trip-section-label">Load details</div>
                  <div className="erp-finance-form-grid">
                    <Field label="Load weight (tons)">
                      <input
                        type="number"
                        step="0.01"
                        value={form.loadWeight}
                        onChange={handleChange("loadWeight")}
                        className="erp-finance-input"
                      />
                    </Field>
                    <Field label="Trip status">
                      <select value={form.status} onChange={handleChange("status")} className="erp-finance-input">
                        {TRANSPORT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {TRANSPORT_STATUS_META[s]?.label || s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Load description" span2>
                      <input
                        type="text"
                        value={form.loadDescription}
                        onChange={handleChange("loadDescription")}
                        className="erp-finance-input"
                        placeholder="Feed bags, raw material, etc."
                      />
                    </Field>
                  </div>
                </section>

                <section className="erp-finance-form-section">
                  <div className="erp-finance-section-label erp-trip-section-label">Freight & charges</div>
                  <div className="erp-finance-form-grid">
                    {CHARGE_FIELDS.map(({ key, label }) => (
                      <Field key={key} label={label}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form[key]}
                          onChange={handleChange(key)}
                          className="erp-finance-input font-mono"
                        />
                      </Field>
                    ))}
                    <div className="erp-finance-field-span2 erp-trip-total-bar">
                      <span className="erp-trip-total-label">Total trip charges</span>
                      <span className="erp-trip-total-value">{formatCurrency(totalCharges)}</span>
                    </div>
                  </div>
                </section>

                <section className="erp-finance-form-section">
                  <div className="erp-finance-section-label erp-trip-section-label">Schedule</div>
                  <div className="erp-finance-form-grid">
                    <Field label="Dispatch date">
                      <input
                        type="date"
                        value={form.dispatchDate}
                        onChange={handleChange("dispatchDate")}
                        className="erp-finance-input"
                      />
                    </Field>
                    <Field label="Delivery date">
                      <input
                        type="date"
                        value={form.deliveryDate}
                        onChange={handleChange("deliveryDate")}
                        className="erp-finance-input"
                      />
                    </Field>
                    <Field label="Notes" span2>
                      <textarea
                        value={form.notes}
                        onChange={handleChange("notes")}
                        className="erp-finance-input erp-finance-textarea"
                        rows={3}
                      />
                    </Field>
                  </div>
                </section>
              </>
            )}

            {step === "review" && (
              <section className="erp-finance-form-section">
                <div className="erp-finance-section-label erp-trip-section-label">Review & confirm</div>
                <div className="erp-trip-review">
                  <div className="erp-trip-review-block">
                    <p className="erp-trip-review-heading">Vehicle & driver</p>
                    <p className="erp-trip-review-line">
                      <strong>{form.driverName}</strong>
                      {form.driverPhone ? ` · ${form.driverPhone}` : ""}
                    </p>
                    <p className="erp-trip-review-line text-slate-500">
                      {form.vehicleNumber || selectedVehicle?.registrationNumber || "No vehicle number"}
                    </p>
                  </div>
                  <div className="erp-trip-review-block">
                    <p className="erp-trip-review-heading">Route</p>
                    <div className="erp-trip-route-preview is-lg">
                      <span>{form.originCity}</span>
                      <ArrowRight className="w-4 h-4 text-cyan-500" />
                      <span>{form.destinationCity}</span>
                    </div>
                    {(form.originAddress || form.destinationAddress) && (
                      <p className="erp-trip-review-line text-xs text-slate-500 mt-2">
                        {[form.originAddress, form.destinationAddress].filter(Boolean).join(" → ")}
                      </p>
                    )}
                  </div>
                  <div className="erp-trip-review-block">
                    <p className="erp-trip-review-heading">Load</p>
                    <p className="erp-trip-review-line">
                      {form.loadWeight ? `${form.loadWeight} tons` : "—"}
                      {form.loadDescription ? ` · ${form.loadDescription}` : ""}
                    </p>
                    <p className="erp-trip-review-line mt-1">
                      Status: <TransportStatusPill status={form.status} />
                    </p>
                  </div>
                  <div className="erp-trip-review-block">
                    <p className="erp-trip-review-heading">Charges breakdown</p>
                    <div className="erp-trip-charge-rows">
                      {CHARGE_FIELDS.map(({ key, label }) => {
                        const val = parseFloat(form[key]) || 0;
                        if (!val) return null;
                        return (
                          <div key={key} className="erp-trip-charge-row">
                            <span>{label}</span>
                            <span className="font-mono">{formatCurrency(val)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="erp-trip-total-bar is-compact mt-3">
                      <span className="erp-trip-total-label">Total</span>
                      <span className="erp-trip-total-value">{formatCurrency(totalCharges)}</span>
                    </div>
                  </div>
                  {(form.dispatchDate || form.deliveryDate || form.notes) && (
                    <div className="erp-trip-review-block">
                      <p className="erp-trip-review-heading">Schedule & notes</p>
                      {form.dispatchDate && (
                        <p className="erp-trip-review-line text-sm">Dispatch: {form.dispatchDate}</p>
                      )}
                      {form.deliveryDate && (
                        <p className="erp-trip-review-line text-sm">Delivery: {form.deliveryDate}</p>
                      )}
                      {form.notes && (
                        <p className="erp-trip-review-line text-sm text-slate-600 mt-1">{form.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="erp-trip-form-nav">
              {stepIndex > 0 ? (
                <button type="button" onClick={goBack} className="erp-finance-btn-ghost">
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  Back
                </button>
              ) : (
                <Link href="/transport">
                  <button type="button" className="erp-finance-btn-ghost">Cancel</button>
                </Link>
              )}
              <div className="flex gap-2 ml-auto">
                {step !== "review" ? (
                  <Button type="button" onClick={goNext} className="bg-acc-transport border-0">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="bg-acc-transport border-0">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editId ? "Update trip" : "Create trip"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <aside className="erp-trip-summary">
            <p className="erp-trip-summary-title">Trip summary</p>
            {transportMeta?.transportNumber && (
              <p className="erp-trip-tr-num mb-3">{transportMeta.transportNumber}</p>
            )}
            <div className="erp-trip-summary-route">
              <div>
                <p className="erp-trip-summary-label">From</p>
                <p className="erp-trip-summary-value">{form.originCity || "—"}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-500 mx-auto my-2" />
              <div>
                <p className="erp-trip-summary-label">To</p>
                <p className="erp-trip-summary-value">{form.destinationCity || "—"}</p>
              </div>
            </div>
            <div className="erp-trip-summary-rows">
              <div className="erp-trip-summary-row">
                <span>Driver</span>
                <span>{form.driverName || "—"}</span>
              </div>
              <div className="erp-trip-summary-row">
                <span>Vehicle</span>
                <span className="font-mono text-xs">
                  {form.vehicleNumber || selectedVehicle?.registrationNumber || "—"}
                </span>
              </div>
              <div className="erp-trip-summary-row">
                <span>Load</span>
                <span>{form.loadWeight ? `${form.loadWeight} t` : "—"}</span>
              </div>
              <div className="erp-trip-summary-row">
                <span>Status</span>
                <TransportStatusPill status={form.status} />
              </div>
            </div>
            <div className="erp-trip-summary-total">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">Total charges</p>
              <p className="text-2xl font-black font-mono text-cyan-700">{formatCurrency(totalCharges)}</p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
