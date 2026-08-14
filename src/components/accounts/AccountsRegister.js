"use client";

import React from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { DirectoryAdminActions } from "@/components/accounts/DirectoryAdminActions";

export default function AccountsRegister({
  rows = [],
  loading = false,
  showCategory = true,
  showActions = false,
  categoryLabels = {},
  onRowClick,
  onEdit,
  onDelete,
  totalBalance = 0,
}) {
  return (
    <>
      <div className="erp-accounts-grid-wrap">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="erp-ledger-empty">
              <BookOpen className="w-9 h-9 text-teal-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No accounts match your filters</p>
            </div>
          ) : (
            <table className="erp-ledger-grid erp-ac-grid">
              <colgroup>
                <col style={{ width: "2.5%" }} />
                <col style={{ width: showCategory ? "22%" : "26%" }} />
                <col style={{ width: "7%" }} />
                {showCategory && <col style={{ width: "10%" }} />}
                <col style={{ width: "10%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "7%" }} />
                {showActions && <col style={{ width: "14%" }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num erp-ac-th">#</th>
                  <th className="erp-lg-th erp-ac-th">Account name</th>
                  <th className="erp-lg-th erp-ac-th">Code</th>
                  {showCategory && <th className="erp-lg-th erp-ac-th">Category</th>}
                  <th className="erp-lg-th erp-ac-th">Phone</th>
                  <th className="erp-lg-th erp-ac-th">City</th>
                  <th className="erp-lg-th erp-lg-th-money erp-ac-th">Balance</th>
                  <th className="erp-lg-th erp-ac-th erp-ac-th-center">Status</th>
                  {showActions && <th className="erp-lg-th erp-ac-th erp-ac-th-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const displayName = row.party?.name || row.name;
                  const subtitle = row.party?.subtitle
                    ? row.party.kind === "company"
                      ? `Contact: ${row.party.subtitle}`
                      : row.party.subtitle
                    : null;

                  return (
                    <tr
                      key={row.id}
                      className="erp-lg-row erp-ac-row is-clickable"
                      onClick={() => onRowClick?.(row)}
                    >
                      <td className="erp-lg-td erp-lg-td-num">{idx + 1}</td>
                      <td className="erp-lg-td erp-ac-td-name">
                        <span className="erp-lg-account-name">{displayName}</span>
                        {subtitle && <span className="erp-lg-account-meta">{subtitle}</span>}
                      </td>
                      <td className="erp-lg-td erp-ac-td-code">
                        {row.code || "—"}
                      </td>
                      {showCategory && (
                        <td className="erp-lg-td">
                          <span className="erp-ac-category-pill" data-cat={row.category}>
                            {categoryLabels[row.category] || row.category}
                          </span>
                        </td>
                      )}
                      <td className="erp-lg-td erp-ac-td-phone">
                        {row.party?.phone || row.phone || "—"}
                      </td>
                      <td className="erp-lg-td erp-ac-td-city">{row.party?.city || row.city || "—"}</td>
                      <td
                        className={`erp-lg-td erp-lg-td-money erp-lg-balance ${
                          row.balance >= 0 ? "erp-ac-balance-pos" : "erp-ac-balance-neg"
                        }`}
                      >
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="erp-lg-td erp-ac-td-center">
                        <span
                          className={`erp-ac-status ${row.isActive ? "is-active" : "is-inactive"}`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {showActions && (
                        <td className="erp-lg-td erp-ac-td-actions">
                          <DirectoryAdminActions
                            onEdit={() => onEdit?.(row)}
                            onDelete={() => onDelete?.(row)}
                            onView={() => onRowClick?.(row)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="erp-lg-foot erp-ac-foot">
                  <td
                    colSpan={showCategory ? 6 : 5}
                    className="erp-lg-td erp-lg-td-total-label"
                  >
                    {rows.length} account{rows.length === 1 ? "" : "s"}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money erp-lg-balance">
                    {formatCurrency(totalBalance)}
                  </td>
                  <td colSpan={showActions ? 2 : 1} className="erp-lg-td" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <div className="erp-ac-grid-footer">
          <span>
            Showing <strong className="tabular-nums">{rows.length}</strong> accounts · click a row to open in general ledger
          </span>
        </div>
      )}
    </>
  );
}
