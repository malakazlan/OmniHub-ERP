"use client";

import React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const CATEGORY_LABELS = {
  shop: "Shop",
  company: "Company",
  farmer: "Farmer",
  transport: "Driver",
  salary: "Employee",
  general: "General",
};

function rankBarWidth(amount, max) {
  if (!max || max <= 0) return 0;
  return Math.max(8, Math.round((amount / max) * 100));
}

export default function DashboardPartyFlowList({
  title,
  subtitle,
  rows = [],
  total = 0,
  variant = "received",
  href = "/accounts/ledger",
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);
  const maxAmount = rows[0]?.amount || 0;
  const isReceived = variant === "received";

  const Icon = isReceived ? ArrowDownLeft : ArrowUpRight;

  return (
    <section className={`erp-dash-flow-panel${isReceived ? " is-received" : " is-paid"}`}>
      <div className="erp-dash-flow-head">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`erp-dash-flow-icon${isReceived ? " is-in" : " is-out"}`}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="erp-dash-flow-title">{title}</h3>
            <p className="erp-dash-flow-sub">{subtitle}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="erp-dash-flow-total-label">This week</p>
          <p className={`erp-dash-flow-total${isReceived ? " is-in" : " is-out"}`}>
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="erp-dash-flow-body">
        {rows.length === 0 ? (
          <p className="erp-dash-flow-empty">No {isReceived ? "receipts" : "payments"} recorded this week.</p>
        ) : (
          <ul className="erp-dash-flow-list">
            {visible.map((row, idx) => (
              <li key={row.accountId} className="erp-dash-flow-row">
                <div className="erp-dash-flow-row-top">
                  <span className="erp-dash-flow-rank">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="erp-dash-flow-name truncate">{row.name}</p>
                    <p className="erp-dash-flow-meta">
                      {CATEGORY_LABELS[row.category] || row.category}
                      {row.transactions > 1 ? ` · ${row.transactions} entries` : ""}
                    </p>
                  </div>
                  <span className={`erp-dash-flow-amount${isReceived ? " is-in" : " is-out"}`}>
                    {formatCurrency(row.amount)}
                  </span>
                </div>
                <div className="erp-dash-flow-bar-track">
                  <div
                    className={`erp-dash-flow-bar${isReceived ? " is-in" : " is-out"}`}
                    style={{ width: `${rankBarWidth(row.amount, maxAmount)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 5 && (
          <button
            type="button"
            className="erp-dash-flow-toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show top 5 only" : `Show all ${rows.length} accounts`}
          </button>
        )}
      </div>

      <div className="erp-dash-flow-foot">
        <Link href={href} className="erp-dash-link inline-flex items-center gap-1.5 text-xs">
          View ledger
        </Link>
      </div>
    </section>
  );
}
