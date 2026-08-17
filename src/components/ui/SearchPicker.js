"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

export default function SearchPicker({
  label,
  placeholder = "Search…",
  options = [],
  value,
  onChange,
  getOptionValue = (o) => String(o.id),
  getOptionLabel = (o) => o.name || "",
  renderOption,
  emptyMessage = "No matches",
  hideLabel = false,
  labelClassName = "",
  fieldClassName = "",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const valueId = value == null || value === "" ? "" : String(value);

  const selectedLabel = useMemo(() => {
    if (!valueId) return "";
    const match = options.find((o) => getOptionValue(o) === valueId);
    return match ? getOptionLabel(match) : "";
  }, [valueId, options, getOptionValue, getOptionLabel]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!valueId) {
      setQuery("");
    } else if (selectedLabel) {
      setQuery(selectedLabel);
    }
  }, [valueId, selectedLabel]);

  const updateMenuRect = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxHeight = 280;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);

    setMenuRect({
      left: r.left,
      width: r.width,
      top: openUp ? r.top - height - 4 : r.bottom + 4,
      maxHeight: height,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuRect();
    window.addEventListener("scroll", updateMenuRect, true);
    window.addEventListener("resize", updateMenuRect);
    return () => {
      window.removeEventListener("scroll", updateMenuRect, true);
      window.removeEventListener("resize", updateMenuRect);
    };
  }, [open, updateMenuRect, query]);

  useEffect(() => {
    function onDocClick(e) {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => {
        const lbl = getOptionLabel(o).toLowerCase();
        const extra = (o.phone || o.sku || o.city || "").toString().toLowerCase();
        return lbl.includes(q) || extra.includes(q);
      })
      .slice(0, 50);
  }, [options, query, getOptionLabel]);

  const dropdown =
    open && menuRect && mounted
      ? createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: "fixed",
              left: menuRect.left,
              top: menuRect.top,
              width: menuRect.width,
              maxHeight: menuRect.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40 text-sm ring-1 ring-slate-100"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-slate-400 text-xs text-center">{emptyMessage}</li>
            ) : (
              filtered.map((o) => {
                const id = getOptionValue(o);
                const active = id === String(value);
                return (
                  <li key={id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(id);
                        setQuery(getOptionLabel(o));
                        setOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                        active ? "bg-sky-50 font-semibold text-sky-900" : "text-slate-800"
                      }`}
                    >
                      {renderOption ? renderOption(o) : getOptionLabel(o)}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} className="relative">
      {label && !hideLabel && (
        <p className={`text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 ${labelClassName}`}>
          {label}
        </p>
      )}
      <div
        className={`search-picker-field flex items-stretch w-full min-h-[38px] rounded-lg border border-[#e2e8f0] bg-white transition-[border-color,box-shadow] focus-within:border-[#059669] focus-within:shadow-[0_0_0_2px_rgba(5,150,105,0.12)] ${fieldClassName}`}
      >
        <span
          className="flex shrink-0 items-center justify-center w-10 text-slate-400 pointer-events-none"
          aria-hidden
        >
          <Search className="w-4 h-4" strokeWidth={2} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange("");
          }}
          onFocus={() => {
            setOpen(true);
            updateMenuRect();
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 border-0 bg-transparent py-2.5 pr-3 pl-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          autoComplete="off"
        />
      </div>
      {dropdown}
    </div>
  );
}
