"use client";

import React from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { PRODUCT_UNITS } from "@/lib/constants";

const UNIT_LABELS = {
  ea: "Each (ea)",
  case: "Case",
  pallet: "Pallet",
  lb: "Pound (lb)",
  ft: "Foot (ft)",
  gal: "Gallon (gal)",
  kg: "Kilogram (legacy)",
  ton: "Ton (legacy)",
  bag: "Bag (legacy)",
  piece: "Piece (legacy)",
};

export default function ProductForm({ form, onChange, categories = [], submitting = false, onSubmit, onCancel, submitLabel = "Save item" }) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  return (
    <form onSubmit={onSubmit} className="erp-finance-form erp-prod-form">
      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Item details</p>
        <div className="erp-finance-form-grid">
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Item name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="erp-finance-input"
              placeholder="e.g. 16 oz Stainless Tumbler"
            />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Category *</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              required
              className="erp-finance-input"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Unit</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="erp-finance-input">
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>
              ))}
              {form.unit && !PRODUCT_UNITS.includes(form.unit) && (
                <option value={form.unit}>{UNIT_LABELS[form.unit] || `${form.unit} (legacy)`}</option>
              )}
            </select>
          </div>
          {(form.unit === "case" || form.unit === "bag") && (
            <div className="erp-finance-field">
              <label className="erp-finance-label">Units per case</label>
              <input type="number" step="any" value={form.bagWeight} onChange={(e) => set("bagWeight", e.target.value)} className="erp-finance-input font-mono" />
            </div>
          )}
          <div className="erp-finance-field">
            <label className="erp-finance-label">Cost price</label>
            <input type="number" step="any" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} className="erp-finance-input font-mono" placeholder="0" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Sale price</label>
            <input type="number" step="any" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} className="erp-finance-input font-mono" placeholder="0" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Min. stock alert</label>
            <input type="number" step="any" value={form.minimumStock} onChange={(e) => set("minimumStock", e.target.value)} className="erp-finance-input font-mono" placeholder="0" />
          </div>
          {"currentStock" in form && (
            <div className="erp-finance-field">
              <label className="erp-finance-label">{"isActive" in form ? "Current stock" : "Opening stock"}</label>
              <input type="number" step="any" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} className="erp-finance-input font-mono" placeholder="0" />
            </div>
          )}
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Description</label>
            <textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} className="erp-finance-input erp-finance-textarea" rows={2} />
          </div>
          {"isActive" in form && (
            <div className="erp-finance-field erp-finance-field-span2">
              <label className="erp-prod-check">
                <input type="checkbox" checked={!!form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Active item
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="erp-finance-form-actions">
        <button type="button" onClick={onCancel} className="erp-finance-btn-ghost">Cancel</button>
        <Button type="submit" disabled={submitting} className="bg-acc-products border-0">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
