import { jsPDF } from "jspdf";
import { formatCurrencyForPdf, formatDate, pdfSafeText } from "@/lib/formatters";
import { buildSalarySlipReceipt } from "@/lib/salarySlipReceiptModel";

/* ── Palette (Excel-style) ── */
const C = {
  border: [0, 0, 0],
  head: [68, 114, 196],
  band: [217, 225, 242],
  label: [242, 242, 242],
  white: [255, 255, 255],
  ink: [0, 0, 0],
  muted: [80, 80, 80],
  navy: [31, 56, 100],
  green: [84, 130, 53],
  red: [192, 0, 0],
  blue: [5, 99, 193],
  purple: [112, 48, 160],
  pending: [252, 228, 214],
  grand: [226, 239, 218],
  clearance: [221, 235, 247],
  mutedBg: [250, 250, 250],
  noteBg: [255, 242, 242],
  warn: [127, 96, 0],
};

const M = 12;
const W = 186;

function money(n) {
  return formatCurrencyForPdf(n ?? 0);
}

function fmtDate(d) {
  if (!d) return "-";
  return pdfSafeText(formatDate(d));
}

function ptToMm(pt) {
  return pt * 0.352778;
}

function setRgb(pdf, rgb) {
  if (rgb.length === 3) pdf.setFillColor(...rgb);
}

function drawRect(pdf, x, y, w, h, { fill, stroke = true } = {}) {
  pdf.setDrawColor(...C.border);
  if (fill) {
    setRgb(pdf, fill);
    pdf.rect(x, y, w, h, stroke ? "FD" : "F");
  } else if (stroke) {
    pdf.rect(x, y, w, h, "S");
  }
}

function drawTextInCell(pdf, x, y, w, h, text, {
  align = "left",
  fontSize = 7,
  bold = false,
  color = C.ink,
  pad = 2,
} = {}) {
  const safe = pdfSafeText(text ?? "");
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...color);

  const lines = pdf.splitTextToSize(safe, w - pad * 2);
  const lineH = ptToMm(fontSize) * 1.15;
  const blockH = lines.length * lineH;
  let ty = y + Math.max(pad, (h - blockH) / 2 + ptToMm(fontSize) * 0.75);

  for (const line of lines) {
    if (align === "right") {
      pdf.text(line, x + w - pad, ty, { align: "right" });
    } else if (align === "center") {
      pdf.text(line, x + w / 2, ty, { align: "center" });
    } else {
      pdf.text(line, x + pad, ty);
    }
    ty += lineH;
  }
}

function cell(pdf, x, y, w, h, opts = {}) {
  drawRect(pdf, x, y, w, h, { fill: opts.fill });
  if (opts.text != null || opts.texts) {
    if (opts.texts) {
      let cy = y + 2;
      for (const t of opts.texts) {
        drawTextInCell(pdf, x, cy, w, ptToMm(t.fontSize || 7) + 2, t.text, {
          align: t.align || opts.align,
          fontSize: t.fontSize || opts.fontSize || 7,
          bold: t.bold ?? opts.bold,
          color: t.color || opts.color || C.ink,
          pad: 2,
        });
        cy += ptToMm(t.fontSize || 7) + 1.5;
      }
    } else {
      drawTextInCell(pdf, x, y, w, h, opts.text, {
        align: opts.align,
        fontSize: opts.fontSize || 7,
        bold: opts.bold,
        color: opts.color || C.ink,
      });
    }
  }
}

function band(pdf, x, y, w, title) {
  cell(pdf, x, y, w, 5.5, {
    fill: C.band,
    text: title.toUpperCase(),
    fontSize: 7,
    bold: true,
    color: C.navy,
  });
  return y + 5.5;
}

function headRow(pdf, x, y, widths, labels, h = 5.5) {
  let cx = x;
  for (let i = 0; i < labels.length; i++) {
    cell(pdf, cx, y, widths[i], h, {
      fill: C.head,
      text: labels[i],
      fontSize: 6.5,
      bold: true,
      color: C.white,
    });
    cx += widths[i];
  }
  return y + h;
}

function kvRow(pdf, x, y, w, label, value, opts = {}, h = 5.4) {
  const labelW = w * 0.48;
  const valW = w - labelW;
  cell(pdf, x, y, labelW, h, {
    fill: opts.labelFill ?? C.label,
    text: label,
    fontSize: opts.fontSize ?? 6.5,
    color: opts.labelColor ?? C.muted,
    bold: opts.bold,
  });
  cell(pdf, x + labelW, y, valW, h, {
    fill: opts.valFill,
    text: String(value ?? "-"),
    align: "right",
    fontSize: opts.valFontSize ?? 7,
    bold: opts.bold,
    color: opts.color ?? C.ink,
  });
  return y + h;
}

function drawKvBlock(pdf, x, y, w, rows, startY) {
  let cy = startY;
  for (const row of rows) {
    const [label, val, opts = {}] = row;
    const isGrand = label === "TOTAL CASH PAID";
    cy = kvRow(pdf, x, cy, w, label, val, {
      ...opts,
      bold: isGrand || opts.bold,
      labelFill: isGrand ? C.grand : opts.fill ?? opts.labelFill,
      valFill: isGrand ? C.grand : opts.fill ?? opts.valFill,
      color: isGrand ? C.green : opts.color,
      valFontSize: isGrand ? 9 : opts.valFontSize,
    });
  }
  return cy;
}

export function downloadSalarySlipPdf({ record, employee, company = {}, clearanceExtras = {}, filename }) {
  if (!record) return;

  const enriched = employee?.name ? { ...record, employee: { ...record.employee, ...employee } } : record;
  const data = buildSalarySlipReceipt({ record: enriched, company, clearanceExtras });
  if (!data) return;

  const sb = data.salaryBreakdown || {};
  const adv = data.advanceDetail || {};
  const monthRows = adv.monthRows || [];
  const monthAdvanceTotal = adv.monthGross ?? monthRows.reduce((s, r) => s + (r.amount || 0), 0);
  const openingOwed = adv.openingOwed ?? adv.previousBalance + monthAdvanceTotal;
  const isPaid = data.status === "paid";
  const statusLabel = isPaid ? "CLEARED" : String(data.status || "pending").toUpperCase();
  const payMethod = pdfSafeText(String(data.payment.method || "cash").replace(/_/g, " ").toUpperCase());
  const payAccount = pdfSafeText(data.payment.accountName || "Cash account");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = M;

  /* ── Header ── */
  const hThird = W / 3;
  const headerH = 20;
  const contact = [data.company.address, data.company.phone].filter(Boolean).join(" · ");

  cell(pdf, M, y, hThird, headerH, {
    texts: [
      { text: data.company.name, bold: true, fontSize: 10, color: C.navy },
      { text: contact || "-", fontSize: 6.5, color: C.muted },
    ],
  });
  cell(pdf, M + hThird, y, hThird, headerH, {
    texts: [
      { text: "OFFICIAL DOCUMENT", align: "center", fontSize: 6, color: C.muted },
      { text: "MONTHLY SALARY RECEIPT", align: "center", bold: true, fontSize: 9, color: C.navy },
      { text: data.periodLabel.toUpperCase(), align: "center", bold: true, fontSize: 8, color: C.navy },
    ],
  });
  cell(pdf, M + hThird * 2, y, hThird, headerH, {
    texts: [
      { text: `Ref: ${data.ref}`, align: "right", fontSize: 6.5 },
      { text: `Cleared: ${fmtDate(data.paymentDate)}`, align: "right", fontSize: 6.5 },
      { text: statusLabel, align: "right", bold: true, fontSize: 7.5, color: isPaid ? C.green : C.warn },
    ],
  });
  y += headerH;

  /* ── Employee + Advances (equal height) ── */
  const half = W / 2;
  y = band(pdf, M, y, half, "Employee");
  band(pdf, M + half, y - 5.5, half, "Salary Advances — This Month");

  const RH = 5.4;
  const empRows = [
    ["Employee ID", String(data.employee.id || "-")],
    ["Name", data.employee.name || "-"],
    ["Father name", data.employee.fatherName || "-"],
    ["CNIC", data.employee.cnic || "-"],
    ["Phone", data.employee.phone || "-"],
    ["Designation", data.employee.designation || data.employee.department || "-"],
    ["Monthly contract", money(data.employee.contractSalary), { bold: true, color: C.navy }],
  ];

  const advDataRows = [
    { type: "muted", c1: "Previous balance (before month)", c3: money(adv.previousBalance) },
    ...monthRows.map((row) => ({
      type: "data",
      c1: row.id ? `ADV-${row.id}` : "-",
      c2: fmtDate(row.advanceDate),
      c3: money(row.amount),
    })),
    ...(monthRows.length === 0 ? [{ type: "empty", c1: "No regular advances this month" }] : []),
    { type: "total", c1: "Total taken (this month)", c3: money(monthAdvanceTotal) },
    ...(adv.newOnClearance > 0
      ? [{ type: "clearance", c1: "New advance at clearance (paid out)", c3: `+ ${money(adv.newOnClearance)}` }]
      : []),
  ];

  const advColW = [half * 0.26, half * 0.36, half * 0.38];
  const blockRows = Math.max(empRows.length, 1 + advDataRows.length);
  const blockTop = y;
  const blockH = blockRows * RH;

  for (let i = 0; i < blockRows; i++) {
    const ry = blockTop + i * RH;
    if (i < empRows.length) {
      const [label, val, opts = {}] = empRows[i];
      kvRow(pdf, M, ry, half, label, val, opts, RH);
    } else {
      drawRect(pdf, M, ry, half, RH);
    }
  }

  let advY = headRow(pdf, M + half, blockTop, advColW, ["Ref #", "Date", "Amount"], RH);
  const advBodyTop = advY;
  const advBodyRows = advDataRows.length;
  const advBodyH = advBodyRows * RH;

  for (let i = 0; i < advDataRows.length; i++) {
    const row = advDataRows[i];
    const ry = advBodyTop + i * RH;
    let cx = M + half;

    if (row.type === "empty") {
      cell(pdf, cx, ry, half, RH, { text: row.c1, align: "center", fontSize: 6.5, color: C.muted });
      continue;
    }

    if (row.type === "muted" || row.type === "total" || row.type === "clearance") {
      const fill = row.type === "total" ? C.band : row.type === "clearance" ? C.clearance : C.mutedBg;
      const bold = row.type === "total" || row.type === "clearance";
      const color = row.type === "clearance" ? C.blue : row.type === "total" ? C.navy : C.muted;
      cell(pdf, cx, ry, advColW[0] + advColW[1], RH, {
        fill,
        text: row.c1,
        fontSize: 6.5,
        bold,
        color,
      });
      cell(pdf, cx + advColW[0] + advColW[1], ry, advColW[2], RH, {
        fill,
        text: row.c3,
        align: "right",
        fontSize: 7,
        bold,
        color: row.type === "clearance" ? C.blue : C.ink,
      });
    } else {
      cell(pdf, cx, ry, advColW[0], RH, { text: row.c1, fontSize: 6.5 });
      cell(pdf, cx + advColW[0], ry, advColW[1], RH, { text: row.c2, fontSize: 6.5 });
      cell(pdf, cx + advColW[0] + advColW[1], ry, advColW[2], RH, {
        text: row.c3,
        align: "right",
        fontSize: 7,
      });
    }
  }

  const empBottom = blockTop + blockH;
  const advBottom = advBodyTop + advBodyH;
  y = Math.max(empBottom, advBottom);
  if (y < blockTop + blockH) y = blockTop + blockH;

  /* ── Attendance ── */
  if (data.attendance) {
    y = band(pdf, M, y, W, "Attendance Summary");
    const att = data.attendance;
    const attW = [W * 0.24, W * 0.1, W * 0.11, W * 0.1, W * 0.11, W * 0.1, W * 0.12, W * 0.12];
    y = headRow(pdf, M, y, attW, ["Period", "Days", "Present", "Leave", "Absent", "Hol.", "Working", ""]);
    const vals = [
      { text: data.periodLabel, fontSize: 6.5 },
      { text: String(att.days ?? data.calendarDays ?? "-"), align: "center", fontSize: 6.5 },
      { text: String(att.present ?? 0), align: "center", fontSize: 6.5, color: C.green, bold: true },
      { text: String(att.leave ?? 0), align: "center", fontSize: 6.5 },
      { text: String(att.absent ?? 0), align: "center", fontSize: 6.5, color: C.red, bold: true },
      { text: String(att.holiday ?? 0), align: "center", fontSize: 6.5 },
      { text: Number(att.working ?? 0).toFixed(1), align: "center", fontSize: 6.5 },
      { text: "" },
    ];
    let cx = M;
    for (let i = 0; i < attW.length; i++) {
      cell(pdf, cx, y, attW[i], RH, vals[i]);
      cx += attW[i];
    }
    y += RH;
  }

  /* ── Salary calculation ── */
  y = band(pdf, M, y, W, "Salary Calculation");
  const calcW = [W * 0.11, W * 0.11, W * 0.11, W * 0.1, W * 0.11, W * 0.1, W * 0.13, W * 0.23];
  y = headRow(pdf, M, y, calcW, ["Contract", "Daily", "Absence", "Holiday", "Earned", "Comm.", "Gross", "Formula"]);
  const calcVals = [
    { text: money(sb.contract), align: "right", fontSize: 6.5 },
    { text: money(sb.dailyRate), align: "right", fontSize: 6.5 },
    { text: money(sb.absenceDeduction), align: "right", fontSize: 6.5, color: C.red },
    { text: money(sb.holidayBonus), align: "right", fontSize: 6.5, color: C.purple },
    { text: money(sb.earnedBasePay), align: "right", fontSize: 6.5 },
    { text: money(sb.commission), align: "right", fontSize: 6.5 },
    { text: money(sb.grossAmount), align: "right", fontSize: 7, bold: true, color: C.navy },
    { text: sb.formulaNote || "", fontSize: 5.5, color: C.muted },
  ];
  let cx = M;
  for (let i = 0; i < calcW.length; i++) {
    cell(pdf, cx, y, calcW[i], RH + 0.6, calcVals[i]);
    cx += calcW[i];
  }
  y += RH + 0.6;

  /* ── Recovery + Summary ── */
  y = band(pdf, M, y, half, "Extra Advance / Recovery");
  band(pdf, M + half, y - 5.5, half, "Payment Summary");

  if (data.advanceSummaryText) {
    cell(pdf, M, y, W, 7, {
      fill: C.noteBg,
      text: data.advanceSummaryText,
      fontSize: 6,
      color: C.red,
    });
    y += 7;
  }

  const recRows = [
    ["Owed before recovery", money(openingOwed), { color: C.ink }],
    ["Previous months", money(adv.previousBalance), { labelColor: C.muted, labelFill: C.mutedBg }],
    ...(monthAdvanceTotal > 0 ? [["This month (regular)", money(monthAdvanceTotal), { labelColor: C.muted, labelFill: C.mutedBg }]] : []),
    ["Recovered from salary", `- ${money(adv.deducted)}`, { color: C.red }],
    ...(adv.newOnClearance > 0 ? [["New advance at clearance", `+ ${money(adv.newOnClearance)}`, { color: C.blue }]] : []),
    ["Pending (next salary)", money(adv.pendingAfterClearance ?? 0), { color: C.red, bold: true, fill: C.pending }],
  ];

  const sumRows = [
    ["Total salary (contract)", money(sb.contract)],
    ["Earned this month", money(sb.earnedBasePay)],
    ["Total amount", money(sb.grossAmount), { bold: true, color: C.navy }],
    ...(adv.deducted > 0 ? [["Advance recovered", `- ${money(adv.deducted)}`, { color: C.red }]] : []),
    ["Net salary paid", money(data.netPayable), { bold: true }],
    ...(data.payment.newAdvance > 0 ? [["Extra advance paid", `+ ${money(data.payment.newAdvance)}`, { color: C.blue }]] : []),
    ["TOTAL CASH PAID", money(data.payment.totalDisbursement || data.payment.total), { bold: true, color: C.green }],
  ];

  const splitRows = Math.max(recRows.length, sumRows.length);
  const splitTop = y;
  for (let i = 0; i < splitRows; i++) {
    const ry = splitTop + i * RH;
    if (i < recRows.length) {
      const [label, val, opts = {}] = recRows[i];
      kvRow(pdf, M, ry, half, label, val, opts, RH);
    } else {
      drawRect(pdf, M, ry, half, RH);
    }
    if (i < sumRows.length) {
      const [label, val, opts = {}] = sumRows[i];
      kvRow(pdf, M + half, ry, half, label, val, opts, RH);
    } else {
      drawRect(pdf, M + half, ry, half, RH);
    }
  }
  y = splitTop + splitRows * RH;

  /* ── Disbursement ── */
  y = band(pdf, M, y, W, "Payment Disbursement");
  const q = W / 4;
  const splitNote = [
    data.payment.salaryNet > 0 ? `Salary ${money(data.payment.salaryNet)}` : "",
    data.payment.newAdvance > 0 ? `Advance ${money(data.payment.newAdvance)}` : "",
  ].filter(Boolean).join(" + ");

  cell(pdf, M, y, q, RH, { fill: C.label, text: "Payment method", fontSize: 6.5, color: C.muted });
  cell(pdf, M + q, y, q, RH, { text: payMethod, fontSize: 7 });
  cell(pdf, M + q * 2, y, q, RH, { fill: C.label, text: "Account", fontSize: 6.5, color: C.muted });
  cell(pdf, M + q * 3, y, q, RH, { text: payAccount, fontSize: 7 });
  y += RH;

  cell(pdf, M, y, q, RH, { fill: C.label, text: "Amount disbursed", fontSize: 6.5, color: C.muted });
  cell(pdf, M + q, y, q, RH, {
    text: money(data.payment.totalDisbursement || data.payment.total),
    fontSize: 8,
    bold: true,
    color: C.navy,
  });
  cell(pdf, M + q * 2, y, q * 2, RH, {
    text: splitNote || "-",
    fontSize: 6.5,
    color: C.muted,
  });
  y += RH;

  if (data.notes) {
    cell(pdf, M, y, W * 0.18, RH + 1, { fill: C.label, text: "Notes", fontSize: 6.5, color: C.muted });
    cell(pdf, M + W * 0.18, y, W * 0.82, RH + 1, { text: data.notes, fontSize: 6.5 });
    y += RH + 1;
  }

  /* ── Footer ── */
  cell(pdf, M, y, W, 5.5, {
    fill: C.label,
    text: `${data.company.name} · ${data.periodLabel} · ${data.isPreview ? "Preview" : data.printedAt}`,
    align: "center",
    fontSize: 6,
    color: C.muted,
  });

  pdf.save(filename || `salary-slip-${record.id}.pdf`);
}

/** @deprecated DOM capture — use downloadSalarySlipPdf with record data instead. */
export async function downloadSalarySlipPdfFromElement(_element, _filename) {
  throw new Error("Use downloadSalarySlipPdf({ record, company, filename }) for salary slip PDF export.");
}

export const RENDER_WAIT_MS = 0;
