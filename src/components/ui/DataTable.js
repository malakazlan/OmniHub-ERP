"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, Search, Inbox } from "lucide-react";

const alignClass = (align) => (align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left");

export function DataTable({
  columns = [],
  data = [],
  searchKey = "",
  placeholder = "Search records...",
  onRowClick = null,
  footer = null,
  rowsPerPage = 10,
  dense = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredData = data.filter((row) => {
    if (!searchKey || !searchQuery) return true;
    const value = row[searchKey];
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];
    if (typeof valA === "number" && typeof valB === "number") {
      return sortConfig.direction === "asc" ? valA - valB : valB - valA;
    }
    const strA = String(valA ?? "").toLowerCase();
    const strB = String(valB ?? "").toLowerCase();
    if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
    if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const cellPad = dense ? "px-3 py-1.5" : "px-3 py-[9px]";

  return (
    <div className="space-y-3">
      {searchKey && (
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--ink-3)]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field !pl-9"
          />
        </div>
      )}

      <div className="oh-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="oh-table w-full text-left border-collapse text-[13px]">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.accessor}
                    onClick={() => col.sortable !== false && handleSort(col.accessor)}
                    style={col.width ? { width: col.width } : undefined}
                    className={`${cellPad} select-none ${alignClass(col.align)} ${col.sortable !== false ? "cursor-pointer hover:!text-[var(--ink)]" : ""}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "flex-row-reverse" : ""}`}>
                      {col.header}
                      {sortConfig.key === col.accessor && (
                        sortConfig.direction === "asc"
                          ? <ChevronUp className="w-3.5 h-3.5 text-[var(--brand)]" />
                          : <ChevronDown className="w-3.5 h-3.5 text-[var(--brand)]" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[var(--ink)]">
              {currentRows.length > 0 ? (
                currentRows.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`border-b border-[var(--line)] last:border-b-0 transition-colors hover:bg-[var(--surface-2)] ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.accessor}
                        className={`${cellPad} ${col.wrap === false ? "whitespace-nowrap" : ""} ${alignClass(col.align)} ${
                          col.align === "right" || col.numeric ? "num" : ""
                        } ${col.muted ? "text-[var(--ink-3)]" : ""} ${col.cellClassName || ""}`}
                      >
                        {col.cell ? col.cell(row) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-14">
                    <div className="flex flex-col items-center justify-center text-center space-y-1.5">
                      <Inbox className="w-9 h-9 text-[var(--line-strong)]" />
                      <p className="text-sm font-medium text-[var(--ink-2)]">No records found</p>
                      <p className="text-xs text-[var(--ink-3)]">Try adjusting your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {footer && (
              <tfoot>
                <tr>
                  {columns.map((col) => (
                    <td key={col.accessor} className={`${cellPad} ${alignClass(col.align)} ${col.align === "right" ? "num" : ""}`}>
                      {typeof footer === "function" ? footer(col, sortedData) : footer[col.accessor] ?? ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-[var(--line)] text-[12.5px] text-[var(--ink-3)]">
            <p>
              Showing <b className="num text-[var(--ink)] font-medium">{indexOfFirstRow + 1}</b>–
              <b className="num text-[var(--ink)] font-medium">{Math.min(indexOfLastRow, sortedData.length)}</b> of{" "}
              <b className="num text-[var(--ink)] font-medium">{sortedData.length}</b>
            </p>
            <div className="flex items-center gap-2">
              <span className="num">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="btn !h-7 !px-2.5 text-xs"
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn !h-7 !px-2.5 text-xs"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
