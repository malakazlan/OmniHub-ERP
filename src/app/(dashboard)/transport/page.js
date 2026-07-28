"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import {
  Truck,
  Plus,
  Loader2,
  MapPin,
  DollarSign,
  Package,
  Car,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_VARIANTS = {
  pending: "warning",
  in_transit: "info",
  delivered: "success",
  cancelled: "danger",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function TransportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransports = async () => {
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
  };

  useEffect(() => {
    fetchTransports();
  }, []);

  const inTransit = transports.filter((t) => t.status === "in_transit").length;
  const delivered = transports.filter((t) => t.status === "delivered").length;
  const totalCharges = transports.reduce((s, t) => s + (t.totalCharges || 0), 0);

  const columns = [
    {
      header: "TR #",
      accessor: "transportNumber",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-transport">{row.transportNumber}</span>
      ),
    },
    {
      header: "Route",
      accessor: "originCity",
      cell: (row) => (
        <div className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-900">{row.originCity}</span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-900">{row.destinationCity}</span>
        </div>
      ),
    },
    {
      header: "Driver",
      accessor: "driverName",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.driverName}</p>
          {row.vehicleNumber && (
            <p className="text-[10px] text-slate-500">{row.vehicleNumber}</p>
          )}
        </div>
      ),
    },
    {
      header: "Load",
      accessor: "loadWeight",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.loadWeight ? `${row.loadWeight} tons` : "—"}
        </span>
      ),
    },
    {
      header: "Charges",
      accessor: "totalCharges",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {formatCurrency(row.totalCharges)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status] || "neutral"}>
          {STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      header: "Date",
      accessor: "createdAt",
      cell: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="transport"
        title="Transport & Logistics"
        description="Manage freight trips, routes, and delivery costs."
        icon={Truck}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/transport/vehicles">
              <Button variant="outline" className="border-cyan-200 text-acc-transport hover:bg-cyan-50">
                <Car className="w-4 h-4" /> Fleet
              </Button>
            </Link>
            <Link href="/transport/new">
              <Button className="bg-acc-transport hover:bg-cyan-600 border-0 shadow-lg shadow-cyan-900/20">
                <Plus className="w-4 h-4" /> New Transport
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard module="transport" label="Total Trips" value={transports.length} icon={Truck} />
        <StatCard module="transport" label="In Transit" value={inTransit} icon={Package} />
        <StatCard module="transport" label="Delivered" value={delivered} icon={MapPin} />
        <StatCard
          module="transport"
          label="Total Freight"
          value={formatCurrency(totalCharges)}
          icon={DollarSign}
        />
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
              data={transports}
              searchKey="transportNumber"
              placeholder="Search transport number..."
              onRowClick={(row) => router.push(`/transport/new?id=${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
