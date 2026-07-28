"use client";

import { useEffect } from "react";

/**
 * Focused number inputs and selects change value on mouse wheel; block that app-wide.
 */
export default function NumberInputBehavior() {
  useEffect(() => {
    const onWheel = (e) => {
      const el = e.target;
      if (document.activeElement !== el) return;
      const isNumber =
        el instanceof HTMLInputElement && el.type === "number";
      const isSelect = el instanceof HTMLSelectElement;
      if (isNumber || isSelect) {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);
  return null;
}
