"use client";

import { formatCurrency } from "@/lib/formatters";

export default function DashboardChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="erp-dash-chart-tooltip">
      <p className="erp-dash-chart-tooltip-day">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="erp-dash-chart-tooltip-row">
          <span className="erp-dash-chart-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <span className="num font-semibold">{formatCurrency(item.value || 0)}</span>
        </div>
      ))}
    </div>
  );
}
