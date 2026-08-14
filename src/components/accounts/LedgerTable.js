"use client";

import React, { useEffect, useRef } from "react";
import { Inbox } from "lucide-react";

/**
 * Full ledger register — all rows on one page, scrolls to newest entry at bottom on load.
 */
export default function LedgerTable({
  columns = [],
  data = [],
  onRowClick = null,
  loading = false,
  maxHeight = "min(72vh, 720px)",
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (loading || data.length === 0) return;
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    };
    requestAnimationFrame(scrollToBottom);
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [data, loading]);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight }}
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider shadow-sm">
              {columns.map((col) => (
                <th
                  key={col.accessor}
                  className={`px-5 py-3.5 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id ?? rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-emerald-50/50" : "hover:bg-slate-50/80"
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.accessor}
                      className={`px-5 py-3.5 ${col.wrap === false ? "whitespace-nowrap" : ""} ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
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
                    <p className="text-sm font-semibold text-slate-500">No ledger entries</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div ref={bottomRef} className="h-px" aria-hidden />
      </div>
      {data.length > 0 && (
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700 tabular-nums">{data.length}</span> entries · newest at bottom
        </div>
      )}
    </div>
  );
}
