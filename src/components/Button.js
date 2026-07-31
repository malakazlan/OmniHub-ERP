"use client";

import React from "react";

export function Button({ 
  children, 
  onClick, 
  type = "button", 
  variant = "primary", 
  className = "", 
  disabled = false,
  ...props 
}) {
  const baseStyles = "px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#0F52BA] hover:bg-[#0B3E8F] text-white shadow-md hover:shadow-blue-900/20 focus:ring-[#0F52BA]",
    brand: "bg-[#0F52BA] hover:bg-[#0B3E8F] text-white shadow-md shadow-blue-900/15 focus:ring-[#0F52BA] focus:ring-offset-white border-0",
    secondary: "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 focus:ring-neutral-500",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-sm focus:ring-red-500",
    outline: "border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:ring-neutral-500",
    glass: "backdrop-blur-md bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 text-neutral-800 dark:text-white focus:ring-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
