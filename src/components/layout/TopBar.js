"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import {
  NAV_SECTIONS,
  HEADER_QUICK_LINKS,
  flattenNavItems,
  isNavItemActive,
} from "@/lib/navigation";
import { LogOut, Menu, Bell, Search, X, Sun, Moon } from "lucide-react";
import { BrandMark } from "@/components/layout/Sidebar";

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function titleCase(segment = "") {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Breadcrumb derived from the nav tree: Section / Item / (tail segment) */
function useBreadcrumb(pathname) {
  return useMemo(() => {
    const items = flattenNavItems(NAV_SECTIONS);
    let best = null;
    for (const item of items) {
      if (isNavItemActive(pathname, item.href) && (!best || item.href.length > best.href.length)) best = item;
    }
    if (!best) {
      const segs = pathname.split("/").filter(Boolean);
      if (segs.length === 0) return [{ label: "Dashboard" }];
      return segs.map((s, i) => ({ label: titleCase(s), href: i < segs.length - 1 ? "/" + segs.slice(0, i + 1).join("/") : undefined }));
    }
    const crumbs = [];
    if (best.section && best.section !== "Overview") crumbs.push({ label: best.section });
    crumbs.push({ label: best.label, href: pathname !== best.href ? best.href : undefined });
    const rest = pathname.slice(best.href.length).split("/").filter(Boolean);
    if (rest.length > 0) {
      const tail = rest[rest.length - 1];
      const isId = /^\d+$/.test(tail) || /^[0-9a-f-]{16,}$/i.test(tail);
      crumbs.push({ label: isId ? "Detail" : titleCase(tail) });
    }
    return crumbs;
  }, [pathname]);
}

function Breadcrumb({ pathname }) {
  const crumbs = useBreadcrumb(pathname);
  return (
    <nav className="oh-crumb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="sep">/</span>}
            {last ? (
              <b className="truncate">{c.label}</b>
            ) : c.href ? (
              <Link href={c.href} className="truncate">{c.label}</Link>
            ) : (
              <span className="truncate">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function HeaderQuickNav({ hasModuleAccess }) {
  const pathname = usePathname();
  const links = HEADER_QUICK_LINKS.filter((link) => hasModuleAccess(link.slug));

  if (links.length === 0) return null;

  return (
    <nav className="erp-header-module-tabs hidden xl:inline-flex" aria-label="Quick modules">
      {links.map((link) => {
        const active = isNavItemActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            data-tone={link.tone || link.slug}
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

function SearchResults({ results, highlight, onPick, onHover, className = "" }) {
  return (
    <ul className={`erp-shell-search-dropdown ${className}`} role="listbox">
      {results.map((item, idx) => {
        const Icon = item.icon;
        return (
          <li key={item.href} role="option" aria-selected={idx === highlight}>
            <button
              type="button"
              onMouseEnter={() => onHover?.(idx)}
              onClick={() => onPick(item.href)}
              className={`oh-search-row ${idx === highlight ? "is-active" : ""}`}
            >
              <span className="erp-nav-icon">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{item.label}</span>
                <small className="truncate">{item.section}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ModuleSearchPanel({ hasModuleAccess, onNavigate, autoFocus }) {
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
    <div>
      <div className="oh-search max-w-none h-[38px]">
        <Search className="w-4 h-4 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
          onKeyDown={onKeyDown}
          placeholder="Search modules…"
          aria-label="Search modules"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setHighlight(0); }} className="text-[var(--ink-3)] hover:text-[var(--ink)] p-0.5 cursor-pointer" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {results.length > 0 ? (
        <SearchResults results={results} highlight={highlight} onPick={go} className="mt-2 max-h-[min(50vh,320px)] overflow-y-auto erp-sidebar-scroll py-1" />
      ) : (
        query && <p className="px-1 py-3 text-xs text-[var(--ink-3)]">No modules match.</p>
      )}
    </div>
  );
}

function DesktopModuleSearch({ hasModuleAccess }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [isMac] = useState(() => {
    try {
      return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    } catch {
      return false;
    }
  });
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
    <div ref={wrapRef} className="relative hidden md:block flex-1 max-w-[320px] min-w-[160px]">
      <div className="oh-search">
        <Search className="w-3.5 h-3.5 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); setOpen(true); }}
          onFocus={() => { setHighlight(0); setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search customers, invoices, items…"
          aria-label="Search modules"
          autoComplete="off"
        />
        <kbd className="hidden lg:inline-block">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </div>
      {open && results.length > 0 && (
        <SearchResults
          results={results}
          highlight={highlight}
          onPick={go}
          onHover={setHighlight}
          className="absolute left-0 w-full min-w-[280px] top-[calc(100%+6px)] z-50 py-1.5 max-h-72 overflow-y-auto erp-sidebar-scroll"
        />
      )}
    </div>
  );
}

export default function TopBar({ onMenuClick }) {
  const { user, logout, hasModuleAccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileSearch, setMobileSearch] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !typing;
      if (!cmdK && !slash) return;
      e.preventDefault();
      if (window.matchMedia("(min-width: 768px)").matches) {
        document.querySelector('input[aria-label="Search modules"]')?.focus();
      } else {
        setMobileSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const roleLabel = user?.role ? user.role.replace(/_/g, " ") : "";

  return (
    <>
      <header className="erp-shell-header no-print z-20 shrink-0">
        <div className="erp-shell-header-inner">
          <button
            onClick={onMenuClick}
            className="lg:hidden oh-icon-btn -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden min-w-0" aria-label="Omni Hub">
            <BrandMark />
          </Link>

          <div className="hidden sm:flex min-w-0 flex-1 items-center gap-3">
            <Breadcrumb pathname={pathname} />
          </div>

          <HeaderQuickNav hasModuleAccess={hasModuleAccess} />
          <DesktopModuleSearch hasModuleAccess={hasModuleAccess} />

          <button
            type="button"
            onClick={() => setMobileSearch(true)}
            className="md:hidden oh-icon-btn ml-auto"
            aria-label="Search modules"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="relative oh-icon-btn" aria-label="Notifications" title="Notifications">
              <Bell className="w-[15px] h-[15px]" strokeWidth={1.75} />
              <span className="oh-badge-dot" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="oh-icon-btn"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-[15px] h-[15px]" strokeWidth={1.75} /> : <Moon className="w-[15px] h-[15px]" strokeWidth={1.75} />}
            </button>

            <div className="oh-me">
              <span className="oh-avatar" aria-hidden>{initials(user?.name)}</span>
              <span className="hidden sm:block min-w-0 leading-tight">
                <span className="block truncate max-w-[140px] font-medium">{user?.name}</span>
                <small className="truncate">{roleLabel}</small>
              </span>
            </div>

            <button onClick={logout} className="oh-icon-btn is-danger" aria-label="Sign out" title="Sign out">
              <LogOut className="w-[15px] h-[15px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {mobileSearch && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--surface)] p-4 pt-3 safe-area-pb">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--ink)]">Search modules</span>
            <button type="button" onClick={() => setMobileSearch(false)} className="oh-icon-btn" aria-label="Close search">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ModuleSearchPanel hasModuleAccess={hasModuleAccess} onNavigate={() => setMobileSearch(false)} autoFocus />
        </div>
      )}
    </>
  );
}
