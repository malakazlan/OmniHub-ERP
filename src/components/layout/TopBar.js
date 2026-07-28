"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { NAV_SECTIONS, flattenNavItems } from "@/lib/navigation";
import { LogOut, Menu, User, Bell, Search, X, Wheat } from "lucide-react";

function useModuleSearchItems(hasModuleAccess) {
  return useMemo(() => {
    const sections = NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((i) => hasModuleAccess(i.slug)),
    })).filter((s) => s.items.length > 0);
    return flattenNavItems(sections);
  }, [hasModuleAccess]);
}

function ModuleSearchPanel({ hasModuleAccess, onNavigate, autoFocus, className = "" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const allItems = useModuleSearchItems(hasModuleAccess);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 8);
    return allItems.filter((item) => {
      const hay = `${item.label} ${item.section} ${item.keywords || ""}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 12);
  }, [query, allItems]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const go = (href) => {
    setQuery("");
    onNavigate?.();
    router.push(href);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlight]) {
      e.preventDefault();
      go(results[highlight].href);
    } else if (e.key === "Escape") {
      onNavigate?.();
    }
  };

  return (
    <div className={className}>
      <div className="erp-shell-search flex items-center gap-2 px-3.5 py-2.5 rounded-xl erp-shell-search-focus">
        <Search className="w-4 h-4 shrink-0 text-emerald-400/80" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search modules…"
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          aria-label="Search modules"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-slate-500 hover:text-slate-200 p-0.5 cursor-pointer" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <ul className="mt-2 max-h-[min(50vh,320px)] overflow-y-auto erp-sidebar-scroll rounded-xl border border-white/10 bg-black/20">
        {results.map((item, idx) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => go(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-colors cursor-pointer ${
                  idx === highlight ? "bg-emerald-500/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{item.label}</span>
                  <span className="block text-[10px] text-slate-500 truncate">{item.section}</span>
                </span>
              </button>
            </li>
          );
        })}
        {query && results.length === 0 && (
          <li className="px-4 py-3 text-xs text-slate-500">No modules match.</li>
        )}
      </ul>
    </div>
  );
}

function DesktopModuleSearch({ hasModuleAccess }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const allItems = useModuleSearchItems(hasModuleAccess);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 8);
    return allItems.filter((item) => {
      const hay = `${item.label} ${item.section} ${item.keywords || ""}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 10);
  }, [query, allItems]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const go = (href) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const onKeyDown = (e) => {
    if (!open && e.key !== "Escape") setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlight]) {
      e.preventDefault();
      go(results[highlight].href);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapRef} className="hidden md:block relative flex-1 max-w-lg mx-auto min-w-0">
      <div className={`erp-shell-search flex items-center gap-2 px-3.5 py-2 rounded-full transition-all duration-200 ${open ? "erp-shell-search-focus" : ""}`}>
        <Search className="w-4 h-4 shrink-0 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search modules…"
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          aria-label="Search modules"
          autoComplete="off"
        />
        <kbd className="hidden lg:inline text-[9px] font-mono text-slate-500 border border-white/10 rounded-md px-1.5 py-0.5">/</kbd>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-white/10 bg-[#1a2530] shadow-2xl py-2 max-h-72 overflow-y-auto erp-sidebar-scroll">
          {results.map((item, idx) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => go(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                    idx === highlight ? "bg-emerald-500/15 text-white" : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{item.label}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{item.section}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function TopBar({ onMenuClick }) {
  const { user, logout, hasModuleAccess } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);

  useEffect(() => {
    const onSlash = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) {
          document.querySelector('input[aria-label="Search modules"]')?.focus();
        } else {
          setMobileSearch(true);
        }
      }
    };
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  const roleLabel = user?.role ? user.role.replace(/_/g, " ") : "";

  return (
    <>
      <header className="erp-shell-header no-print min-h-[3.25rem] py-2 px-3 sm:px-5 flex flex-wrap items-center gap-2 sm:gap-3 z-20 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-400 hover:text-white p-2.5 -ml-1 rounded-xl hover:bg-white/10 focus:outline-none cursor-pointer shrink-0 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Wheat className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-white truncate max-w-[120px] sm:max-w-none">Metro Feeds</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-300 truncate">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </p>
        </div>

        <DesktopModuleSearch hasModuleAccess={hasModuleAccess} />

        <button
          type="button"
          onClick={() => setMobileSearch(true)}
          className="md:hidden ml-auto p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Search modules"
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-0.5 sm:gap-1 md:ml-auto shrink-0">
          <button type="button" className="relative text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer" aria-label="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-[#1a2530]" />
          </button>

          <div className="h-6 w-px bg-white/10 hidden sm:block mx-0.5" />

          <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-sm font-semibold text-slate-100 leading-tight truncate max-w-[120px] lg:max-w-[140px]">{user?.name}</span>
              <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">{roleLabel}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
          </div>

          <button onClick={logout} className="text-slate-400 hover:text-rose-400 p-2.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer" aria-label="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {mobileSearch && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[#141c24]/95 backdrop-blur-sm p-4 pt-3 safe-area-pb">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Search modules</span>
            <button type="button" onClick={() => setMobileSearch(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer" aria-label="Close search">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ModuleSearchPanel hasModuleAccess={hasModuleAccess} onNavigate={() => setMobileSearch(false)} autoFocus />
        </div>
      )}
    </>
  );
}
