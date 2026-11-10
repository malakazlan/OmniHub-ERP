"use client";

import Link from "next/link";

/**
 * Page header — 21px/700 title, muted subtitle, right-aligned actions.
 * `module` is accepted for backwards compatibility; every module uses the brand accent now.
 */
export function PageHeader({ module, title, description, icon: Icon, breadcrumbs = [], actions }) {
  void module;

  return (
    <div className="page-enter">
      {breadcrumbs.length > 0 && (
        <nav className="oh-crumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--line-strong)]">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors">{crumb.label}</Link>
              ) : (
                <span className="cur">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="oh-ph">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="oh-ph-icon">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="oh-ph-title truncate">{title}</h1>
            {description && <p className="oh-ph-sub">{description}</p>}
          </div>
        </div>
        {actions && (
          <div className="oh-ph-actions w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

const TONES = {
  navy: "navy",
  blue: "blue",
  cyan: "cyan",
  plain: "plain",
};

/**
 * KPI tile. `tone` = "navy" | "blue" | "cyan" | "plain" (default plain/white).
 * `module` is kept for backwards compatibility and ignored.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  module,
  tone = "plain",
  subtext,
  loading = false,
  valueClassName = "",
  className = "",
  spark,
}) {
  void module;
  const toneClass = TONES[tone] || TONES.plain;

  return (
    <div className={`oh-kpi ${toneClass} ${className}`}>
      {Icon && (
        <div className="oh-kpi-ic">
          <Icon className="w-5 h-5" strokeWidth={1.9} />
        </div>
      )}
      <div className={Icon ? "oh-kpi-body" : "pr-24"}>
        <div className="oh-kpi-l">{label}</div>
        {loading ? (
          <div className="skeleton h-7 w-28 mt-1" />
        ) : (
          <div className={`oh-kpi-v num ${valueClassName}`}>{value}</div>
        )}
        {subtext && !loading && <div className="oh-kpi-d">{subtext}</div>}
      </div>
      {Array.isArray(spark) && spark.length > 1 && <Sparkline points={spark} />}
    </div>
  );
}

export function Sparkline({ points = [] }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const w = 84;
  const h = 28;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - 3 - ((p - min) / span) * (h - 6)]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h}Z`;
  return (
    <svg className="oh-kpi-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path className="area" d={area} />
      <path d={line} />
    </svg>
  );
}
