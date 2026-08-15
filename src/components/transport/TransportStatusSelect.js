"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { TRANSPORT_STATUS_META } from "@/components/transport/transportConstants";
import { TRANSPORT_STATUSES } from "@/lib/constants";

export default function TransportStatusSelect({
  status,
  onChange,
  disabled = false,
  updating = false,
}) {
  const [local, setLocal] = useState(status);

  useEffect(() => {
    setLocal(status);
  }, [status]);

  const handleChange = (e) => {
    e.stopPropagation();
    const next = e.target.value;
    setLocal(next);
    onChange?.(next);
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div className="erp-trip-status-select-wrap" onClick={stop} onMouseDown={stop}>
      {updating ? (
        <Loader2 className="w-4 h-4 text-cyan-600 animate-spin mx-auto" />
      ) : (
        <select
          value={local}
          onChange={handleChange}
          disabled={disabled}
          className={`erp-trip-status-select is-${TRANSPORT_STATUS_META[local]?.tone || "pending"}`}
          aria-label="Trip status"
        >
          {TRANSPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TRANSPORT_STATUS_META[s]?.label || s.replace("_", " ")}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
