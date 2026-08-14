"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { SaleInvoicePanel } from "@/components/documents/SaleInvoicePanel";
import {
  DollarSign,
  Plus,
  Loader2,
  Receipt,
  TrendingUp,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_VARIANTS = {
  draft: "neutral",
  confirmed: "info",
  dispatched: "warning",
  delivered: "success",
  cancelled: "danger",
};

const PAYMENT_VARIANTS = {
  unpaid: "danger",
  partial: "warning",
  paid: "success",
};

function SalesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  const openInvoice = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/sales/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoice");
      setInvoiceSale(data.sale);
      setInvoiceOpen(true);
    } catch (err) {
      showToast(err.message || "Could not open invoice", "error");
    }
  }, [showToast]);

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (res.ok) setSales(data.sales || []);
      else showToast(data.error || "Failed to load sales", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const invoiceId = searchParams.get("invoice");
    if (!invoiceId) return;
    openInvoice(invoiceId);
    router.replace("/sales", { scroll: false });
  }, [searchParams, openInvoice, router]);

  const totalAmount = sales.reduce((s, sale) => s + (sale.totalAmount || 0), 0);
  const confirmedCount = sales.filter((s) =>
    ["confirmed", "dispatched", "delivered"].includes(s.status)
  ).length;
  const unpaidCount = sales.filter(
    (s) => s.paymentStatus === "unpaid" || s.paymentStatus === "partial"
  ).length;

  const columns = [
    {
      header: "Invoice",
      accessor: "invoiceNumber",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-sales">{row.invoiceNumber}</span>
      ),
    },
    {
      header: "Customer",
      accessor: "customerName",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.customerName}</p>
          {row.shopId && <p className="text-[10px] text-slate-500">Shop</p>}
          {row.companyId && <p className="text-[10px] text-slate-500">Company</p>}
        </div>
      ),
    },
    {
      header: "Date",
      accessor: "saleDate",
      cell: (row) => <span className="text-xs text-slate-600">{formatDate(row.saleDate)}</span>,
    },
    {
      header: "Total",
      accessor: "totalAmount",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {formatCurrency(row.totalAmount)}
        </span>
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
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status] || "neutral"}>{row.status || "draft"}</Badge>
      ),
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) =>
        row.status !== "draft" && row.status !== "cancelled" ? (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openInvoice(row.id)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              title="View invoice"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 page-enter erp-sales-page">
      <PageHeader
        module="sales"
        title="Sales & invoices"
        description="Create invoices, confirm sales, and track receivables."
        icon={DollarSign}
        actions={
          <Link href="/sales/new">
            <Button className="bg-acc-sales hover:bg-green-700 border-0 shadow-md shadow-green-600/15 rounded-lg transition-all duration-200 active:scale-[0.99]">
              <Plus className="w-4 h-4" /> New sale
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard module="sales" label="Total invoices" value={sales.length} icon={Receipt} />
        <StatCard module="sales" label="Active orders" value={confirmedCount} icon={TrendingUp} />
        <StatCard module="sales" label="Total revenue" value={formatCurrency(totalAmount)} icon={DollarSign} />
        <StatCard
          module="sales"
          label="Outstanding"
          value={unpaidCount}
          icon={AlertCircle}
          valueClassName="text-amber-600"
        />
      </div>

      <div className="erp-list-card">
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-sales animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={sales}
              searchKey="invoiceNumber"
              placeholder="Search invoice or customer…"
              onRowClick={(row) => {
                if (row.status !== "draft" && row.status !== "cancelled") {
                  openInvoice(row.id);
                }
              }}
            />
          )}
        </div>
      </div>

      <SaleInvoicePanel
        sale={invoiceSale}
        company={companySettings}
        open={invoiceOpen}
        onClose={() => { setInvoiceOpen(false); setInvoiceSale(null); }}
      />
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acc-sales animate-spin" />
        </div>
      }
    >
      <SalesPageContent />
    </Suspense>
  );
}
