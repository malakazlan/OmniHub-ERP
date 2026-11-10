"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import TransportListView from "@/components/transport/TransportListView";

export default function TransportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const fetchTransports = useCallback(async () => {
    try {
      const res = await fetch("/api/transport");
      const data = await res.json();
      if (res.ok) setTransports(data.transports || []);
      else showToast(data.error || "Failed to load transports", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTransports();
  }, [fetchTransports]);

  const handleStatusChange = async (trip, nextStatus) => {
    if (!trip?.id || nextStatus === trip.status) return;
    setStatusUpdatingId(trip.id);
    try {
      const res = await fetch(`/api/transport/${trip.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.transport) {
        setTransports((prev) =>
          prev.map((t) => (t.id === data.transport.id ? { ...t, ...data.transport } : t))
        );
        showToast("Delivery status updated", "success");
      } else {
        showToast(data.error || "Failed to update status", "error");
      }
    } catch {
      showToast("Error updating status", "error");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleTripUpdated = (updated) => {
    if (!updated?.id) return;
    setTransports((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    );
  };

  return (
    <TransportListView
      transports={transports}
      loading={loading}
      statusUpdatingId={statusUpdatingId}
      onNewTrip={() => router.push("/transport/new")}
      onOpenTrip={(trip) => router.push(`/transport/new?id=${trip.id}`)}
      onStatusChange={handleStatusChange}
      onTripUpdated={handleTripUpdated}
    />
  );
}
