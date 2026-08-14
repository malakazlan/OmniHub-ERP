import { jsPDF } from "jspdf";
import { pdfSafeText } from "@/lib/formatters";
import {
  layoutRegisterColumns,
  normalizeRegisterFooter,
  formatPrintCompanyMeta,
  SERIAL_MM,
} from "@/lib/registerPrintLayout";

const MARGIN = 10;
const PAGE_W = 297;
const PAGE_H = 210;
const ROW_H = 6.5;
const HEADER_H = 7;
const BANNER_H = 16;
const TITLE_H = 10;

const C = {
  brand: [91, 33, 182],
  brandDark: [76, 29, 149],
  head: [109, 40, 217],
  headText: [255, 255, 255],
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  grid: [148, 163, 184],
  gridDark: [100, 116, 139],
  alt: [248, 250, 252],
  foot: [237, 233, 254],
  danger: [185, 28, 28],
  success: [4, 120, 87],
};

function cellText(value) {
  return pdfSafeText(value);
}

function drawCellBorder(pdf, x, y, w, h) {
  pdf.setDrawColor(...C.grid);
  pdf.setLineWidth(0.12);
  pdf.rect(x, y, w, h, "S");
}

/**
 * Generic ERP register PDF — products, inventory, expenses, journal lists.
 */
export function downloadRegisterPdf({
  title = "Register",
  subtitle = "",
  company = {},
  columns = [],
  rows = [],
  footers = [],
  filename = "register.pdf",
  showRowNum = true,
}) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const companyName = company?.company_name || "Warraich Traders";
  const companyLines = formatPrintCompanyMeta(company);
  const tableW = PAGE_W - MARGIN * 2;
  const layout = layoutRegisterColumns(columns, tableW);
  const footer = normalizeRegisterFooter(footers, layout.columns);
  const printedAt = new Date().toLocaleString();

  const colDefs = [];
  let x = MARGIN;

  if (showRowNum) {
    colDefs.push({ key: "__serial", label: "#", width: SERIAL_MM, align: "center", isSerial: true });
    x += SERIAL_MM;
  }

  for (const col of layout.columns) {
    colDefs.push({ ...col, width: col.widthMm });
  }

  const colX = {};
  x = MARGIN;
  for (const col of colDefs) {
    colX[col.key || col.label] = { x, w: col.width };
    x += col.width;
  }

  let y = MARGIN;
  let pageNum = 1;

  const drawPageFooter = () => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(...C.muted);
    const fy = PAGE_H - 5;
    pdf.text(companyName, MARGIN, fy);
    pdf.text(`${title} · Page ${pageNum}`, PAGE_W / 2, fy, { align: "center" });
    pdf.text(printedAt, PAGE_W - MARGIN, fy, { align: "right" });
  };

  const drawBanner = () => {
    pdf.setFillColor(...C.brand);
    pdf.rect(MARGIN, y, tableW, BANNER_H, "F");
    pdf.setTextColor(...C.headText);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(pdfSafeText(companyName), MARGIN + 3, y + 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    let metaY = y + 10;
    for (const line of companyLines.slice(0, 2)) {
      pdf.text(pdfSafeText(line), MARGIN + 3, metaY);
      metaY += 3.2;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("REGISTER REPORT", PAGE_W - MARGIN - 3, y + 6, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(printedAt, PAGE_W - MARGIN - 3, y + 10.5, { align: "right" });
    pdf.text(`${rows.length} records`, PAGE_W - MARGIN - 3, y + 14, { align: "right" });
    y += BANNER_H + 2;
  };

  const drawTitleBar = () => {
    pdf.setFillColor(...C.foot);
    pdf.rect(MARGIN, y, tableW, TITLE_H, "F");
    pdf.setDrawColor(...C.grid);
    pdf.setLineWidth(0.15);
    pdf.rect(MARGIN, y, tableW, TITLE_H, "S");

    pdf.setTextColor(...C.brandDark);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(pdfSafeText(title), MARGIN + 3, y + 4.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.muted);
    if (subtitle) pdf.text(pdfSafeText(subtitle), MARGIN + 3, y + 8.2);
    y += TITLE_H + 2;
  };

  const drawTableHead = () => {
    pdf.setFillColor(...C.head);
    pdf.rect(MARGIN, y, tableW, HEADER_H, "F");

    for (const col of colDefs) {
      const key = col.key || col.label;
      const { x: cx, w } = colX[key];
      drawCellBorder(pdf, cx, y, w, HEADER_H);

      pdf.setTextColor(...C.headText);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      const align = col.align || "left";
      const tx = align === "right" ? cx + w - 2 : align === "center" ? cx + w / 2 : cx + 2;
      pdf.text(col.isSerial ? "#" : col.label, tx, y + 4.8, { align });
    }
    y += HEADER_H;
  };

  const startPage = (repeatHead = false) => {
    if (repeatHead) {
      pdf.addPage();
      pageNum += 1;
      y = MARGIN;
    }
    drawBanner();
    drawTitleBar();
    drawTableHead();
  };

  const newPageIfNeeded = (extra = 0) => {
    const bottom = PAGE_H - MARGIN - 8 - (footer ? ROW_H : 0);
    if (y + ROW_H + extra <= bottom) return;
    drawPageFooter();
    startPage(true);
  };

  startPage(false);

  rows.forEach((row, idx) => {
    newPageIfNeeded();
    const bg = idx % 2 === 1 ? C.alt : [255, 255, 255];
    pdf.setFillColor(...bg);
    pdf.rect(MARGIN, y, tableW, ROW_H, "F");

    for (const col of colDefs) {
      const key = col.key || col.label;
      const { x: cx, w } = colX[key];
      drawCellBorder(pdf, cx, y, w, ROW_H);

      let text;
      if (col.isSerial) {
        text = String(idx + 1);
      } else {
        const raw = col.get ? col.get(row, idx) : row[col.key];
        text = cellText(raw);
      }

      pdf.setFont("helvetica", col.bold ? "bold" : "normal");
      pdf.setFontSize(6.5);

      if (!col.isSerial) {
        const toneVal = typeof col.tone === "function" ? col.tone(row) : col.tone;
        if (toneVal === "danger") pdf.setTextColor(...C.danger);
        else if (toneVal === "success") pdf.setTextColor(...C.success);
        else pdf.setTextColor(...C.ink);
      } else {
        pdf.setTextColor(...C.muted);
      }

      const align = col.align || (col.isSerial ? "center" : "left");
      const tx = align === "right" ? cx + w - 2 : align === "center" ? cx + w / 2 : cx + 2;
      const maxChars = Math.max(8, Math.floor(w / 1.6));
      const clipped = text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
      pdf.text(clipped, tx, y + 4.5, { align });
    }
    y += ROW_H;
  });

  if (footer) {
    newPageIfNeeded();
    pdf.setFillColor(...C.foot);
    pdf.rect(MARGIN, y, tableW, ROW_H, "F");

    for (let i = 0; i < colDefs.length; i += 1) {
      const col = colDefs[i];
      const key = col.key || col.label;
      const { x: cx, w } = colX[key];
      drawCellBorder(pdf, cx, y, w, ROW_H);

      const dataIdx = col.isSerial ? -1 : i - (showRowNum ? 1 : 0);

      if (col.isSerial) continue;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);

      if (dataIdx === footer.valueIdx) {
        pdf.setTextColor(...C.ink);
        pdf.text(cellText(footer.value), cx + w - 2, y + 4.5, { align: "right" });
      } else if (dataIdx === footer.labelIdx) {
        pdf.setTextColor(...C.muted);
        pdf.text(cellText(footer.label || "Total").toUpperCase(), cx + w - 2, y + 4.5, { align: "right" });
      }
    }
    y += ROW_H;
  }

  drawPageFooter();
  pdf.save(filename);
}
