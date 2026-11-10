"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck, Car, Plus, Search, Loader2, FileText, MapPin, Package, DollarSign,
} from "lucide-react";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import { summarizeTrips } from "@/lib/transport";
import { TRANSPORT_STATUS_FILTERS } from "@/components/transport/transportConstants";
import TransportTripsRegister from "@/components/transport/TransportTripsRegister";
import TripPayModal from "@/components/transport/TripPayModal";

export default function TransportListView({
  transports,
  loading,
  onNewTrip,
  onOpenTrip,
  onStatusChange,
  onTripUpdated,
  statusUpdatingId,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payTrip, setPayTrip] = useState(null);

  const summary = useMemo(() => summarizeTrips(transports), [transports]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transports.filter((t) => {
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const hay = [
        t.transportNumber,
        t.originCity,
        t.destinationCity,
        t.driverName,
        t.vehicleNumber,
        t.vehicle?.registrationNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchStatus && (!q || hay.includes(q));
    });
  }, [transports, search, statusFilter]);

  return (
    <div className="erp-fleet-surface page-enter pb-8">
      <div className="erp-fleet-page space-y-5">
        <header className="erp-fleet-page-header">
          <div>
            <div className="erp-fleet-page-badge">
              <Truck className="w-3.5 h-3.5" />
              Logistics
            </div>
            <h1 className="erp-fleet-page-title">Deliveries</h1>
            <p className="erp-fleet-page-desc">
              Change delivery status from the list, pay freight from cash or bank, and open a row to edit full details.
            </p>
          </div>
          <div className="erp-fleet-header-actions">
            <Link href="/transport/vehicles">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <Car className="w-4 h-4" /> Fleet
              </Button>
            </Link>
            <Link href="/reports/transport">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <FileText className="w-4 h-4" /> Delivery report
              </Button>
            </Link>
            <Button onClick={onNewTrip} className="bg-acc-transport border-0">
              <Plus className="w-4 h-4" /> New delivery
            </Button>
          </div>
        </header>

        <div className="erp-fleet-stats">
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><Truck className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">Total deliveries</p>
              <p className="erp-fleet-stat-value">{summary.total}</p>
            </div>
          </div>
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><Package className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">In transit</p>
              <p className="erp-fleet-stat-value">{summary.inTransit}</p>
            </div>
          </div>
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><MapPin className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">Delivered</p>
              <p className="erp-fleet-stat-value">{summary.delivered}</p>
            </div>
          </div>
          <div className="erp-fleet-stat">
            <div className="erp-fleet-stat-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-fleet-stat-label">Total freight</p>
              <p className="erp-fleet-stat-value">{formatCurrency(summary.totalCharges)}</p>
            </div>
          </div>
        </div>

        <div className="erp-fleet-toolbar">
          <div className="erp-fleet-search-wrap">
            <Search className="erp-fleet-search-icon" />
            <input
              type="text"
              placeholder="Search TR #, route, driver, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="erp-fleet-status-filters">
            {TRANSPORT_STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`erp-fleet-filter-btn${statusFilter === key ? " is-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="erp-fleet-register">
          <div className="erp-fleet-register-head">
            <div>
              <p className="erp-fleet-register-title">Delivery register</p>
              <p className="erp-fleet-register-meta">
                {filtered.length} trips · change status inline · wallet icon to pay freight
              </p>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-cyan-600 animate-spin" />
            </div>
          ) : (
            <TransportTripsRegister
              rows={filtered}
              onOpenTrip={onOpenTrip}
              onStatusChange={onStatusChange}
              onPayTrip={setPayTrip}
              statusUpdatingId={statusUpdatingId}
            />
          )}
        </div>
      </div>

      <TripPayModal
        trip={payTrip}
        isOpen={!!payTrip}
        onClose={() => setPayTrip(null)}
        onSuccess={(updated) => {
          onTripUpdated?.(updated);
          setPayTrip(null);
        }}
      />
    </div>
  );
}
