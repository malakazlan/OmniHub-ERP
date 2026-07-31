"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import { DASHBOARD_SHORTCUTS, NAV_THEME, navIconForSlug } from "@/lib/navigation";

function ShortcutTile({ item }) {
  const theme = NAV_THEME[item.slug] || NAV_THEME.settings;
  const Icon = navIconForSlug(item.slug, item.href);
  if (!Icon) return null;

  return (
    <Link href={item.href} className="erp-dash-shortcut erp-dash-shortcut-compact group" title={item.label}>
      <span className={`erp-dash-shortcut-icon ${theme.tileIcon}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <span className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 leading-tight text-center line-clamp-2">
        {item.label}
      </span>
    </Link>
  );
}

export default function DashboardShortcuts() {
  const { hasModuleAccess } = useAuth();

  const items = DASHBOARD_SHORTCUTS.filter((item) => hasModuleAccess(item.slug));

  if (items.length === 0) return null;

  return (
    <section className="erp-dash-panel h-full flex flex-col min-h-0">
      <div className="erp-dash-panel-head shrink-0">
        <h2 className="erp-dash-panel-title">Quick Shortcuts</h2>
      </div>
      <div className="erp-dash-panel-body flex-1 min-h-0">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {items.map((item) => (
            <ShortcutTile key={item.href} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
