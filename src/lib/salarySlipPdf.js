import { jsPDF } from "jspdf";
import { formatCurrencyForPdf, pdfSafeText } from "@/lib/formatters";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const C = {
  brand: [190, 24, 93],
  brandDark: [157, 23, 77],
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  grid: [203, 213, 225],
  alt: [255, 241, 246],
  success: [4, 120, 87],
};

function money(n) {
  return formatCurrencyForPdf(n ?? 0);
}

export function downloadSalarySlipPdf({ record, employee, company = {}, filename }) {
  if (!record) return;

  const emp = employee?.name ? employee : record.employee || {};
  const companyName = company?.company_name || "Warraich Traders";
  const period = `${MONTHS[(record.month || 1) - 1]} ${record.year}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const M = 14;
  const W = 210 - M * 2;
  let y = M;

  pdf.setFillColor(...C.brand);
  pdf.rect(M, y, W, 18, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(pdfSafeText(companyName), M + 4, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  if (company?.address) pdf.text(pdfSafeText(company.address), M + 4, y + 12);
  pdf.setFont("helvetica", "bold");
  pdf.text("SALARY SLIP", 210 - M - 4, y + 7, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.text(period, 210 - M - 4, y + 12, { align: "right" });
  y += 22;

  pdf.setFillColor(...C.alt);
  pdf.rect(M, y, W, 10, "F");
  pdf.setTextColor(...C.brandDark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`Payroll — ${period}`, M + 4, y + 6.5);
  pdf.setFontSize(8);
  pdf.setTextColor(record.status === "paid" ? C.success[0] : C.muted[0], record.status === "paid" ? C.success[1] : C.muted[1], record.status === "paid" ? C.success[2] : C.muted[2]);
  pdf.text(String(record.status || "pending").toUpperCase(), 210 - M - 4, y + 6.5, { align: "right" });
  y += 14;

  const info = [
    ["Employee", emp.name || "—"],
    ["Department", emp.department || "—"],
    ["Designation", emp.designation || "—"],
    ["CNIC", emp.cnic || "—"],
    ["Reference", `SAL-${record.id}`],
    ["Payment date", record.paymentDate ? new Date(record.paymentDate).toLocaleDateString("en-PK") : "—"],
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  for (const [label, val] of info) {
    pdf.setTextColor(...C.muted);
    pdf.text(label, M + 4, y);
    pdf.setTextColor(...C.ink);
    pdf.setFont("helvetica", "bold");
    pdf.text(pdfSafeText(val), M + 38, y);
    pdf.setFont("helvetica", "normal");
    y += 5;
  }
  y += 4;

  const rows = [
    ["Base salary", money(record.baseSalary)],
    ["Bonus", money(record.bonus)],
    ["Deductions", money(record.deductions)],
    ["Net salary", money(record.netSalary), true],
    ["Cash paid", money(record.cashAmount)],
    ["Bank paid", money(record.bankAmount)],
    ["Total paid", money(record.paidAmount), true],
  ];

  const colW = [W * 0.62, W * 0.38];
  const rowH = 7;

  pdf.setFillColor(...C.brand);
  pdf.rect(M, y, W, rowH, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Description", M + 3, y + 4.8);
  pdf.text("Amount (Rs.)", M + colW[0] + colW[1] - 3, y + 4.8, { align: "right" });
  y += rowH;

  rows.forEach(([label, val, bold], i) => {
    const bg = bold ? C.alt : i % 2 ? [252, 252, 253] : [255, 255, 255];
    pdf.setFillColor(...bg);
    pdf.rect(M, y, W, rowH, "F");
    pdf.setDrawColor(...C.grid);
    pdf.rect(M, y, colW[0], rowH, "S");
    pdf.rect(M + colW[0], y, colW[1], rowH, "S");
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.ink);
    pdf.text(label, M + 3, y + 4.8);
    pdf.text(pdfSafeText(val), M + W - 3, y + 4.8, { align: "right" });
    y += rowH;
  });

  if (record.notes) {
    y += 6;
    pdf.setTextColor(...C.muted);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("Notes", M + 4, y);
    y += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...C.ink);
    const lines = pdf.splitTextToSize(pdfSafeText(record.notes), W - 8);
    pdf.text(lines, M + 4, y);
  }

  pdf.setFontSize(7);
  pdf.setTextColor(...C.muted);
  pdf.text(pdfSafeText(companyName), M, 290);
  pdf.text(`Salary slip · ${period}`, 105, 290, { align: "center" });
  pdf.text(new Date().toLocaleString(), 210 - M, 290, { align: "right" });

  pdf.save(filename || `salary-slip-${record.id}.pdf`);
}
