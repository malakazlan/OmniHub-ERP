"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { NAV_SECTIONS, NAV_THEME, isNavItemActive } from "@/lib/navigation";
import { ordersHomePath, mustScopeOrdersToSelf } from "@/lib/ordersNav";
import {
  X, ChevronLeft, ChevronRight, Wheat,
} from "lucide-react";

const SIDEBAR_STORAGE_KEY = "warraichtraders-sidebar-collapsed";

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
        className={`group/nav relative erp-nav-item justify-center px-2 py-3 ${
          isActive ? "erp-nav-item-active" : ""
        }`}
      >
        <span className={`erp-nav-icon ${isActive ? theme.active : theme.inactive}`}>
          <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.9} />
        </span>
        <span
          className="erp-nav-tooltip pointer-events-none absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold"
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
        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.9} />
      </span>
      <span className="flex-1 truncate leading-snug tracking-tight text-[15px] font-medium">{item.label}</span>
      {isActive && (
        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_var(--nav-accent)]"
          style={{ background: theme.accent }}
          aria-hidden
        />
      )}
    </Link>
  );
}

function NavSectionBlock({ section, collapsed, pathname, onClose }) {
  if (collapsed) {
    return (
      <div className="px-1.5 mb-2.5 space-y-1">
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

  return (
    <div className="erp-nav-group mb-2.5">
      <div className="px-2 pt-1 pb-1.5">
        <p className="text-[12px] font-bold uppercase tracking-wider text-slate-300 px-1">
          {section.title}
        </p>
      </div>
      <div className="erp-nav-sub-tree space-y-0.5 px-1">
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
  );
}

function SidebarToggle({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="erp-sidebar-toggle hidden lg:flex absolute -right-3.5 top-[4.25rem] z-50 h-8 w-8 items-center justify-center rounded-full active:scale-95 cursor-pointer"
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
      )}
    </button>
  );
}

function SidebarBrand({ collapsed }) {
  if (collapsed) {
    return (
      <Link href="/dashboard" className="hidden lg:flex justify-center py-4 mx-auto" title="Warraich Traders">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F52BA] via-[#1E64D4] to-[#0B3E8F] flex items-center justify-center shadow-lg shadow-blue-950/40 border border-white/20 hover:scale-105 transition-transform">
          <Wheat className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
      </Link>
    );
  }

  return (
    <Link href="/dashboard" className="erp-shell-brand-card hidden lg:block mx-3 mt-3 mb-1.5 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F52BA] via-[#1E64D4] to-[#0B3E8F] flex items-center justify-center shadow-lg shadow-blue-950/35 border border-white/20 shrink-0">
          <Wheat className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="erp-shell-brand-title text-base leading-tight font-bold text-white tracking-tight">
            Warraich Traders
          </p>
          <p className="erp-shell-brand-sub mt-0.5 text-[11px] text-blue-300/90 font-medium">
            Feed trading & ERP
          </p>
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

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 erp-shell-overlay z-30 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <div className="relative flex shrink-0 lg:overflow-visible no-print">
        <aside
          className={`erp-sidebar-panel erp-shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(288px,88vw)] max-w-[288px] transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen lg:shrink-0 lg:max-w-none safe-area-pb ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "lg:w-[84px]" : "lg:w-[288px]"}`}
        >
          <div className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] flex items-center justify-center shadow-md shrink-0 border border-white/20">
                <Wheat className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="erp-shell-brand-title text-sm block truncate font-bold text-white">
                  Warraich Traders
                </span>
                <span className="erp-shell-brand-sub text-[10px] text-blue-300">Menu</span>
              </div>
            </Link>
            <button onClick={onClose} className="erp-shell-btn-icon shrink-0" aria-label="Close menu">
              <X className="w-5 h-5 text-slate-300 hover:text-white" />
            </button>
          </div>

          <SidebarBrand collapsed={collapsed} />

          <nav className={`flex-1 overflow-y-auto py-2.5 erp-sidebar-scroll scroll-smooth ${collapsed ? "pt-1" : ""}`}>
            {filteredSections.map((section) => (
              <NavSectionBlock
                key={section.title}
                section={section}
                collapsed={collapsed}
                pathname={pathname}
                onClose={onClose}
              />
            ))}
          </nav>

          <div className={`shrink-0 transition-all duration-300 border-t border-white/10 ${collapsed ? "p-2 pb-4" : "p-3 pb-5"}`}>
            {!collapsed ? (
              <div className="erp-shell-footer-card flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F52BA] via-[#1E64D4] to-[#0B3E8F] flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 border border-white/20 shadow">
                  AJS
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider leading-none">
                    Developed by
                  </p>
                  <p className="text-xs font-bold text-slate-100 truncate tracking-wide mt-1">
                    AL-JANNAT SYSTEMS
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex justify-center py-1"
                title="Developed by AL-JANNAT SYSTEMS"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0F52BA] via-[#1E64D4] to-[#0B3E8F] flex items-center justify-center text-[10px] font-extrabold text-white border border-white/20 shadow">
                  AJS
                </div>
              </div>
            )}
          </div>
        </aside>

        <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>
    </>
  );
}
