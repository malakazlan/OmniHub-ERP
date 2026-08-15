"use client";

import React from "react";
import { TRANSPORT_STATUS_META } from "@/components/transport/transportConstants";

export default function TransportStatusPill({ status }) {
  const meta = TRANSPORT_STATUS_META[status] || { label: status, tone: "pending" };
  return (
    <span className={`erp-trip-status is-${meta.tone}`}>
      {meta.label}
    </span>
  );
}
