"use client";

import React from "react";
import { Banknote, Building2 } from "lucide-react";
import { formatCurrency, parseNumber } from "@/lib/formatters";

export default function PaymentSplitFields({
  cashAmount = "",
  bankAmount = "",
  cashAccountId = "",
  bankAccountId = "",
  onChange,
  cashAccounts = [],
  bankAccounts = [],
  defaultCashAccountId = "",
  disabled = false,
}) {
  const cash = parseNumber(cashAmount);
  const bank = parseNumber(bankAmount);
  const total = cash + bank;
  const method = cash > 0 && bank > 0 ? "split" : bank > 0 ? "bank" : cash > 0 ? "cash" : "";

  return (
    <div className="erp-pay-split">
      <div className="erp-pay-split-head">
        <p className="erp-pay-split-title">Payment settlement</p>
        <p className="erp-pay-split-hint">Pay from cash and/or bank — split amounts across both if needed.</p>
      </div>

      <div className="erp-pay-split-grid">
        <div className="erp-pay-split-card erp-pay-split-cash">
          <label className="erp-pay-split-label">
            <Banknote className="w-3.5 h-3.5" /> Cash amount
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={cashAmount}
            disabled={disabled}
            onChange={(e) => onChange("cashAmount", e.target.value)}
            className="erp-finance-input font-mono"
            placeholder="0.00"
          />
          {(cash > 0 || cashAccounts.length > 0) && (
            <select
              value={cashAccountId}
              disabled={disabled}
              onChange={(e) => onChange("cashAccountId", e.target.value)}
              className="erp-finance-input text-xs"
            >
              <option value="">Select cash account…</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.code ? ` · ${a.code}` : ""}</option>
              ))}
            </select>
          )}
          {defaultCashAccountId && cashAccountId === defaultCashAccountId && (
            <p className="erp-pay-split-note">Your assigned cash account (auto-selected)</p>
          )}
        </div>

        <div className="erp-pay-split-card erp-pay-split-bank">
          <label className="erp-pay-split-label">
            <Building2 className="w-3.5 h-3.5" /> Bank amount
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={bankAmount}
            disabled={disabled}
            onChange={(e) => onChange("bankAmount", e.target.value)}
            className="erp-finance-input font-mono"
            placeholder="0.00"
          />
          {(bank > 0 || bankAccounts.length > 0) && (
            <select
              value={bankAccountId}
              disabled={disabled}
              onChange={(e) => onChange("bankAccountId", e.target.value)}
              className="erp-finance-input text-xs"
            >
              <option value="">Select bank account…</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.code ? ` · ${a.code}` : ""}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="erp-pay-split-summary">
        <div>
          <span className="erp-pay-split-summary-label">Total payment</span>
          <span className="erp-pay-split-summary-value">{formatCurrency(total)}</span>
        </div>
        {method && (
          <span className={`erp-pay-method erp-pay-method-${method}`}>
            {method === "split" ? "Cash + Bank" : method}
          </span>
        )}
      </div>
    </div>
  );
}
