"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { NAV_SECTIONS, isNavItemActive } from "@/lib/navigation";
import { ordersHomePath, mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import pkg from "../../../package.json";

const APP_VERSION = pkg.version || "1.0.0";
const SIDEBAR_STORAGE_KEY = "omnihub-sidebar-collapsed";

export function BrandMark({ size = "sm", className = "" }) {
  return <span className={`oh-brand-mark ${size === "lg" ? "is-lg" : ""} ${className}`} aria-hidden />;
}

function NavItem({ item, isActive, collapsed, onClick }) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        title={item.label}
        className={`group/nav relative erp-nav-item justify-center px-0 py-1 ${isActive ? "erp-nav-item-active" : ""}`}
      >
        <span className="erp-nav-icon">
          <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
        </span>
        <span
          className="erp-nav-tooltip pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium"
          role="tooltip"
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group/nav erp-nav-item ${isActive ? "erp-nav-item-active" : ""}`}
    >
      <span className="erp-nav-icon">
        <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function NavSectionBlock({ section, collapsed, pathname, search, onClose }) {
  if (collapsed) {
    return (
      <div className="px-2 mb-2 space-y-0.5">
        {section.items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href, search)}
            collapsed
            onClick={onClose}
          />
        ))}
        <div className="mx-3 my-2 border-t border-[var(--line)]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="px-2.5">
      <p className="oh-grp">{section.title}</p>
      <div>
        {section.items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href, search)}
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
      className="erp-sidebar-toggle hidden lg:flex absolute -right-3 top-[60px] z-50 h-6 w-6 items-center justify-center rounded-full cursor-pointer"
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} /> : <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.25} />}
    </button>
  );
}

function SidebarBrand({ collapsed }) {
  if (collapsed) {
    return (
      <Link href="/dashboard" className="oh-brand hidden lg:flex justify-center !px-0" title="Omni Hub">
        <BrandMark />
      </Link>
    );
  }

  return (
    <Link href="/dashboard" className="oh-brand hidden lg:flex">
      <BrandMark />
      <span className="min-w-0">
        <span className="oh-brand-name block truncate">Omni Hub</span>
        <span className="oh-brand-sub truncate">Operations &amp; Finance</span>
      </span>
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const { hasModuleAccess, user } = useAuth();
  // The sidebar only renders after auth resolves on the client, so reading storage here is hydration-safe.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

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
              label: mustScopeOrdersToSelf(user) ? "My orders" : "Sales Orders",
            };
          }),
      })).filter((section) => section.items.length > 0),
    [hasModuleAccess, user]
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 erp-shell-overlay z-30 lg:hidden" onClick={onClose} />
      )}

      <div className="relative flex shrink-0 lg:overflow-visible no-print">
        <aside
          className={`erp-sidebar-panel erp-shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(260px,86vw)] max-w-[260px] transform lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen lg:shrink-0 lg:max-w-none safe-area-pb flex flex-col ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "lg:w-[64px]" : "lg:w-[232px]"}`}
        >
          {/* Mobile drawer header */}
          <div className="lg:hidden">
            <div className="oh-brand justify-between">
              <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
                <BrandMark />
                <span className="min-w-0">
                  <span className="oh-brand-name block truncate">Omni Hub</span>
                  <span className="oh-brand-sub truncate">Operations &amp; Finance</span>
                </span>
              </Link>
              <button onClick={onClose} className="oh-icon-btn shrink-0" aria-label="Close menu">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <SidebarBrand collapsed={collapsed} />

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 erp-sidebar-scroll" aria-label="Main navigation">
            {filteredSections.map((section) => (
              <NavSectionBlock
                key={section.title}
                section={section}
                search={search}
                collapsed={collapsed}
                pathname={pathname}
                onClose={onClose}
              />
            ))}
          </nav>

          <div className="oh-side-foot">
            {collapsed ? (
              <span className="mx-auto" title={`All systems normal · v${APP_VERSION}`}>
                <span className="oh-dot !mr-0" />
              </span>
            ) : (
              <>
                <span className="truncate">
                  <span className="oh-dot" />
                  All systems normal
                </span>
                <span className="num shrink-0">v{APP_VERSION}</span>
              </>
            )}
          </div>
        </aside>

        <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>
    </>
  );
}
