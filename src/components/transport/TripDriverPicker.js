"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserCircle } from "lucide-react";

export const PICK_OTHER = "__other__";

function resolvePhone(account) {
  return account?.phone?.trim() || account?.party?.phone?.trim() || "";
}

/**
 * Pick a driver from transport (driver) ledger accounts, with manual entry fallback.
 */
export default function TripDriverPicker({
  driverName = "",
  driverPhone = "",
  onDriverNameChange,
  onDriverPhoneChange,
  vehicles = [],
  className = "",
}) {
  const [driverAccounts, setDriverAccounts] = useState([]);
  const [driverPick, setDriverPick] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/accounts?category=transport");
        const data = await res.json();
        if (res.ok) {
          setDriverAccounts((data.accounts || []).filter((a) => a.isActive !== false));
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const accountOptions = useMemo(() => {
    return driverAccounts
      .map((a) => ({
        key: `acc-${a.id}`,
        id: a.id,
        name: a.name?.trim() || "",
        phone: resolvePhone(a),
        city: a.city?.trim() || a.party?.city?.trim() || "",
        code: a.code || "",
      }))
      .filter((o) => o.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [driverAccounts]);

  const extraNames = useMemo(() => {
    const names = new Set(accountOptions.map((o) => o.name.toLowerCase()));
    const extras = [];
    for (const v of vehicles) {
      const n = v.driverName?.trim();
      if (n && !names.has(n.toLowerCase())) {
        extras.push({ key: `veh-${n}`, name: n, phone: v.driverPhone?.trim() || "" });
        names.add(n.toLowerCase());
      }
    }
    return extras.sort((a, b) => a.name.localeCompare(b.name));
  }, [vehicles, accountOptions]);

  useEffect(() => {
    if (!driverName) {
      setDriverPick("");
      return;
    }
    const fromAccount = accountOptions.find(
      (o) => o.name.toLowerCase() === driverName.toLowerCase()
    );
    if (fromAccount) {
      setDriverPick(fromAccount.key);
      return;
    }
    const fromFleet = extraNames.find(
      (o) => o.name.toLowerCase() === driverName.toLowerCase()
    );
    if (fromFleet) {
      setDriverPick(fromFleet.key);
      return;
    }
    setDriverPick(PICK_OTHER);
  }, [driverName, accountOptions, extraNames]);

  const onSelect = (e) => {
    const value = e.target.value;
    setDriverPick(value);
    if (!value) {
      onDriverNameChange("");
      onDriverPhoneChange("");
      return;
    }
    if (value === PICK_OTHER) {
      onDriverNameChange("");
      onDriverPhoneChange("");
      return;
    }
    const opt =
      accountOptions.find((o) => o.key === value) ||
      extraNames.find((o) => o.key === value);
    if (opt) {
      onDriverNameChange(opt.name);
      onDriverPhoneChange(opt.phone || "");
    }
  };

  const showManual = driverPick === PICK_OTHER;

  return (
    <div className={`space-y-2 ${className}`}>
      <select
        value={driverPick}
        onChange={onSelect}
        className="erp-finance-input"
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading drivers…" : "Select driver from accounts…"}
        </option>
        {accountOptions.length > 0 && (
          <optgroup label="Driver accounts">
            {accountOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
                {o.city ? ` · ${o.city}` : ""}
                {o.phone ? ` · ${o.phone}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        {extraNames.length > 0 && (
          <optgroup label="From fleet vehicles">
            {extraNames.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
                {o.phone ? ` · ${o.phone}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        <option value={PICK_OTHER}>Other — enter manually</option>
      </select>

      {showManual && (
        <input
          type="text"
          value={driverName}
          onChange={(e) => onDriverNameChange(e.target.value)}
          className="erp-finance-input"
          placeholder="Driver full name"
          required
          autoFocus
        />
      )}

      {!showManual && driverPick && driverName && (
        <div className="erp-trip-driver-selected">
          <UserCircle className="w-4 h-4 shrink-0 text-cyan-600" />
          <span className="font-semibold text-slate-800">{driverName}</span>
          {driverPhone && <span className="text-slate-500 font-mono text-xs">{driverPhone}</span>}
        </div>
      )}

      {!driverAccounts.length && !loading && (
        <p className="text-[11px] text-slate-500">
          No driver accounts yet.{" "}
          <Link href="/accounts?category=transport" className="text-cyan-700 font-semibold hover:underline">
            Add a driver account
          </Link>
        </p>
      )}
    </div>
  );
}
