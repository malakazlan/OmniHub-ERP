import React from "react";

/**
 * Status pill. Variants map onto the Omni Hub semantic tones:
 * ok / success · warn / warning · bad / danger · info · neutral / default.
 * Legacy "indigo" / "purple" variants render as the navy tone.
 */
const VARIANTS = {
  default: "neutral",
  neutral: "neutral",
  ok: "ok",
  success: "ok",
  warn: "warn",
  warning: "warn",
  bad: "bad",
  danger: "bad",
  error: "bad",
  info: "info",
  indigo: "navy",
  purple: "navy",
  navy: "navy",
};

export function Badge({ children, variant = "default", dot = true, className = "", ...props }) {
  const tone = VARIANTS[variant] || VARIANTS.default;
  return (
    <span className={`oh-pill ${tone} ${dot ? "" : "no-dot"} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
