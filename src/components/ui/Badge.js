import React from "react";

export function Badge({ children, variant = "default", className = "", ...props }) {
  const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 transition-colors";

  const variants = {
    default: "bg-slate-100 text-slate-700 ring-slate-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    purple: "bg-violet-50 text-violet-700 ring-violet-200",
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span className={`${baseStyles} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </span>
  );
}
