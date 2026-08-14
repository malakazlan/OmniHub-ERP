"use client";

import React from "react";
import { STATUS_BY_VALUE } from "@/lib/attendance";

export default function AttendanceStatusPill({ status, compact = false }) {
  const meta = STATUS_BY_VALUE[status];
  if (!meta) return <span className="erp-hr-att-pill">—</span>;

  return (
    <span className={`erp-hr-att-pill is-${meta.tone}${compact ? " is-compact" : ""}`}>
      {compact ? meta.abbrev : meta.label}
    </span>
  );
}
