/**
 * Self-contained invoice CSS for html2canvas / WhatsApp capture.
 * Uses literal hex colors only — no CSS variables, no oklch/lab.
 */
export const INVOICE_CAPTURE_CSS = `
.erp-sale-invoice {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  box-shadow: none;
}
.erp-inv-header {
  background: #111827;
  color: #ffffff;
  padding: 1.1rem 1.25rem 1rem;
  border-bottom: 4px solid #047857;
}
.erp-inv-header-inner {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 1rem;
  align-items: start;
}
.erp-inv-company-name {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  margin: 0;
  color: #ffffff;
}
.erp-inv-company-tag {
  margin: 0.25rem 0 0;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
}
.erp-inv-company-meta {
  margin-top: 0.55rem;
  font-size: 0.6875rem;
  color: #d1d5db;
  line-height: 1.45;
}
.erp-inv-doc-meta { text-align: right; }
.erp-inv-doc-kicker {
  margin: 0;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6ee7b7;
}
.erp-inv-doc-no {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  font-weight: 800;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.02em;
  color: #ffffff;
}
.erp-inv-doc-date {
  margin: 0.15rem 0 0.45rem;
  font-size: 0.6875rem;
  color: #9ca3af;
}
.erp-inv-pay-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.erp-inv-pay-badge.is-paid { background: #059669; color: #ffffff; }
.erp-inv-pay-badge.is-partial { background: #d97706; color: #ffffff; }
.erp-inv-pay-badge.is-unpaid { background: #374151; color: #f3f4f6; border: 1px solid #4b5563; }
.erp-inv-customer {
  padding: 0.85rem 1.25rem;
  background: #ecfdf5;
  border-bottom: 1px solid #bbf7d0;
}
.erp-inv-customer-grid {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 0.8fr 0.7fr;
  gap: 0.65rem 1rem;
}
.erp-inv-customer-cell { min-width: 0; }
.erp-inv-cell-label {
  display: block;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #047857;
  margin-bottom: 0.15rem;
}
.erp-inv-cell-value {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}
.erp-inv-cell-value.is-name { font-size: 0.8125rem; font-weight: 800; }
.erp-inv-cell-value.is-cap { text-transform: capitalize; }
.erp-inv-dispatch {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  padding: 0.55rem 1.25rem;
  font-size: 0.6875rem;
  color: #64748b;
  background: #f9fafb;
  border-bottom: 1px solid #e2e8f0;
}
.erp-inv-dispatch strong { font-weight: 700; color: #374151; margin-right: 0.25rem; }
.erp-inv-table-wrap { padding: 0 1.25rem; overflow: visible; }
.erp-inv-table {
  width: 100%;
  min-width: 280px;
  border-collapse: collapse;
  margin-top: 0.85rem;
}
.erp-inv-table thead th {
  padding: 0.5rem 0.45rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: left;
  color: #ffffff;
  background-color: #1f2937;
  border: 1px solid #374151;
}
.erp-inv-table thead th.text-right { text-align: right; }
.erp-inv-table tbody td {
  padding: 0.5rem 0.45rem;
  font-size: 0.6875rem;
  border: 1px solid #e2e8f0;
  vertical-align: top;
  color: #0f172a;
  background: #ffffff;
}
.erp-inv-table tbody tr:nth-child(even) td { background: #f9fafb; }
.erp-inv-table .text-muted { color: #64748b; }
.erp-inv-table .font-mono { font-family: ui-monospace, monospace; }
.erp-inv-table .font-medium { font-weight: 600; }
.erp-inv-table .font-semibold { font-weight: 700; }
.erp-inv-table .text-center { text-align: center; }
.erp-inv-table .text-right { text-align: right; }
.erp-inv-table .tabular-nums { font-variant-numeric: tabular-nums; }
.erp-inv-bottom {
  display: grid;
  grid-template-columns: 1fr min(17rem, 42%);
  gap: 1rem;
  margin-top: 0.85rem;
  padding: 0 1.25rem 0.85rem;
  align-items: start;
}
.erp-inv-words {
  padding: 0.65rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fafafa;
}
.erp-inv-words-label {
  margin: 0 0 0.3rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}
.erp-inv-words-text {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}
.erp-inv-pay-method {
  margin: 0.45rem 0 0;
  font-size: 0.6875rem;
  color: #64748b;
}
.erp-inv-payment { min-width: 0; }
.erp-inv-payment-title {
  margin: 0 0 0.35rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #047857;
}
.erp-inv-pay-grid {
  display: grid;
  grid-template-columns: 1fr minmax(5.5rem, auto);
  border: 1px solid #374151;
  border-radius: 4px;
  overflow: hidden;
  font-size: 0.6875rem;
}
.erp-inv-pay-head {
  padding: 0.4rem 0.55rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffffff;
  background-color: #1f2937;
  border-bottom: 1px solid #374151;
}
.erp-inv-pay-head.is-amt { text-align: right; border-left: 1px solid #4b5563; }
.erp-inv-pay-label,
.erp-inv-pay-value {
  padding: 0.38rem 0.55rem;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}
.erp-inv-pay-label {
  color: #64748b;
  font-weight: 600;
  border-right: 1px solid #e2e8f0;
}
.erp-inv-pay-value {
  text-align: right;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  color: #0f172a;
  background: #fafafa;
}
.erp-inv-pay-grid > :nth-last-child(-n+2) { border-bottom: none; }
.erp-inv-pay-value.is-discount { color: #b45309; }
.erp-inv-pay-label.is-grand,
.erp-inv-pay-value.is-grand {
  background: #ecfdf5;
  color: #047857;
  font-weight: 800;
  font-size: 0.75rem;
  border-top: 2px solid #047857;
}
.erp-inv-pay-value.is-grand { font-size: 0.8125rem; }
.erp-inv-pay-label.is-due,
.erp-inv-pay-value.is-due { color: #b91c1c; font-weight: 800; }
.erp-inv-pay-label.is-settled,
.erp-inv-pay-value.is-settled { color: #047857; font-weight: 800; }
.erp-inv-pay-value.is-due,
.erp-inv-pay-value.is-settled { background: #ffffff; }
.erp-inv-notes {
  padding: 0.65rem 1.25rem;
  font-size: 0.6875rem;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}
.erp-inv-signature {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.25rem 0.35rem;
  background: #ffffff;
}
.erp-inv-sig-line {
  width: 8.5rem;
  border-top: 1px solid #374151;
  margin-bottom: 0.3rem;
}
.erp-inv-sig-role {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  color: #64748b;
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.erp-inv-footnote {
  margin: 0;
  font-size: 0.5625rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem 1rem 0.75rem;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}
.w-10 { width: 2.5rem; }
.w-24 { width: 6rem; }
.w-28 { width: 7rem; }
`;

export const PURCHASE_INVOICE_CAPTURE_CSS = `
.erp-purchase-invoice {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  box-shadow: none;
}
.erp-pi-header {
  background: #111827;
  color: #ffffff;
  padding: 1.1rem 1.25rem 1rem;
  border-bottom: 4px solid #0f52ba;
}
.erp-pi-header-inner {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 1rem;
  align-items: start;
}
.erp-pi-company-name {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  margin: 0;
  color: #ffffff;
}
.erp-pi-company-tag {
  margin: 0.25rem 0 0;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
}
.erp-pi-company-meta {
  margin-top: 0.55rem;
  font-size: 0.6875rem;
  color: #d1d5db;
  line-height: 1.45;
}
.erp-pi-doc-meta { text-align: right; }
.erp-pi-doc-kicker {
  margin: 0;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #93c5fd;
}
.erp-pi-doc-no {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  font-weight: 800;
  font-family: ui-monospace, monospace;
  color: #ffffff;
}
.erp-pi-doc-date {
  margin: 0.15rem 0 0.45rem;
  font-size: 0.6875rem;
  color: #9ca3af;
}
.erp-pi-pay-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.erp-pi-pay-badge.is-paid { background: #059669; color: #ffffff; }
.erp-pi-pay-badge.is-partial { background: #d97706; color: #ffffff; }
.erp-pi-pay-badge.is-unpaid { background: #374151; color: #f3f4f6; border: 1px solid #4b5563; }
.erp-pi-party {
  padding: 0.85rem 1.25rem;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
}
.erp-pi-party-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem 1rem;
}
.erp-pi-cell-label {
  display: block;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f52ba;
  margin-bottom: 0.15rem;
}
.erp-pi-cell-value {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
}
.erp-pi-cell-value.is-name { font-size: 0.8125rem; font-weight: 800; }
.erp-pi-cell-value.is-cap { text-transform: capitalize; }
.erp-pi-table-wrap { padding: 0 1.25rem; overflow: visible; }
.erp-pi-table {
  width: 100%;
  min-width: 280px;
  border-collapse: collapse;
  margin-top: 0.85rem;
}
.erp-pi-table thead th {
  padding: 0.5rem 0.45rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #ffffff;
  background-color: #1e3a5f;
  border: 1px solid #1e40af;
}
.erp-pi-table thead th.text-right { text-align: right; }
.erp-pi-table tbody td {
  padding: 0.5rem 0.45rem;
  font-size: 0.6875rem;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  background: #ffffff;
}
.erp-pi-table tbody tr:nth-child(even) td { background: #f8fafc; }
.erp-pi-table tfoot td {
  padding: 0.5rem 0.45rem;
  font-size: 0.6875rem;
  border: 1px solid #e2e8f0;
  background: #f1f5f9;
}
.erp-pi-subtotal-label {
  text-align: right;
  font-size: 0.5625rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
}
.erp-pi-table .text-muted { color: #64748b; }
.erp-pi-table .font-mono { font-family: ui-monospace, monospace; }
.erp-pi-table .font-medium { font-weight: 600; }
.erp-pi-table .font-semibold { font-weight: 700; }
.erp-pi-table .font-bold { font-weight: 800; }
.erp-pi-table .text-center { text-align: center; }
.erp-pi-table .text-right { text-align: right; }
.erp-pi-table .tabular-nums { font-variant-numeric: tabular-nums; }
.erp-pi-bottom {
  display: grid;
  grid-template-columns: 1fr min(17rem, 42%);
  gap: 1rem;
  margin-top: 0.85rem;
  padding: 0 1.25rem 0.85rem;
}
.erp-pi-bottom.is-single { grid-template-columns: 1fr; }
.erp-pi-charges {
  padding: 0.65rem 0.75rem;
  border: 1px solid #93c5fd;
  border-radius: 4px;
  background: #f8fafc;
}
.erp-pi-charges-title {
  margin: 0 0 0.45rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f52ba;
}
.erp-pi-charge-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.6875rem;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
}
.erp-pi-charges-total {
  display: flex;
  justify-content: space-between;
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 2px solid #0f52ba;
  font-size: 0.75rem;
  font-weight: 800;
  color: #0f52ba;
}
.erp-pi-payment-title {
  margin: 0 0 0.35rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f52ba;
}
.erp-pi-pay-grid {
  display: grid;
  grid-template-columns: 1fr minmax(5.5rem, auto);
  border: 1px solid #1e3a5f;
  border-radius: 4px;
  overflow: hidden;
  font-size: 0.6875rem;
}
.erp-pi-pay-head {
  padding: 0.4rem 0.55rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #ffffff;
  background-color: #1e3a5f;
  border-bottom: 1px solid #1e40af;
}
.erp-pi-pay-head.is-amt { text-align: right; border-left: 1px solid #2563eb; }
.erp-pi-pay-label,
.erp-pi-pay-value {
  padding: 0.38rem 0.55rem;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}
.erp-pi-pay-label { color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; }
.erp-pi-pay-value {
  text-align: right;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  color: #0f172a;
  background: #fafafa;
}
.erp-pi-pay-grid > :nth-last-child(-n+2) { border-bottom: none; }
.erp-pi-pay-value.is-discount { color: #b45309; }
.erp-pi-pay-label.is-grand,
.erp-pi-pay-value.is-grand {
  background: #eff6ff;
  color: #0f52ba;
  font-weight: 800;
  border-top: 2px solid #0f52ba;
}
.erp-pi-pay-label.is-due,
.erp-pi-pay-value.is-due { color: #b91c1c; font-weight: 800; }
.erp-pi-pay-label.is-settled,
.erp-pi-pay-value.is-settled { color: #047857; font-weight: 800; }
.erp-pi-pay-label.is-balance,
.erp-pi-pay-value.is-balance { background: #f1f5f9; font-weight: 700; color: #334155; }
.erp-pi-pay-label.is-current,
.erp-pi-pay-value.is-current { background: #dbeafe; color: #1e40af; font-weight: 800; }
.erp-pi-notes {
  padding: 0.65rem 1.25rem;
  font-size: 0.6875rem;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
}
.erp-pi-signature {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.25rem 0.35rem;
}
.erp-pi-sig-line {
  width: 8.5rem;
  border-top: 1px solid #1e3a5f;
  margin-bottom: 0.3rem;
}
.erp-pi-sig-role {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  color: #64748b;
  text-align: right;
  text-transform: uppercase;
}
.erp-pi-footnote {
  margin: 0;
  font-size: 0.5625rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem 1rem 0.75rem;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}
`;

export const DOCUMENT_CAPTURE_CSS = `${INVOICE_CAPTURE_CSS}\n${PURCHASE_INVOICE_CAPTURE_CSS}`;
