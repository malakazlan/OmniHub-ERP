"use client";

import React from "react";
import { VISIBLE_MODULES, MODULE_ACCENTS } from "@/lib/constants";

export default function ModuleAccessTabs({ selected, onChange, disabled = false }) {
  const toggle = (slug) => {
    if (disabled) return;
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  };

  const selectAll = () => onChange([...VISIBLE_MODULES]);
  const clearAll = () => onChange(["dashboard"]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Module access
        </p>
        {!disabled && (
          <div className="flex gap-2 text-[10px]">
            <button type="button" className="text-acc-settings hover:underline" onClick={selectAll}>
              All
            </button>
            <button type="button" className="text-slate-500 hover:underline" onClick={clearAll}>
              Reset
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Allowed modules">
        {VISIBLE_MODULES.map((slug) => {
          const active = selected.includes(slug);
          const label = MODULE_ACCENTS[slug]?.label || slug;
          return (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => toggle(slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                active
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500">
        Tabs control which sidebar sections this login can open. Admins always have full access.
      </p>
    </div>
  );
}
