"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { NAV_SECTIONS, NAV_THEME, isNavItemActive } from "@/lib/navigation";
import { ordersHomePath, mustScopeOrdersToSelf } from "@/lib/ordersNav";
import {
  X, ChevronLeft, ChevronRight, ChevronDown, Wheat, Circle,
} from "lucide-react";

const SIDEBAR_STORAGE_KEY = "metrofeeds-sidebar-collapsed";

/** Sections that start expanded when they contain the active route */
function sectionHasActive(pathname, items) {
  return items.some((item) => isNavItemActive(pathname, item.href));
}

function NavItem({ item, isActive, collapsed, onClick }) {
  const theme = NAV_THEME[item.slug] || NAV_THEME.settings;
  const Icon = item.icon;
  const href = item.href;

  if (collapsed) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        title={item.label}
        style={{ "--nav-accent": theme.accent }}
        className={`group/nav relative erp-nav-item justify-center px-2 py-2.5 ${isActive ? "erp-nav-item-active" : ""}`}
      >
        <span className={`erp-nav-icon ${isActive ? theme.active : theme.inactive}`}>
          <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.25 : 2} />
        </span>
        <span
          className="erp-nav-tooltip pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-xl erp-shell-tooltip px-3 py-2 text-xs font-semibold"
          role="tooltip"
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      style={{ "--nav-accent": theme.accent }}
      className={`group/nav erp-nav-item ${isActive ? "erp-nav-item-active" : ""}`}
    >
      <span className={`erp-nav-icon ${isActive ? theme.active : theme.inactive}`}>
        <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.25 : 2} />
      </span>
      <span className="flex-1 truncate leading-snug">{item.label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: theme.accent }} aria-hidden />
      )}
    </Link>
  );
}

function NavSectionBlock({ section, collapsed, pathname, onClose, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasActive = sectionHasActive(pathname, section.items);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  if (collapsed) {
    return (
      <div className="px-1.5 mb-2 space-y-0.5">
        {section.items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href)}
            collapsed
            onClick={onClose}
          />
        ))}
        <div className="mx-2 my-2 border-t border-white/10" aria-hidden />
      </div>
    );
  }

  const singleItem = section.items.length === 1 && section.title === "Overview";

  if (singleItem) {
    const item = section.items[0];
    return (
      <div className="erp-nav-group mx-2.5 mb-2.5">
        <div className="px-2 pt-1 pb-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--shell-muted)] px-1">
            {section.title}
          </p>
        </div>
        <NavItem
          item={item}
          isActive={isNavItemActive(pathname, item.href)}
          collapsed={false}
          onClick={onClose}
        />
      </div>
    );
  }

  return (
    <div className="erp-nav-group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="erp-nav-group-header cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Circle className="w-1.5 h-1.5 fill-emerald-500/70 text-emerald-500/70" />
          {section.title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 erp-nav-chevron ${open ? "erp-nav-chevron-open" : ""}`} />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60"}`}
      >
        <div className="overflow-hidden min-h-0 px-0.5 pb-1">
          {section.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isNavItemActive(pathname, item.href)}
              collapsed={false}
              onClick={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarToggle({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="erp-sidebar-toggle hidden lg:flex absolute -right-3.5 top-[5.5rem] z-30 h-8 w-8 items-center justify-center rounded-full border border-emerald-500/30 bg-[#1e2a36] text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-400 active:scale-95 cursor-pointer shadow-lg shadow-black/30"
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2.5} /> : <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}

function SidebarBrand({ collapsed }) {
  if (collapsed) {
    return (
      <Link href="/dashboard" className="hidden lg:flex justify-center py-4 mx-auto" title="Metro Feeds">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-700/20">
          <Wheat className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
      </Link>
    );
  }

  return (
    <Link href="/dashboard" className="erp-shell-brand-card hidden lg:block mx-3 mt-3 mb-1 transition-transform hover:scale-[1.01]">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-700/25 shrink-0">
          <Wheat className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base text-white tracking-tight leading-tight">Metro Feeds</p>
          <p className="text-[11px] text-emerald-400/80 font-medium mt-0.5">Feed trading & ERP</p>
        </div>
      </div>
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { hasModuleAccess, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const filteredSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items
          .filter((item) => hasModuleAccess(item.slug))
          .map((item) => {
            if (item.slug !== "orders") return item;
            return {
              ...item,
              href: ordersHomePath(user),
              label: mustScopeOrdersToSelf(user) ? "My orders" : "Order queue",
            };
          }),
      })).filter((section) => section.items.length > 0),
    [hasModuleAccess, user]
  );

  const defaultOpenFor = (section) =>
    section.title === "Overview" || sectionHasActive(pathname, section.items);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 erp-shell-overlay z-30 lg:hidden" onClick={onClose} />
      )}

      <div className="relative flex shrink-0 lg:overflow-visible no-print">
        <aside
          className={`erp-sidebar-panel erp-shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(288px,88vw)] max-w-[288px] transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen lg:shrink-0 lg:max-w-none safe-area-pb ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "lg:w-[84px]" : "lg:w-[288px]"}`}
        >
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--shell-border)]">
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                <Wheat className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-sm text-white block truncate">Metro Feeds</span>
                <span className="text-[10px] text-emerald-400/80">Menu</span>
              </div>
            </Link>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          <SidebarBrand collapsed={collapsed} />

          <nav className={`flex-1 overflow-y-auto py-2 erp-sidebar-scroll scroll-smooth ${collapsed ? "pt-1" : ""}`}>
            {filteredSections.map((section) => (
              <NavSectionBlock
                key={section.title}
                section={section}
                collapsed={collapsed}
                pathname={pathname}
                onClose={onClose}
                defaultOpen={defaultOpenFor(section)}
              />
            ))}
          </nav>

          <div className={`shrink-0 transition-all duration-300 ${collapsed ? "p-2 pb-3" : "px-3 pb-4 pt-1"}`}>
            <div
              className={`flex items-center rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm ${
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
              }`}
            >
              <div className="rounded-xl flex items-center justify-center text-[10px] font-bold text-white shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-700">
                MF
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-100 truncate">Enterprise edition</p>
                  <p className="text-[10px] text-emerald-400/90 flex items-center gap-1.5 mt-0.5 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Connected
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>
    </>
  );
}
