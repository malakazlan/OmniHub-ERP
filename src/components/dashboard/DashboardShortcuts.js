"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import { DASHBOARD_SHORTCUTS, navIconForSlug } from "@/lib/navigation";

/* Resolved once at module load so no component references are created during render. */
const SHORTCUT_ICONS = Object.fromEntries(
  DASHBOARD_SHORTCUTS.map((item) => [item.href, navIconForSlug(item.slug, item.href)])
);

function ShortcutTile({ item }) {
  const Icon = SHORTCUT_ICONS[item.href];
  if (!Icon) return null;

  return (
    <Link href={item.href} className="erp-dash-shortcut erp-dash-shortcut-compact" title={item.label}>
      <span className="erp-dash-shortcut-icon">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <span className="erp-dash-shortcut-label line-clamp-2">{item.label}</span>
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
        <h2 className="erp-dash-panel-title">Quick shortcuts</h2>
        <span className="erp-dash-panel-sub !mt-0">{items.length} modules</span>
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
