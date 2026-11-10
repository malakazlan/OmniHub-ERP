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
  const [mounted] = useState(() => typeof document !== "undefined");
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

  // Keep the typed query in step with the selected value (adjust-state-on-prop-change pattern).
  const syncKey = `${valueId}|${selectedLabel}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncedKey !== syncKey) {
    setSyncedKey(syncKey);
    if (!valueId) setQuery("");
    else if (selectedLabel) setQuery(selectedLabel);
  }

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
            className="erp-shell-search-dropdown overflow-auto text-[13px] py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-[var(--ink-3)] text-xs text-center">{emptyMessage}</li>
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
                      className={`oh-search-row ${active ? "is-active font-medium" : ""}`}
                    >
                      <span className="flex-1 min-w-0">{renderOption ? renderOption(o) : getOptionLabel(o)}</span>
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
        <p className={`text-[12px] font-medium text-[var(--ink-2)] mb-1.5 ${labelClassName}`}>
          {label}
        </p>
      )}
      <div className={`search-picker-field flex items-stretch w-full ${fieldClassName}`}>
        <span
          className="flex shrink-0 items-center justify-center w-9 text-[var(--ink-3)] pointer-events-none"
          aria-hidden
        >
          <Search className="w-3.5 h-3.5" strokeWidth={2} />
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
          className="flex-1 min-w-0 border-0 bg-transparent py-0 pr-3 pl-0 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
          autoComplete="off"
        />
      </div>
      {dropdown}
    </div>
  );
}
