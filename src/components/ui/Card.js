"use client";

import React from "react";

export function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div className={`module-panel ${hover ? "card-hover" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`px-5 sm:px-6 pt-5 sm:pt-6 pb-0 ${className}`}>
      {children}
    </div>
  );
}
