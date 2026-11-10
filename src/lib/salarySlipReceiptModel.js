import { buildAdvanceReceiptDetail } from "@/lib/hrPayroll";
import { formatCurrency } from "@/lib/formatters";
import { companyAddressLine } from "@/lib/companyProfile";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function num(v) {
  return parseFloat(v) || 0;
}

function pad(n, len = 2) {
  return String(n).padStart(len, "0");
}

export function buildReceiptRef({ id, month, year, isPreview = false }) {
  if (isPreview || !id) return "PREVIEW";
  return `EMP-SAL-${year}${pad(month)}-${pad(id, 4)}`;
}

function buildSalaryBreakdown({ earnings, rates, attendance, calendarDays, commission, bonus, deductions }) {
  const contract = num(earnings?.contractSalary);
  const days = calendarDays || attendance?.days || 0;
  const dailyRate =
    rates?.dailyRate ??
    (days > 0 && contract > 0 ? Math.round((contract / days) * 100) / 100 : 0);
  const present = attendance?.present ?? 0;
  const holiday = attendance?.holiday ?? 0;
  const absenceDeduction = num(earnings?.absenceDeduction ?? deductions?.absence);
  const recordBonus = num(bonus ?? earnings?.bonus);
  const comm = num(commission);

  let earnedBasePay = num(earnings?.grossEarned ?? contract);
  let holidayBonus = 0;
  if (attendance && dailyRate > 0) {
    earnedBasePay = Math.round(present * dailyRate * 100) / 100;
    holidayBonus = Math.round(holiday * dailyRate * 100) / 100;
  }

  const grossAmount = Math.round((earnedBasePay + holidayBonus + comm + recordBonus) * 100) / 100;
  const parts = [];
  if (days > 0) parts.push(`Daily rate = contract ÷ ${days} calendar days`);
  parts.push("Leave is paid");
  parts.push("Absence is deducted");
  if (holiday > 0) parts.push(`Holiday bonus = ${holiday} day(s) × daily rate`);

  return {
    contract,
    dailyRate,
    absenceDeduction,
    holidayBonus,
    earnedBasePay,
    commission: comm,
    bonus: recordBonus,
    grossAmount,
    formulaNote: parts.join(" · "),
  };
}

function finalizeAdvanceDetail(d, advanceDeduction, newAdvanceOnClearance = 0) {
  const detail = { ...d };
  const clearanceFromRows = (detail.clearanceRows || []).reduce((s, r) => s + num(r.amount), 0);
  detail.newOnClearance = num(newAdvanceOnClearance) || detail.newOnClearance || clearanceFromRows;
  detail.deducted = detail.deducted ?? num(advanceDeduction);
  detail.openingOwed =
    detail.openingOwed ?? num(detail.previousBalance) + num(detail.monthGross);

  const balancePending =
    num(detail.previousBalance) +
    (detail.monthRows || []).reduce((s, r) => s + num(r.balance), 0) +
    (detail.clearanceRows || []).reduce((s, r) => s + num(r.balance), 0);

  if ((detail.clearanceRows || []).length > 0 || balancePending > 0.001) {
    detail.pendingAfterClearance = balancePending;
  } else {
    detail.pendingAfterClearance = Math.max(0, detail.openingOwed - detail.deducted) + detail.newOnClearance;
  }

  return detail;
}

function mapAdvanceDetail(source, month, year, advanceDeduction, newAdvanceOnClearance = 0) {
  if (source?.detail) {
    return finalizeAdvanceDetail(source.detail, advanceDeduction, newAdvanceOnClearance);
  }

  const monthAdvances = source?.monthRows || source?.monthAdvances || [];
  const allAdvances = [
    ...(source?.previousRows || []),
    ...(source?.clearanceRows || []),
    ...monthAdvances.map((a) => ({
      ...a,
      advanceDate: a.advanceDate || a.date,
      settledAmount: a.settledAmount ?? a.settled ?? 0,
      notes: a.notes || "",
    })),
  ];

  return finalizeAdvanceDetail(
    buildAdvanceReceiptDetail(allAdvances, month, year, {
      advanceDeduction,
      newAdvanceOnClearance,
    }),
    advanceDeduction,
    newAdvanceOnClearance
  );
}

function buildAdvanceSummaryText(advanceDetail) {
  const opening = advanceDetail.openingOwed ?? num(advanceDetail.previousBalance) + num(advanceDetail.monthGross);
  const notRecovered = Math.max(opening - num(advanceDetail.deducted), 0);
  const newAdv = num(advanceDetail.newOnClearance);
  if (notRecovered <= 0 && newAdv <= 0) return null;
  const chunks = [];
  if (notRecovered > 0) {
    chunks.push(
      `${formatCurrency(notRecovered)} not recovered from prior + this month advances`
    );
  }
  if (newAdv > 0) {
    chunks.push(`${formatCurrency(newAdv)} new advance paid at clearance (not deducted from salary)`);
  }
  return `${chunks.join(" · ")}.`;
}

export function buildSalarySlipReceipt({ record, preview, company = {}, clearanceExtras = {} }) {
  const companyName = company.company_name || "Omni Hub";
  const base = {
    company: {
      name: companyName,
      address: companyAddressLine(company),
      phone: company.phone || company.company_phone || "",
      email: company.email || company.company_email || "",
      ntn: company.ntn || "",
    },
    printedAt: new Date().toLocaleString("en-US"),
    isPreview: false,
    notes: "",
  };

  const newAdvanceOnClearance = num(clearanceExtras.newAdvanceAmount);

  if (preview) {
    const { employee, period, attendance, rates, earnings, advances, totals, commission } = preview;
    const advanceDeduction = num(totals.advanceDeduction ?? advances.pendingTotal);
    const bonus = preview.existingRecord?.bonus ?? num(clearanceExtras.bonus);
    const advanceDetail = mapAdvanceDetail(
      advances,
      period.month,
      period.year,
      advanceDeduction,
      newAdvanceOnClearance
    );
    const salaryBreakdown = buildSalaryBreakdown({
      earnings,
      rates,
      attendance,
      calendarDays: period.calendarDays,
      commission,
      bonus,
      deductions: { absence: earnings.absenceDeduction },
    });

    const totalDisbursement =
      num(clearanceExtras.totalDisbursement) ||
      num(totals.netPayable) + newAdvanceOnClearance;

    return {
      ...base,
      isPreview: !preview.existingRecord?.id,
      ref: buildReceiptRef({
        id: preview.existingRecord?.id,
        month: period.month,
        year: period.year,
        isPreview: !preview.existingRecord?.id,
      }),
      status: preview.existingRecord?.status || "preview",
      periodLabel: `${period.monthName} ${period.year}`,
      periodMonth: period.month,
      periodYear: period.year,
      calendarDays: period.calendarDays,
      paymentDate: preview.existingRecord?.paymentDate || clearanceExtras.paymentDate || null,
      employee: {
        id: employee.id,
        name: employee.name,
        fatherName: employee.fatherName,
        cnic: employee.cnic,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        contractSalary: employee.contractSalary,
      },
      attendance,
      rates,
      salaryBreakdown,
      earnings: {
        contractSalary: earnings.contractSalary,
        grossEarned: earnings.grossEarned,
        bonus,
        commission: commission || 0,
      },
      deductions: {
        absence: earnings.absenceDeduction,
        absenceNote: earnings.absenceNote,
        advance: advanceDeduction,
      },
      advanceDetail,
      advanceSummaryText: buildAdvanceSummaryText(advanceDetail),
      payment: {
        salaryNet: num(totals.netPayable),
        cash: num(clearanceExtras.cashAmount) || preview.existingRecord?.cashAmount || 0,
        bank: num(clearanceExtras.bankAmount) || preview.existingRecord?.bankAmount || 0,
        total: preview.existingRecord?.paidAmount || num(totals.netPayable),
        newAdvance: newAdvanceOnClearance,
        totalDisbursement,
        method: clearanceExtras.paymentMethod || preview.existingRecord?.paymentMethod || "cash",
        accountName: clearanceExtras.paymentAccountName || null,
      },
      netPayable: num(totals.netPayable),
      notes: preview.existingRecord?.notes || clearanceExtras.notes || "",
    };
  }

  if (!record) return null;

  const emp = record.employee || {};
  const adv = record.advanceSummary || {};
  const monthName = MONTHS[(record.month || 1) - 1];
  const clearanceFromRows = (adv.clearanceRows || adv.detail?.clearanceRows || []).reduce(
    (s, r) => s + num(r.amount),
    0
  );
  const advanceDetail = mapAdvanceDetail(
    adv,
    record.month,
    record.year,
    record.advanceDeduction,
    clearanceFromRows
  );
  const salaryBreakdown = buildSalaryBreakdown({
    earnings: {
      contractSalary: num(record.baseSalary),
      grossEarned: Math.max(num(record.baseSalary) - num(record.deductions), 0),
      absenceDeduction: num(record.deductions),
      bonus: num(record.bonus),
    },
    rates: null,
    attendance: null,
    calendarDays: null,
    commission: num(record.commissionBonus),
    bonus: num(record.bonus),
    deductions: { absence: num(record.deductions) },
  });

  return {
    ...base,
    ref: buildReceiptRef({ id: record.id, month: record.month, year: record.year }),
    status: record.status || "pending",
    periodLabel: `${monthName} ${record.year}`,
    periodMonth: record.month,
    periodYear: record.year,
    calendarDays: null,
    paymentDate: record.paymentDate,
    employee: {
      id: emp.id,
      name: emp.name,
      fatherName: emp.fatherName,
      cnic: emp.cnic,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      contractSalary: record.baseSalary ?? emp.salary,
    },
    attendance: null,
    rates: null,
    salaryBreakdown,
    earnings: {
      contractSalary: num(record.baseSalary),
      grossEarned: Math.max(num(record.baseSalary) - num(record.deductions), 0),
      bonus: num(record.bonus),
      commission: num(record.commissionBonus),
    },
    deductions: {
      absence: num(record.deductions),
      absenceNote: "",
      advance: num(record.advanceDeduction),
    },
    advanceDetail,
    advanceSummaryText: buildAdvanceSummaryText(advanceDetail),
    payment: {
      salaryNet: num(record.netSalary),
      cash: num(record.cashAmount),
      bank: num(record.bankAmount),
      total: num(record.paidAmount),
      newAdvance: advanceDetail.newOnClearance,
      totalDisbursement: num(record.paidAmount) + advanceDetail.newOnClearance,
      method: record.paymentMethod || "cash",
      accountName: record.cashAccountName || record.bankAccountName || null,
    },
    netPayable: num(record.netSalary),
    notes: record.notes || "",
  };
}
