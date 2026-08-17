"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { ATTENDANCE_STATUSES, STATUS_BY_VALUE } from "@/lib/attendance";

const TONE_CLASS = {
  present: "erp-att-cell-present",
  absent: "erp-att-cell-absent",
  half_day: "erp-att-cell-half",
  leave: "erp-att-cell-leave",
  holiday: "erp-att-cell-holiday",
};

function AttendanceHazriCell({ status = "", onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const tone = status ? STATUS_BY_VALUE[status]?.tone || "" : "empty";
  const abbrev = status ? STATUS_BY_VALUE[status]?.abbrev || "—" : "—";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (value) => {
    setOpen(false);
    onChange?.(value);
  };

  return (
    <div ref={wrapRef} className="erp-att-hazri-cell">
      <button
        type="button"
        className={`erp-att-hazri-btn ${TONE_CLASS[tone] || "erp-att-cell-empty"}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Set attendance"
      >
        {abbrev}
      </button>
      {open && (
        <div className="erp-att-hazri-menu">
          <button type="button" className="erp-att-hazri-opt is-empty" onClick={() => pick("")}>
            —
          </button>
          {ATTENDANCE_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`erp-att-hazri-opt is-${s.tone}${status === s.value ? " is-active" : ""}`}
              onClick={() => pick(s.value)}
            >
              {s.abbrev}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(AttendanceHazriCell);
