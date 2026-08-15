"use client";

import React from "react";

export default function FilterSelect({ label, value, onChange, options, classPrefix = "erp-hub" }) {
  return (
    <label className={`${classPrefix}-select-field`}>
      <span className={`${classPrefix}-select-label`}>{label}</span>
      <select
        className={`${classPrefix}-select`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(({ key, label: optLabel }) => (
          <option key={key} value={key}>
            {optLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
