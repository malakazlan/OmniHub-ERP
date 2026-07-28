"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { PurchasePayModal } from "@/components/purchases/PurchasePayModal";
import {
  ShoppingCart,
  Plus,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  Wallet,
  Pencil,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_VARIANTS = {
  draft: "neutral",
  confirmed: "info",
  received: "success",
  cancelled: "danger",
};

const PAYMENT_VARIANTS = {
  unpaid: "danger",
  partial: "warning",
  paid: "success",
};

export default function PurchasesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payPurchase, setPayPurchase] = useState(null);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all" ? "/api/purchases" : `/api/purchases?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setPurchases(data.purchases || []);
      else showToast(data.error || "Failed to load purchases", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const totalAmount = purchases.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const confirmedCount = purchases.filter((p) => p.status === "confirmed" || p.status === "received").length;
  const draftCount = purchases.filter((p) => p.status === "draft").length;
  const balanceTotal = purchases.reduce(
    (s, p) => s + Math.max((p.totalAmount || 0) - (p.paidAmount || 0), 0),
    0
  );

  const columns = [
    {
      header: "PO Number",
      accessor: "purchaseNumber",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-purchases">{row.purchaseNumber}</span>
      ),
    },
    {
      header: "Vendor",
      accessor: "vendorName",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.vendorName}</p>
          <p className="text-[10px] text-slate-500">{row.farmerId ? "Farmer" : row.companyId ? "Company" : "—"}</p>
        </div>
      ),
    },
    {
      header: "Date",
      accessor: "purchaseDate",
      cell: (row) => <span className="text-xs text-slate-600">{formatDate(row.purchaseDate)}</span>,
    },
    {
      header: "Total",
      accessor: "totalAmount",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      header: "Paid",
      accessor: "paidAmount",
      cell: (row) => (
        <span className="font-mono text-xs text-emerald-700">{formatCurrency(row.paidAmount || 0)}</span>
      ),
    },
    {
      header: "Balance",
      accessor: "balanceDue",
      sortable: false,
      cell: (row) => {
        const bal = Math.max((row.totalAmount || 0) - (row.paidAmount || 0), 0);
        return (
          <span className={`font-mono text-xs font-semibold ${bal > 0 ? "text-blue-600" : "text-slate-400"}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    {
      header: "Order",
      accessor: "status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status] || "neutral"}>{row.status || "draft"}</Badge>
      ),
    },
    {
      header: "Payment",
      accessor: "paymentStatus",
      cell: (row) => (
        <Badge variant={PAYMENT_VARIANTS[row.paymentStatus] || "neutral"}>
          {row.paymentStatus || "unpaid"}
        </Badge>
      ),
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) => {
        const balance = Math.max((row.totalAmount || 0) - (row.paidAmount || 0), 0);
        const canPay = row.status !== "draft" && row.status !== "cancelled" && balance > 0;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {row.status === "draft" && (
              <Link href={`/purchases/new?edit=${row.id}`}>
                <button
                  type="button"
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                  title="Edit draft"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </Link>
            )}
            {canPay && (
              <button
                type="button"
                onClick={() => setPayPurchase(row)}
                className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 cursor-pointer"
                title="Pay balance"
              >
                <Wallet className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push(`/purchases/${row.id}`)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 page-enter erp-purchases-page">
      <PageHeader
        module="purchases"
        title="Purchases"
        description="Draft, confirm, pay, and print supplier bills."
        icon={ShoppingCart}
        actions={
          <Link href="/purchases/new">
            <Button className="bg-acc-purchases hover:bg-blue-700 border-0 shadow-md shadow-blue-600/15 rounded-lg transition-all duration-200 active:scale-[0.99]">
              <Plus className="w-4 h-4" /> New Purchase
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard module="purchases" label="Total Orders" value={purchases.length} icon={FileText} />
        <StatCard module="purchases" label="Drafts" value={draftCount} icon={ShoppingCart} />
        <StatCard module="purchases" label="Confirmed" value={confirmedCount} icon={ShoppingCart} />
        <StatCard
          module="purchases"
          label="Outstanding"
          value={formatCurrency(balanceTotal)}
          icon={AlertCircle}
          valueClassName="text-blue-600 text-base sm:text-lg"
        />
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-slate-100/70 border border-slate-200/50 w-fit max-w-full">
        {[
          { key: "all", label: "All" },
          { key: "draft", label: "Drafts" },
          { key: "confirmed", label: "Confirmed" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`erp-filter-pill px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer min-h-[36px] border ${
              statusFilter === key
                ? "erp-filter-pill-active border-transparent"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-white hover:border-blue-200 hover:text-blue-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="erp-list-card">
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-purchases animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={purchases}
              searchKey="purchaseNumber"
              placeholder="Search PO number or vendor…"
              onRowClick={(row) => router.push(`/purchases/${row.id}`)}
            />
          )}
        </div>
      </div>

      <PurchasePayModal
        purchase={payPurchase}
        open={Boolean(payPurchase)}
        onClose={() => setPayPurchase(null)}
        onPaid={() => fetchPurchases()}
      />
    </div>
  );
}
