import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { companyAddressLine } from "@/lib/companyProfile";

const DEFAULT_COMPANY = { company_name: "Omni Hub" };

const MARGIN = 14;
const TABLE_W = 182;

const C = {
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  pay: [190, 18, 60],
  payLight: [255, 241, 242],
  recv: [4, 120, 87],
  recvLight: [236, 253, 245],
  grid: [100, 116, 139],
  head: [51, 65, 85],
  alt: [248, 250, 252],
  sky: [7, 89, 133],
  teal: [15, 118, 110],
};

function money(n) {
  return formatCurrency(n ?? 0, false);
}

function drawCells(pdf, x, y, rowH, cells, opts = {}) {
  const { fill, header, bold, textColor } = opts;
  pdf.setLineWidth(0.25);
  pdf.setDrawColor(...C.grid);

  let cx = x;
  for (const cell of cells) {
    if (fill) {
      pdf.setFillColor(...fill);
      pdf.rect(cx, y, cell.w, rowH, "FD");
    } else {
      pdf.rect(cx, y, cell.w, rowH, "S");
    }

    pdf.setFont("helvetica", bold || header ? "bold" : "normal");
    pdf.setFontSize(cell.size || (header ? 7 : 8));
    pdf.setTextColor(...(textColor || (header ? C.white : C.ink)));

    const pad = 2;
    const align = cell.align || "left";
    const tx =
      align === "right" ? cx + cell.w - pad : align === "center" ? cx + cell.w / 2 : cx + pad;
    const lines = pdf.splitTextToSize(String(cell.text ?? ""), cell.w - pad * 2);
    const ty = y + 4.8 + (lines.length - 1) * 2;
    pdf.text(lines, tx, ty, { align });

    cx += cell.w;
  }
}

export function downloadPaymentReceiptPdf(receipt, company = {}, filename = "payment-voucher.pdf") {
  if (!receipt) return;

  const c = { ...DEFAULT_COMPANY, ...company, ...(receipt.company || {}) };
  const isPay = receipt.mode === "pay";
  const accent = isPay ? C.pay : C.recv;
  const accentLight = isPay ? C.payLight : C.recvLight;
  const title = receipt.title || (isPay ? "Payment voucher" : "Receipt voucher");

  const payCols = [
    { w: 28, key: "mode" },
    { w: 114, key: "account" },
    { w: 40, key: "amount" },
  ];

  const billCols = [
    { w: 72, key: "ref" },
    { w: 50, key: "amount" },
    { w: 60, key: "status" },
  ];

  const balCols = [
    { w: 122, key: "label" },
    { w: 60, key: "value" },
  ];

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 12;

  pdf.setFillColor(...accent);
  pdf.rect(0, 0, 210, 32, "F");
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(c.company_name || "Omni Hub", 105, y, { align: "center" });
  y += 6;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  const addressLine = companyAddressLine(c);
  if (addressLine) {
    pdf.text(addressLine, 105, y, { align: "center" });
    y += 4;
  }
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(title.toUpperCase(), 105, y + 2, { align: "center" });

  y = 38;
  pdf.setFillColor(...accentLight);
  pdf.setDrawColor(...accent);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(MARGIN, y, TABLE_W, 10, 2, 2, "FD");
  pdf.setTextColor(...accent);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `${isPay ? "Payment made to" : "Amount received from"}: ${receipt.partyName}`,
    105,
    y + 6.5,
    { align: "center" }
  );

  y += 16;
  const metaH = 7;
  drawCells(
    pdf,
    MARGIN,
    y,
    metaH,
    [
      { w: 91, text: "Party" },
      { w: 91, text: "Voucher details", align: "right" },
    ],
    { fill: C.head, header: true }
  );
  y += metaH;
  drawCells(pdf, MARGIN, y, metaH, [
    { w: 91, text: receipt.partyName },
    { w: 91, text: receipt.paymentNumber, align: "right" },
  ]);
  y += metaH;
  drawCells(pdf, MARGIN, y, metaH, [
    { w: 91, text: `Date: ${formatDate(receipt.paymentDate)}` },
    { w: 91, text: `Method: ${(receipt.paymentMethod || "cash").replace(/_/g, " ")}`, align: "right" },
  ]);
  y += metaH;
  if (receipt.createdByName) {
    drawCells(pdf, MARGIN, y, metaH, [{ w: TABLE_W, text: `Recorded by: ${receipt.createdByName}` }]);
    y += metaH;
  }

  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.ink);
  pdf.text("Payment breakdown", MARGIN, y);
  y += 4;

  const rowH = 7;
  drawCells(
    pdf,
    MARGIN,
    y,
    rowH,
    [
      { w: payCols[0].w, text: "MODE" },
      { w: payCols[1].w, text: "ACCOUNT" },
      { w: payCols[2].w, text: "AMOUNT", align: "right" },
    ],
    { fill: C.head, header: true }
  );
  y += rowH;

  const payLine = (modeLabel, acct, amt, alt) => {
    drawCells(
      pdf,
      MARGIN,
      y,
      rowH,
      [
        { w: payCols[0].w, text: modeLabel },
        { w: payCols[1].w, text: String(acct || "—") },
        { w: payCols[2].w, text: money(amt), align: "right" },
      ],
      alt ? { fill: C.alt } : {}
    );
    y += rowH;
  };

  let rowIdx = 0;
  if (receipt.cashAmount > 0) {
    payLine("Cash", receipt.cashAccountName || "Cash", receipt.cashAmount, rowIdx++ % 2 === 1);
  }
  if (receipt.bankAmount > 0) {
    payLine("Bank", receipt.bankAccountName || "Bank", receipt.bankAmount, rowIdx++ % 2 === 1);
  }

  drawCells(
    pdf,
    MARGIN,
    y,
    8,
    [
      { w: payCols[0].w + payCols[1].w, text: `TOTAL ${isPay ? "PAID" : "RECEIVED"}`, size: 8 },
      { w: payCols[2].w, text: money(receipt.totalAmount), align: "right", size: 9 },
    ],
    { fill: accentLight, bold: true, textColor: accent }
  );
  y += 10;

  if (receipt.billsCleared?.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.teal);
    pdf.text("Bills / invoices cleared", MARGIN, y);
    y += 4;

    drawCells(
      pdf,
      MARGIN,
      y,
      rowH,
      [
        { w: billCols[0].w, text: "REFERENCE" },
        { w: billCols[1].w, text: "AMOUNT", align: "right" },
        { w: billCols[2].w, text: "STATUS", align: "center" },
      ],
      { fill: C.head, header: true }
    );
    y += rowH;

    receipt.billsCleared.forEach((b, idx) => {
      const ref = b.purchaseNumber || b.invoiceNumber || `#${b.id}`;
      drawCells(
        pdf,
        MARGIN,
        y,
        rowH,
        [
          { w: billCols[0].w, text: ref },
          { w: billCols[1].w, text: money(b.amount), align: "right" },
          { w: billCols[2].w, text: b.clearsFully ? "Paid" : "Partial", align: "center" },
        ],
        idx % 2 === 1 ? { fill: C.alt } : {}
      );
      y += rowH;
    });
    y += 6;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.ink);
  pdf.text("Balance summary", MARGIN, y);
  y += 4;

  const balRow = (label, value, opts = {}) => {
    drawCells(
      pdf,
      MARGIN,
      y,
      rowH,
      [
        { w: balCols[0].w, text: label },
        { w: balCols[1].w, text: money(value), align: "right" },
      ],
      opts
    );
    y += rowH;
  };

  balRow("Previous pending balance", receipt.previousBalance);
  balRow(isPay ? "Total paid (this voucher)" : "Total received (this voucher)", receipt.totalAmount, {
    fill: C.alt,
    bold: true,
  });
  balRow("Pending balance", receipt.pendingBalance, { fill: accentLight, bold: true, textColor: C.sky });

  if (receipt.description) {
    y += 4;
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "normal");
    const desc = pdf.splitTextToSize(`Description: ${receipt.description}`, TABLE_W);
    pdf.text(desc, MARGIN, y);
    y += desc.length * 3.5;
  }

  pdf.setFontSize(7);
  pdf.setTextColor(...C.muted);
  pdf.text(`Computer-generated voucher · ${c.company_name}`, 105, 285, { align: "center" });

  pdf.save(filename);
}
