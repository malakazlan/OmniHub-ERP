"use client";

import React from "react";

/**
 * Omni Hub button — 34px tall, 8px radius, brand shadow on primary.
 * Variants: primary | brand (alias) | secondary | outline | ghost | danger | glass (legacy → secondary).
 */
export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-[7px] rounded-lg font-medium text-[13px] leading-none whitespace-nowrap " +
    "transition-[background-color,border-color,color,box-shadow] duration-150 cursor-pointer select-none " +
    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-soft)] " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none";

  const sizes = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-[34px] px-3.5",
    lg: "h-10 px-5 text-sm",
  };

  const variants = {
    primary:
      "bg-[var(--brand)] border border-[var(--brand)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--brand-ink)] hover:border-[var(--brand-ink)]",
    brand:
      "bg-[var(--brand)] border border-[var(--brand)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--brand-ink)] hover:border-[var(--brand-ink)]",
    secondary:
      "bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
    outline:
      "bg-transparent border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
    ghost:
      "bg-transparent border border-transparent text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
    danger:
      "bg-[var(--bad)] border border-[var(--bad)] text-white hover:brightness-95",
    glass:
      "bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
