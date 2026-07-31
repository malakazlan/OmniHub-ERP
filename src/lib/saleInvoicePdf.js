import { jsPDF } from "jspdf";
import { formatDate, formatQuantity } from "@/lib/formatters";
import { amountInWords } from "@/lib/amountInWords";

const DEFAULT_COMPANY = {
  company_name: "Warraich Traders",
  company_address: "",
  company_phone: "",
  company_email: "",
  tagline: "Feed · Trade · Accounts",
  ntn: "",
  strn: "",
};

/** Typography scale (pt) — keep hierarchy consistent across the invoice. */
const TYPE = {
  footer: 6.5,
  label: 7,
  body: 8,
  bodyLg: 8.5,
  subhead: 9,
  customer: 10.5,
  invoiceNo: 11,
  company: 15,
};

const LAYOUT = {
  margin: 14,
  pad: 4,
  sectionGap: 7,
  rowH: 7.5,
  headerH: 30,
  infoBoxH: 24,
  summaryW: 72,
};

const COLORS = {
  slate900: [15, 23, 42],
  slate800: [30, 41, 59],
  slate700: [51, 65, 85],
  slate600: [71, 85, 105],
  slate500: [100, 116, 139],
  slate400: [148, 163, 184],
  slate200: [226, 232, 240],
  slate100: [241, 245, 249],
  slate50: [248, 250, 252],
  teal700: [15, 118, 110],
  teal600: [13, 148, 136],
  teal200: [153, 246, 228],
  teal50: [240, 253, 250],
  white: [255, 255, 255],
  rose700: [190, 18, 60],
  rose50: [255, 241, 242],
};

function setFill(pdf, rgb) {
  pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(pdf, rgb) {
  pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setText(pdf, rgb) {
  pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function fmtMoney(amount, withPrefix = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return withPrefix ? `Rs. ${formatted}` : formatted;
}

function textAt(pdf, str, x, y, { align, size, color, font = "helvetica", style = "normal" } = {}) {
  if (size) pdf.setFontSize(size);
  pdf.setFont(font, style);
  if (color) setText(pdf, color);
  pdf.text(String(str), x, y, align ? { align } : undefined);
}

function moneyAt(pdf, x, y, amount, { align = "right", prefix = true, bold = false } = {}) {
  textAt(pdf, fmtMoney(amount, prefix), x, y, {
    align,
    size: TYPE.body,
    color: COLORS.slate900,
    style: bold ? "bold" : "normal",
  });
}

function buildGrid(margin, contentW) {
  const right = margin + contentW;
  return {
    left: margin,
    right,
    amountRight: right - LAYOUT.pad,
    rateRight: right - 28,
    qtyRight: right - 48,
    productLeft: margin + 14,
    idxLeft: margin + LAYOUT.pad + 1,
    summaryLeft: right - LAYOUT.summaryW,
  };
}

function sectionTitle(pdf, grid, y, title) {
  const label = title.toUpperCase();
  textAt(pdf, label, grid.left, y, { size: TYPE.label, color: COLORS.slate500, style: "bold" });
  setDraw(pdf, COLORS.slate200);
  pdf.setLineWidth(0.15);
  const w = pdf.getTextWidth(label);
  pdf.line(grid.left + w + 3, y - 1.2, grid.right, y - 1.2);
  return y + LAYOUT.sectionGap;
}

function ensurePage(pdf, y, restartY, need = 10) {
  if (y + need > 278) {
    pdf.addPage();
    return restartY;
  }
  return y;
}

function drawFrame(pdf, margin, pageW, pageH) {
  setDraw(pdf, COLORS.slate200);
  pdf.setLineWidth(0.25);
  pdf.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);
}

function drawHeader(pdf, c, sale, grid, y) {
  const { left, right } = grid;
  const w = right - left;
  const h = LAYOUT.headerH;

  setFill(pdf, COLORS.slate800);
  pdf.rect(left, y, w, h, "F");
  setFill(pdf, COLORS.teal600);
  pdf.rect(left, y + h - 1, w, 1, "F");

  textAt(pdf, c.company_name || "Warraich Traders", left + LAYOUT.pad, y + 11, {
    size: TYPE.company,
    color: COLORS.white,
    style: "bold",
  });

  if (c.tagline) {
    textAt(pdf, c.tagline, left + LAYOUT.pad, y + 17, {
      size: TYPE.label,
      color: COLORS.slate400,
    });
  }

  const contact = [c.company_address, c.company_phone, c.company_email].filter(Boolean).join("  ·  ");
  if (contact) {
    const lines = pdf.splitTextToSize(contact, w * 0.52);
    textAt(pdf, lines[0], left + LAYOUT.pad, y + 22, { size: 6.5, color: COLORS.slate400 });
    if (lines[1]) textAt(pdf, lines[1], left + LAYOUT.pad, y + 26, { size: 6.5, color: COLORS.slate400 });
  }

  const rx = right - LAYOUT.pad;
  textAt(pdf, "SALES INVOICE", rx, y + 10, {
    align: "right",
    size: TYPE.label,
    color: COLORS.teal200,
    style: "bold",
  });
  textAt(pdf, sale.invoiceNumber || "—", rx, y + 16, {
    align: "right",
    size: TYPE.invoiceNo,
    color: COLORS.white,
    style: "bold",
  });
  textAt(pdf, formatDate(sale.saleDate), rx, y + 22, {
    align: "right",
    size: TYPE.body,
    color: COLORS.slate400,
  });
  if (c.ntn) {
    textAt(pdf, `NTN ${c.ntn}`, rx, y + 27, { align: "right", size: 6.5, color: COLORS.slate400 });
  }

  return y + h + LAYOUT.sectionGap;
}

function drawInfoBoxes(pdf, sale, grid, y) {
  const { left, right } = grid;
  const w = right - left;
  const gap = 5;
  const colW = (w - gap) / 2;
  const h = LAYOUT.infoBoxH;

  setFill(pdf, COLORS.slate50);
  setDraw(pdf, COLORS.slate200);
  pdf.setLineWidth(0.2);
  pdf.rect(left, y, colW, h, "FD");
  pdf.rect(left + colW + gap, y, colW, h, "FD");

  const labelY = y + 5;
  const baseY = y + 11;
  const line = 5;

  textAt(pdf, "Bill to", left + LAYOUT.pad, labelY, {
    size: TYPE.label,
    color: COLORS.slate500,
    style: "bold",
  });
  textAt(pdf, "Invoice details", left + colW + gap + LAYOUT.pad, labelY, {
    size: TYPE.label,
    color: COLORS.slate500,
    style: "bold",
  });

  textAt(pdf, sale.customerName || "—", left + LAYOUT.pad, baseY, {
    size: TYPE.customer,
    color: COLORS.slate900,
    style: "bold",
  });

  const phone = sale.shop?.phone || sale.company?.phone || "";
  const party = sale.shopId ? "Shop account" : sale.companyId ? "Company account" : "Walk-in customer";
  textAt(pdf, party, left + LAYOUT.pad, baseY + line, { size: TYPE.body, color: COLORS.slate600 });
  if (phone) {
    textAt(pdf, phone, left + LAYOUT.pad, baseY + line * 2, { size: TYPE.body, color: COLORS.slate600 });
  }

  const rx = left + colW + gap + LAYOUT.pad;
  textAt(pdf, `Status: ${sale.status || "—"}`, rx, baseY, { size: TYPE.body, color: COLORS.slate700 });
  const pay = (sale.paymentStatus || "unpaid").toUpperCase();
  textAt(pdf, `Payment: ${pay}`, rx, baseY + line, { size: TYPE.body, color: COLORS.slate700 });
  if (sale.vehicleNumber) {
    textAt(pdf, `Vehicle: ${sale.vehicleNumber}`, rx, baseY + line * 2, {
      size: TYPE.body,
      color: COLORS.slate600,
    });
  }

  return y + h + LAYOUT.sectionGap;
}

function drawTableHeader(pdf, grid, y) {
  const { left, right, idxLeft, productLeft, qtyRight, rateRight, amountRight } = grid;
  const h = LAYOUT.rowH;

  setFill(pdf, COLORS.slate100);
  setDraw(pdf, COLORS.slate200);
  pdf.setLineWidth(0.2);
  pdf.rect(left, y, right - left, h, "FD");

  const ty = y + 5.2;
  textAt(pdf, "#", idxLeft, ty, { size: TYPE.label, color: COLORS.slate500, style: "bold" });
  textAt(pdf, "Product", productLeft, ty, { size: TYPE.label, color: COLORS.slate500, style: "bold" });
  textAt(pdf, "Qty", qtyRight, ty, { align: "right", size: TYPE.label, color: COLORS.slate500, style: "bold" });
  textAt(pdf, "Rate (Rs.)", rateRight, ty, {
    align: "right",
    size: TYPE.label,
    color: COLORS.slate500,
    style: "bold",
  });
  textAt(pdf, "Amount (Rs.)", amountRight, ty, {
    align: "right",
    size: TYPE.label,
    color: COLORS.slate500,
    style: "bold",
  });

  return y + h;
}

function drawTableRow(pdf, grid, y, item, index) {
  const { left, right, idxLeft, productLeft, qtyRight, rateRight, amountRight } = grid;
  const h = LAYOUT.rowH;

  if (index % 2 === 1) {
    setFill(pdf, COLORS.slate50);
    pdf.rect(left, y, right - left, h, "F");
  }
  setDraw(pdf, COLORS.slate200);
  pdf.setLineWidth(0.12);
  pdf.line(left, y + h, right, y + h);

  const ty = y + 5.2;
  textAt(pdf, String(index + 1), idxLeft, ty, { size: TYPE.body, color: COLORS.slate500 });
  textAt(pdf, pdf.splitTextToSize(String(item.productName || "—"), 78)[0], productLeft, ty, {
    size: TYPE.bodyLg,
    color: COLORS.slate900,
    style: "bold",
  });
  textAt(pdf, formatQuantity(item.quantity, item.unit), qtyRight, ty, {
    align: "right",
    size: TYPE.body,
    color: COLORS.slate700,
  });
  moneyAt(pdf, rateRight, ty, item.rate, { prefix: false });
  moneyAt(pdf, amountRight, ty, item.amount, { bold: true });

  return y + h;
}

function drawSummary(pdf, grid, y, sale) {
  const { summaryLeft, amountRight, right } = grid;
  const w = LAYOUT.summaryW;
  const pad = LAYOUT.pad;

  const rows = [
    ["Items subtotal", sale.subtotal, false, false],
    ...(parseFloat(sale.transportCost) > 0
      ? [["Transport", sale.transportCost, false, false]]
      : []),
    ...(parseFloat(sale.loadingCost) > 0 ? [["Loading", sale.loadingCost, false, false]] : []),
    ...(parseFloat(sale.taxAmount) > 0 ? [["Tax / GST", sale.taxAmount, false, false]] : []),
    ...(parseFloat(sale.discountAmount) > 0
      ? [["Discount", sale.discountAmount, true, false]]
      : []),
  ];

  const innerRows = rows.length;
  const blockH = 10 + innerRows * 6 + 28;

  setDraw(pdf, COLORS.slate200);
  setFill(pdf, COLORS.white);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(summaryLeft, y, w, blockH, 1.5, 1.5, "FD");

  let sy = y + 6;
  textAt(pdf, "Amount summary", summaryLeft + pad, sy, {
    size: TYPE.label,
    color: COLORS.slate500,
    style: "bold",
  });
  sy += 8;

  for (const [label, val, isDiscount] of rows) {
    textAt(pdf, label, summaryLeft + pad, sy, { size: TYPE.body, color: COLORS.slate600 });
    if (isDiscount) {
      textAt(pdf, `− ${fmtMoney(val, false)}`, amountRight, sy, {
        align: "right",
        size: TYPE.body,
        color: COLORS.slate700,
      });
    } else {
      moneyAt(pdf, amountRight, sy, val, { prefix: false });
    }
    sy += 6;
  }

  setFill(pdf, COLORS.teal50);
  pdf.rect(summaryLeft + 0.5, sy - 1, w - 1, 9, "F");
  setDraw(pdf, COLORS.teal600);
  pdf.setLineWidth(0.15);
  pdf.line(summaryLeft, sy - 1, right, sy - 1);

  textAt(pdf, "Grand total", summaryLeft + pad, sy + 5, {
    size: TYPE.subhead,
    color: COLORS.teal700,
    style: "bold",
  });
  textAt(pdf, fmtMoney(sale.totalAmount), amountRight, sy + 5, {
    align: "right",
    size: TYPE.subhead,
    color: COLORS.teal700,
    style: "bold",
  });
  sy += 11;

  textAt(pdf, "Received to date", summaryLeft + pad, sy, { size: TYPE.body, color: COLORS.slate600 });
  moneyAt(pdf, amountRight, sy, sale.paidAmount);
  sy += 6;

  const balanceDue = Math.max((sale.totalAmount || 0) - (sale.paidAmount || 0), 0);
  if (balanceDue > 0) {
    setFill(pdf, COLORS.rose50);
    pdf.rect(summaryLeft + 0.5, sy - 2, w - 1, 8, "F");
  }
  textAt(pdf, "Balance due", summaryLeft + pad, sy + 4, {
    size: TYPE.bodyLg,
    color: balanceDue > 0 ? COLORS.rose700 : COLORS.teal700,
    style: "bold",
  });
  textAt(pdf, fmtMoney(balanceDue), amountRight, sy + 4, {
    align: "right",
    size: TYPE.bodyLg,
    color: balanceDue > 0 ? COLORS.rose700 : COLORS.teal700,
    style: "bold",
  });

  return y + blockH + LAYOUT.sectionGap;
}

/**
 * Professional A4 sales invoice PDF (jsPDF — no html2canvas).
 */
export function downloadSaleInvoicePdf(sale, company = {}, filename = "invoice.pdf") {
  if (!sale) throw new Error("Sale data required");

  const c = { ...DEFAULT_COMPANY, ...company };
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const margin = LAYOUT.margin;
  const contentW = pageW - margin * 2;
  const grid = buildGrid(margin, contentW);
  const restartY = margin + 36;

  drawFrame(pdf, margin, pageW, pageH);

  let y = margin + 1;
  y = drawHeader(pdf, c, sale, grid, y);
  y = drawInfoBoxes(pdf, sale, grid, y);
  y = sectionTitle(pdf, grid, y, "Line items");

  const tableTop = y;
  y = drawTableHeader(pdf, grid, y);

  (sale.items || []).forEach((item, i) => {
    y = ensurePage(pdf, y, restartY, LAYOUT.rowH + 4);
    if (y === restartY) {
      y = drawTableHeader(pdf, grid, y);
    }
    y = drawTableRow(pdf, grid, y, item, i);
  });

  setDraw(pdf, COLORS.slate200);
  pdf.setLineWidth(0.2);
  pdf.rect(grid.left, tableTop, grid.right - grid.left, y - tableTop);

  y += 4;
  y = ensurePage(pdf, y, restartY, 50);
  y = drawSummary(pdf, grid, y, sale);

  y = sectionTitle(pdf, grid, y, "Amount in words");
  const words = amountInWords(sale.totalAmount);
  const wordLines = pdf.splitTextToSize(words, contentW - 24);
  const boxH = 8 + wordLines.length * 4.5;
  setFill(pdf, COLORS.slate50);
  setDraw(pdf, COLORS.slate200);
  pdf.roundedRect(grid.left, y, contentW, boxH, 1.5, 1.5, "FD");
  textAt(pdf, "In words:", grid.left + LAYOUT.pad, y + 6, { size: TYPE.body, color: COLORS.slate500 });
  wordLines.forEach((line, i) => {
    textAt(pdf, line, grid.left + 22, y + 6 + i * 4.5, {
      size: TYPE.bodyLg,
      color: COLORS.slate900,
      style: "bold",
    });
  });
  y += boxH + LAYOUT.sectionGap;

  if (sale.notes) {
    y = ensurePage(pdf, y, restartY, 12);
    y = sectionTitle(pdf, grid, y, "Notes");
    pdf.splitTextToSize(String(sale.notes), contentW).forEach((line) => {
      textAt(pdf, line, grid.left, y, { size: TYPE.body, color: COLORS.slate600 });
      y += 4.5;
    });
    y += 4;
  }

  const sigY = pageH - margin - 22;
  setDraw(pdf, COLORS.slate400);
  pdf.setLineWidth(0.25);
  pdf.line(grid.amountRight - 42, sigY, grid.amountRight, sigY);
  textAt(pdf, "Authorized signatory", grid.amountRight, sigY + 4, {
    align: "right",
    size: TYPE.label,
    color: COLORS.slate500,
  });
  textAt(pdf, "Sales officer", grid.amountRight, sigY + 8, {
    align: "right",
    size: TYPE.body,
    color: COLORS.slate700,
    style: "bold",
  });

  textAt(pdf, "Warraich Traders ERP · Computer-generated tax invoice", pageW / 2, pageH - margin + 1, {
    align: "center",
    size: TYPE.footer,
    color: COLORS.slate400,
  });

  pdf.save(filename.replace(/\s+/g, "-"));
}
