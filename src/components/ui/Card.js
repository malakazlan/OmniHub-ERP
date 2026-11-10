"use client";

import React from "react";

export function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div className={`oh-card module-panel ${hover ? "card-hover" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, title, subtitle, actions, className = "" }) {
  if (title || subtitle || actions) {
    return (
      <div className={`oh-card-hd ${className}`}>
        <div className="min-w-0">
          {title && <h3 className="oh-card-title truncate">{title}</h3>}
          {subtitle && <div className="oh-card-sub">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        {children}
      </div>
    );
  }
  return <div className={`oh-card-hd ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }) {
  return <div className={`oh-card-bd ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--line)] bg-[var(--surface-2)] rounded-b-[var(--radius)] ${className}`}>
      {children}
    </div>
  );
}

export default Card;
