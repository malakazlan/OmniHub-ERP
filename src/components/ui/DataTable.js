"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, Search, Inbox } from "lucide-react";

export function DataTable({
  columns = [],
  data = [],
  searchKey = "",
  placeholder = "Search records...",
  onRowClick = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

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

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
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
            className="w-full pl-9 pr-4 py-2.5 input-field text-xs"
          />
        </div>
      )}

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {columns.map((col) => (
                  <th
                    key={col.accessor}
                    onClick={() => col.sortable !== false && handleSort(col.accessor)}
                    className={`px-5 py-3.5 select-none ${
                      col.sortable !== false ? "cursor-pointer hover:bg-slate-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {sortConfig.key === col.accessor && (
                        sortConfig.direction === "asc"
                          ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {currentRows.length > 0 ? (
                currentRows.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer hover:bg-emerald-50/50" : "hover:bg-slate-50/80"
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.accessor} className="px-5 py-3.5 whitespace-nowrap">
                        {col.cell ? col.cell(row) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-14">
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <Inbox className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">No records found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <p>
            Showing <span className="font-semibold text-slate-800">{indexOfFirstRow + 1}</span>–
            <span className="font-semibold text-slate-800">{Math.min(indexOfLastRow, sortedData.length)}</span> of{" "}
            <span className="font-semibold text-slate-800">{sortedData.length}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
