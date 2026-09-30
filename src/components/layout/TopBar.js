"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import {
  NAV_SECTIONS,
  NAV_THEME,
  HEADER_QUICK_LINKS,
  flattenNavItems,
  isNavItemActive,
} from "@/lib/navigation";
import { LogOut, Menu, User, Bell, Search, X, Wheat } from "lucide-react";

function HeaderQuickNav({ hasModuleAccess }) {
  const pathname = usePathname();
  const links = HEADER_QUICK_LINKS.filter((link) => hasModuleAccess(link.slug));

  if (links.length === 0) return null;

  return (
    <nav className="erp-header-module-tabs" aria-label="Quick modules">
      {links.map((link) => {
        const active = isNavItemActive(pathname, link.href);
        const tone = link.tone || link.slug;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            data-tone={tone}
            className={`erp-header-module-tab${active ? " is-active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
        <Search className="w-4 h-4 shrink-0 text-[var(--brand-primary)]/80" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search modules…"
          className="erp-shell-search-input flex-1 min-w-0 bg-transparent text-sm outline-none"
          aria-label="Search modules"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <ul className="erp-shell-search-dropdown mt-2 max-h-[min(50vh,320px)] overflow-y-auto erp-sidebar-scroll rounded-xl py-1">
        {results.map((item, idx) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => go(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-colors cursor-pointer ${
                  idx === highlight ? "bg-blue-50 text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-slate-50"
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-blue-50 text-[var(--brand-primary)] ring-1 ring-blue-100 flex items-center justify-center shrink-0">
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
    <div ref={wrapRef} className="erp-shell-header-search hidden md:block">
      <div className={`erp-shell-search erp-shell-search-compact flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${open ? "erp-shell-search-focus" : ""}`}>
        <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          className="erp-shell-search-input flex-1 min-w-0 bg-transparent text-xs outline-none"
          aria-label="Search modules"
          autoComplete="off"
        />
        <kbd className="hidden xl:inline text-[9px] font-mono text-slate-400 border border-slate-200 rounded px-1 py-px bg-white/90 leading-none">/</kbd>
      </div>
      {open && results.length > 0 && (
        <ul className="erp-shell-search-dropdown absolute left-0 w-[min(100%,280px)] top-[calc(100%+6px)] z-50 rounded-xl py-2 max-h-72 overflow-y-auto erp-sidebar-scroll">
          {results.map((item, idx) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => go(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                    idx === highlight ? "bg-blue-50 text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-slate-50"
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-[var(--brand-primary)] ring-1 ring-blue-100 flex items-center justify-center shrink-0">
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
      <header className="erp-shell-header no-print z-20 shrink-0">
        <div className="erp-shell-header-inner">
        <div className="erp-shell-header-start">
          <button
            onClick={onMenuClick}
            className="lg:hidden erp-shell-btn-icon -ml-1 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] flex items-center justify-center shrink-0 shadow-sm">
              <Wheat className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-[var(--text-primary)] truncate max-w-[100px] sm:max-w-[140px]">Warraich Traders</span>
          </div>
        </div>

        <div className="erp-shell-header-center">
          <HeaderQuickNav hasModuleAccess={hasModuleAccess} />
          <DesktopModuleSearch hasModuleAccess={hasModuleAccess} />
        </div>

        <button
          type="button"
          onClick={() => setMobileSearch(true)}
          className="md:hidden erp-shell-btn-icon shrink-0"
          aria-label="Search modules"
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="erp-shell-header-end">
          <button type="button" className="relative erp-shell-btn-icon" aria-label="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#0F52BA] ring-2 ring-white" />
          </button>

          <div className="h-6 w-px bg-[var(--border-clean)] hidden sm:block mx-0.5" />

          <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[120px] lg:max-w-[140px]">{user?.name}</span>
              <span className="text-[10px] text-[var(--brand-primary)] font-medium uppercase tracking-wide">{roleLabel}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[var(--brand-primary)] shrink-0">
              <User className="w-4 h-4" />
            </div>
          </div>

          <button onClick={logout} className="erp-shell-btn-icon hover:!text-rose-500 hover:!bg-rose-50" aria-label="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        </div>
      </header>

      {mobileSearch && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--bg-surface)]/98 backdrop-blur-md p-4 pt-3 safe-area-pb border-t border-[var(--border-clean)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Search modules</span>
            <button type="button" onClick={() => setMobileSearch(false)} className="erp-shell-btn-icon" aria-label="Close search">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ModuleSearchPanel hasModuleAccess={hasModuleAccess} onNavigate={() => setMobileSearch(false)} autoFocus />
        </div>
      )}
    </>
  );
}
