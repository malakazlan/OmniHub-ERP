import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/formatters";

const MARGIN = 10;
const PAGE_W = 297;
const PAGE_H = 210;
const HEADER_H = 8;
const GRID = [148, 163, 184];

const C = {
  ink: [30, 41, 59],
  head: [30, 58, 95],
  headText: [255, 255, 255],
  debit: [185, 28, 28],
  credit: [4, 120, 87],
  alt: [248, 250, 252],
};

function moneyPlain(n) {
  const v = Number(n) || 0;
  if (v === 0) return "";
  return v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function lines(pdf, text, maxW, fontSize = 7) {
  pdf.setFontSize(fontSize);
  return pdf.splitTextToSize(String(text || ""), Math.max(maxW, 8));
}

function drawAccountCell(pdf, entry, x, y, w) {
  const name = entry.account?.name || "—";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.ink);
  const nameLines = lines(pdf, name, w - 3);
  pdf.text(nameLines, x + 1.5, y + 5);
  if (entry.account?.code) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    pdf.text(String(entry.account.code), x + 1.5, y + 5 + nameLines.length * 3.4);
  }
}

function rowParticularsHeight(pdf, entry, partW) {
  const pad = 2;
  let h = pad;
  pdf.setFontSize(7);
  h += lines(pdf, entry.description || "—", partW - 3).length * 3.4;
  if (entry.reference) h += 3.2;
  const items = entry.lineItems || [];
  if (items.length > 0) {
    h += 1.5 + 4 + items.length * 3.6;
  }
  return Math.max(9, h + pad);
}

function drawParticularsCell(pdf, entry, x, y, w, rowH) {
  const inner = w - 3;
  let cy = y + 3;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.ink);
  const descLines = lines(pdf, entry.description || "—", inner);
  pdf.text(descLines, x + 1.5, cy);
  cy += descLines.length * 3.4;

  if (entry.reference) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    pdf.text(String(entry.reference), x + 1.5, cy);
    cy += 3.2;
  }

  const items = entry.lineItems || [];
  if (items.length > 0) {
    cy += 1;
    pdf.setFontSize(5.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text("ITEM", x + 1.5, cy);
    pdf.text("QTY", x + inner * 0.52, cy, { align: "right" });
    pdf.text("RATE", x + inner * 0.72, cy, { align: "right" });
    pdf.text("TOTAL", x + inner - 1, cy, { align: "right" });
    cy += 3.2;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(...C.ink);
    for (const item of items) {
      const qty = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
      pdf.text(String(item.name).slice(0, 28), x + 1.5, cy);
      pdf.text(qty, x + inner * 0.52, cy, { align: "right" });
      pdf.text(moneyPlain(item.rate), x + inner * 0.72, cy, { align: "right" });
      pdf.text(moneyPlain(item.amount), x + inner - 1, cy, { align: "right" });
      cy += 3.6;
    }
  }
}

function drawCellBorders(pdf, x, y, w, h) {
  pdf.setDrawColor(...GRID);
  pdf.setLineWidth(0.15);
  pdf.rect(x, y, w, h, "S");
}

export function downloadLedgerPdf({
  entries = [],
  showAccountColumn = false,
  company = {},
  account = null,
  totals = null,
  filename,
}) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const companyName = company?.company_name || "Warraich Traders";

  const cols = showAccountColumn
    ? [
        { key: "num", label: "#", w: 6 },
        { key: "date", label: "Date", w: 22 },
        { key: "account", label: "Account", w: 34 },
        { key: "particulars", label: "Particulars", w: 0 },
        { key: "debit", label: "Debit", w: 20 },
        { key: "credit", label: "Credit", w: 20 },
        { key: "balance", label: "Balance", w: 20 },
      ]
    : [
        { key: "num", label: "#", w: 6 },
        { key: "date", label: "Date", w: 18 },
        { key: "particulars", label: "Particulars", w: 0 },
        { key: "debit", label: "Debit", w: 24 },
        { key: "credit", label: "Credit", w: 24 },
        { key: "balance", label: "Balance", w: 24 },
      ];

  const fixedW = cols.reduce((s, c) => s + (c.w || 0), 0);
  cols.find((c) => c.key === "particulars").w = PAGE_W - MARGIN * 2 - fixedW;

  const colX = {};
  let x = MARGIN;
  for (const col of cols) {
    colX[col.key] = x;
    x += col.w;
  }
  const tableW = PAGE_W - MARGIN * 2;
  const partW = cols.find((c) => c.key === "particulars").w;

  let y = MARGIN;

  const drawDocHeader = () => {
    pdf.setFillColor(...C.head);
    pdf.rect(MARGIN, y, tableW, 13, "F");
    pdf.setTextColor(...C.headText);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(companyName, MARGIN + 3, y + 5.5);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("General Ledger", MARGIN + 3, y + 10);
    const right = PAGE_W - MARGIN - 3;
    pdf.text(account?.name ? `Account: ${account.name}` : "All accounts", right, y + 5.5, { align: "right" });
    pdf.text(`${new Date().toLocaleString()} · ${entries.length} entries`, right, y + 10, { align: "right" });
    y += 16;
  };

  const drawTableHead = () => {
    pdf.setFillColor(...C.head);
    pdf.rect(MARGIN, y, tableW, HEADER_H, "F");
    pdf.setTextColor(...C.headText);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    for (const col of cols) {
      const cx = colX[col.key];
      const align = col.key === "num" ? "center" : ["debit", "credit", "balance"].includes(col.key) ? "right" : "left";
      const tx =
        align === "right" ? cx + col.w - 2 : align === "center" ? cx + col.w / 2 : cx + 2;
      pdf.text(col.label, tx, y + 5.5, { align });
      drawCellBorders(pdf, cx, y, col.w, HEADER_H);
    }
    y += HEADER_H;
  };

  const newPageIfNeeded = (need) => {
    if (y + need <= PAGE_H - MARGIN) return;
    pdf.addPage();
    y = MARGIN;
    drawDocHeader();
    drawTableHead();
  };

  drawDocHeader();
  drawTableHead();

  entries.forEach((entry, idx) => {
    const rowH = rowParticularsHeight(pdf, entry, partW);
    newPageIfNeeded(rowH);

    const rowY = y;
    if (idx % 2 === 1) {
      pdf.setFillColor(...C.alt);
      pdf.rect(MARGIN, rowY, tableW, rowH, "F");
    }

    for (const col of cols) {
      drawCellBorders(pdf, colX[col.key], rowY, col.w, rowH);
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.ink);
    const textY = rowY + 5;

    pdf.text(String(idx + 1), colX.num + cols[0].w / 2, textY, { align: "center" });
    pdf.text(formatDate(entry.date), colX.date + 2.5, textY);

    if (showAccountColumn) {
      drawAccountCell(pdf, entry, colX.account, rowY, cols.find((c) => c.key === "account").w);
    }

    drawParticularsCell(pdf, entry, colX.particulars, rowY, partW, rowH);

    const debitCol = cols.find((c) => c.key === "debit");
    const creditCol = cols.find((c) => c.key === "credit");
    const balanceCol = cols.find((c) => c.key === "balance");

    pdf.setFontSize(7);
    pdf.setTextColor(...C.debit);
    pdf.text(moneyPlain(entry.debit), colX.debit + debitCol.w - 2, textY, { align: "right" });
    pdf.setTextColor(...C.credit);
    pdf.text(moneyPlain(entry.credit), colX.credit + creditCol.w - 2, textY, { align: "right" });
    pdf.setTextColor(...C.ink);
    pdf.setFont("helvetica", "bold");
    pdf.text(moneyPlain(entry.balance), colX.balance + balanceCol.w - 2, textY, { align: "right" });
    pdf.setFont("helvetica", "normal");

    y += rowH;
  });

  if (totals) {
    newPageIfNeeded(HEADER_H + 2);
    const footY = y;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(MARGIN, footY, tableW, HEADER_H, "F");
    for (const col of cols) {
      drawCellBorders(pdf, colX[col.key], footY, col.w, HEADER_H);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.ink);
    pdf.text("TOTALS", colX.particulars + partW - 2, footY + 5.5, { align: "right" });
    pdf.setTextColor(...C.debit);
    pdf.text(moneyPlain(totals.debit), colX.debit + cols.find((c) => c.key === "debit").w - 2, footY + 5.5, { align: "right" });
    pdf.setTextColor(...C.credit);
    pdf.text(moneyPlain(totals.credit), colX.credit + cols.find((c) => c.key === "credit").w - 2, footY + 5.5, { align: "right" });
    pdf.setTextColor(...C.ink);
    pdf.text(
      moneyPlain(Math.abs(totals.net)),
      colX.balance + cols.find((c) => c.key === "balance").w - 2,
      footY + 5.5,
      { align: "right" }
    );
    y += HEADER_H;
  }

  const slug = (account?.name || "general-ledger").replace(/\s+/g, "-").toLowerCase();
  pdf.save(filename || `ledger-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
