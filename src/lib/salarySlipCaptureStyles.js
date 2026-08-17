/**
 * Self-contained salary slip CSS for html2canvas PDF capture.
 * Literal hex colors only — no CSS variables, no oklch/lab.
 */
export const SALARY_SLIP_CAPTURE_CSS = `
.erp-salary-slip-print {
  width: 680px;
  max-width: 680px;
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: Calibri, "Segoe UI", Arial, sans-serif;
  font-size: 8pt;
  line-height: 1.25;
}

.erp-sal-xls {
  width: 100%;
  max-width: 680px;
  margin: 0;
  background: #ffffff;
  color: #000000;
  font-family: Calibri, "Segoe UI", Arial, sans-serif;
  font-size: 8pt;
  line-height: 1.25;
}

.erp-sal-xls-sheet {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 2px solid #000000;
}

.erp-sal-xls-sheet > tbody > tr > td,
.erp-sal-xls-sheet > tbody > tr > th {
  border: 1px solid #000000;
  padding: 3px 6px;
  vertical-align: middle;
}

.erp-sal-xls-sheet > tbody > tr > th {
  background: #4472c4;
  color: #ffffff;
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: left;
  padding: 4px 6px;
}

.erp-sal-xls-band > th {
  background: #d9e1f2 !important;
  color: #1f3864 !important;
  border-color: #000000 !important;
  font-size: 7.5pt;
  letter-spacing: 0.06em;
}

.erp-sal-xls-header > td {
  padding: 8px 8px 6px;
  vertical-align: middle;
  border-bottom: 2px solid #000000;
}

.erp-sal-xls-header .is-brand strong {
  display: block;
  font-size: 11pt;
  color: #1f3864;
  text-transform: uppercase;
}

.erp-sal-xls-sub {
  display: block;
  margin-top: 2px;
  font-size: 7.5pt;
  color: #333333;
}

.erp-sal-xls-header .is-title { text-align: center; }

.erp-sal-xls-kicker {
  display: block;
  font-size: 6.5pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #555555;
}

.erp-sal-xls-header .is-title strong {
  display: block;
  font-size: 12pt;
  color: #1f3864;
  letter-spacing: 0.04em;
  margin: 2px 0;
}

.erp-sal-xls-header .is-title span:last-child {
  font-size: 9pt;
  font-weight: 700;
}

.erp-sal-xls-header .is-meta { font-size: 8pt; text-align: right; }

.erp-sal-xls-header .is-meta div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.erp-sal-xls-header .is-meta span { color: #555555; }

.erp-sal-xls-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  border: 1px solid #bf9000;
  background: #fff2cc;
  font-size: 7pt;
  font-weight: 800;
  color: #7f6000;
}

.erp-sal-xls-badge.is-paid {
  border-color: #548235;
  background: #e2efda;
  color: #375623;
}

.erp-sal-xls-badge.is-preview {
  border-color: #7030a0;
  background: #e4dfec;
  color: #7030a0;
}

.erp-sal-xls-inner {
  width: 100%;
  border-collapse: collapse;
  font-size: inherit;
  table-layout: fixed;
}

.erp-sal-xls-inner td,
.erp-sal-xls-inner th {
  border: 1px solid #b4b4b4;
  padding: 3px 5px;
  vertical-align: middle;
}

.erp-sal-xls-inner th {
  background: #4472c4;
  color: #ffffff;
  font-size: 7pt;
  font-weight: 700;
  text-transform: uppercase;
}

.erp-sal-xls-inner .is-label {
  width: 42%;
  background: #f2f2f2;
  color: #333333;
  font-size: 8pt;
}

.erp-sal-xls-inner .is-val { font-size: 8.5pt; }

.erp-sal-xls-sheet .is-pad-none { padding: 0 !important; }

.erp-sal-xls-sheet .is-right,
.erp-sal-xls-inner .is-right { text-align: right; }

.erp-sal-xls-sheet .is-center { text-align: center; }

.erp-sal-xls-sheet .is-mono,
.erp-sal-xls-num {
  font-family: Consolas, "Courier New", monospace;
}

.erp-sal-xls-inner tr.is-muted td { background: #fafafa; color: #444444; font-size: 7.5pt; }
.erp-sal-xls-inner tr.is-total td { background: #d9e1f2; font-weight: 700; color: #1f3864; }
.erp-sal-xls-inner tr.is-clearance td { background: #ddebf7; color: #0563c1; font-weight: 700; }
.erp-sal-xls-inner tr.is-deduct td { color: #c00000; }
.erp-sal-xls-inner tr.is-advance td { color: #0563c1; font-weight: 600; }
.erp-sal-xls-inner tr.is-pending td { background: #fce4d6; color: #c00000; font-weight: 700; }
.erp-sal-xls-inner tr.is-grand td {
  background: #e2efda;
  border-top: 2px solid #548235 !important;
  font-weight: 800;
}

.erp-sal-xls-num.is-paid { color: #548235; font-size: 11pt; font-weight: 800; }

.erp-sal-xls-sheet .is-present { color: #548235; font-weight: 700; }
.erp-sal-xls-sheet .is-absent { color: #c00000; font-weight: 700; }
.erp-sal-xls-sheet .is-deduct { color: #c00000; }
.erp-sal-xls-sheet .is-bonus { color: #7030a0; }
.erp-sal-xls-sheet .is-strong { font-weight: 800; color: #1f3864; }
.erp-sal-xls-sheet .is-note { font-size: 7pt; color: #555555; font-style: italic; }
.erp-sal-xls-sheet .is-empty { text-align: center; color: #888888; font-style: italic; font-size: 7.5pt; }
.erp-sal-xls-sheet .is-bold { font-weight: 700; }

.erp-sal-xls-lead {
  margin: 0;
  padding: 4px 8px;
  font-size: 7pt;
  color: #7f1d1d;
  background: #fff2f2;
  border-bottom: 1px solid #b4b4b4;
  line-height: 1.35;
}

.erp-sal-xls-footer td {
  background: #f2f2f2;
  font-size: 6.5pt;
  color: #666666;
  text-align: center;
  padding: 4px 6px !important;
}

.erp-sal-xls-split > td { vertical-align: top; }
.erp-sal-xls-split.is-tall > td { height: 100%; }

.erp-sal-xls-sheet .is-label-cell {
  background: #f2f2f2;
  color: #333333;
  font-size: 8pt;
  font-weight: 600;
}
`;
