"use client";

import React, { useEffect, useMemo, useState } from "react";

export const PICK_OTHER = "__other__";

function FieldLabel({ children }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
      {children}
    </span>
  );
}

/**
 * Fleet vehicle + driver pickers with "Other" manual entry.
 * Values are controlled via vehicleNumber / driverName on parent form.
 */
export function FleetVehicleDriverFields({
  vehicleNumber = "",
  driverName = "",
  onVehicleNumberChange,
  onDriverNameChange,
  className = "",
}) {
  const [vehicles, setVehicles] = useState([]);
  const [driverAccounts, setDriverAccounts] = useState([]);
  const [vehiclePick, setVehiclePick] = useState("");
  const [driverPick, setDriverPick] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [vRes, aRes] = await Promise.all([
          fetch("/api/transport/vehicles"),
          fetch("/api/accounts?category=transport"),
        ]);
        const vData = await vRes.json();
        const aData = await aRes.json();
        if (vRes.ok) setVehicles((vData.vehicles || []).filter((v) => v.isActive !== false));
        if (aRes.ok) setDriverAccounts(aData.accounts || []);
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.isActive !== false),
    [vehicles]
  );

  const driverOptions = useMemo(() => {
    const names = new Set();
    for (const v of activeVehicles) {
      if (v.driverName?.trim()) names.add(v.driverName.trim());
    }
    for (const a of driverAccounts) {
      if (a.name?.trim()) names.add(a.name.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [activeVehicles, driverAccounts]);

  useEffect(() => {
    if (!vehicleNumber) {
      setVehiclePick("");
      return;
    }
    const match = activeVehicles.find(
      (v) => v.registrationNumber?.toLowerCase() === vehicleNumber.toLowerCase()
    );
    if (match) setVehiclePick(String(match.id));
    else setVehiclePick(PICK_OTHER);
  }, [vehicleNumber, activeVehicles]);

  useEffect(() => {
    if (!driverName) {
      setDriverPick("");
      return;
    }
    if (driverOptions.includes(driverName)) setDriverPick(driverName);
    else setDriverPick(PICK_OTHER);
  }, [driverName, driverOptions]);

  const onVehicleSelect = (e) => {
    const value = e.target.value;
    setVehiclePick(value);
    if (!value) {
      onVehicleNumberChange("");
      return;
    }
    if (value === PICK_OTHER) {
      onVehicleNumberChange("");
      return;
    }
    const v = activeVehicles.find((veh) => String(veh.id) === value);
    if (v) {
      onVehicleNumberChange(v.registrationNumber || "");
      if (v.driverName?.trim() && !driverName) {
        onDriverNameChange(v.driverName.trim());
      }
    }
  };

  const onDriverSelect = (e) => {
    const value = e.target.value;
    setDriverPick(value);
    if (!value) {
      onDriverNameChange("");
      return;
    }
    if (value === PICK_OTHER) {
      onDriverNameChange("");
      return;
    }
    onDriverNameChange(value);
  };

  const showVehicleManual = vehiclePick === PICK_OTHER;
  const showDriverManual = driverPick === PICK_OTHER;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      <div className="space-y-2">
        <FieldLabel>Vehicle</FieldLabel>
        <select
          value={vehiclePick}
          onChange={onVehicleSelect}
          className="input-field w-full min-h-[42px]"
        >
          <option value="">Select from fleet…</option>
          {activeVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNumber}
              {v.vehicleType ? ` · ${v.vehicleType}` : ""}
              {v.make || v.model ? ` (${[v.make, v.model].filter(Boolean).join(" ")})` : ""}
            </option>
          ))}
          <option value={PICK_OTHER}>Other — enter manually</option>
        </select>
        {showVehicleManual && (
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => onVehicleNumberChange(e.target.value)}
            className="input-field w-full min-h-[42px]"
            placeholder="Vehicle registration number"
            autoFocus
          />
        )}
        {vehiclePick && vehiclePick !== PICK_OTHER && vehicleNumber && (
          <p className="text-[10px] text-slate-500 font-mono">{vehicleNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel>Driver</FieldLabel>
        <select
          value={driverPick}
          onChange={onDriverSelect}
          className="input-field w-full min-h-[42px]"
        >
          <option value="">Select driver…</option>
          {driverOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={PICK_OTHER}>Other — enter manually</option>
        </select>
        {showDriverManual && (
          <input
            type="text"
            value={driverName}
            onChange={(e) => onDriverNameChange(e.target.value)}
            className="input-field w-full min-h-[42px]"
            placeholder="Driver full name"
            autoFocus
          />
        )}
        {driverPick && driverPick !== PICK_OTHER && driverName && (
          <p className="text-[10px] text-slate-500">{driverName}</p>
        )}
      </div>
    </div>
  );
}
