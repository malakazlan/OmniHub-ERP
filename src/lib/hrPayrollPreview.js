import { computeNetSalary } from "@/lib/hrPayroll";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function buildSalaryClearancePreview({
  employee,
  month,
  year,
  summary,
  payroll,
  pendingAdvance = 0,
  pendingCommission = 0,
  monthAdvances = [],
  advanceDetail = null,
  existingRecord = null,
  bonus = 0,
}) {
  const contractSalary = payroll?.baseSalary ?? employee?.salary ?? 0;
  const absenceDeduction = payroll?.deductions ?? 0;
  const basePayAfterAttendance = payroll?.grossEarned ?? Math.max(contractSalary - absenceDeduction, 0);
  const grossPay = basePayAfterAttendance + (parseFloat(bonus) || 0) + pendingCommission;
  const netPayable = computeNetSalary({
    baseSalary: contractSalary,
    bonus,
    deductions: absenceDeduction,
    advanceDeduction: pendingAdvance,
    commissionBonus: pendingCommission,
  });

  const monthAdvanceTotal = monthAdvances.reduce((s, a) => s + (a.amount || 0), 0);

  return {
    period: {
      month,
      year,
      monthName: MONTH_NAMES[month - 1] || String(month),
      calendarDays: payroll?.calendarDays ?? summary?.days ?? 0,
    },
    employee: {
      id: employee.id,
      name: employee.name,
      fatherName: employee.fatherName,
      cnic: employee.cnic,
      phone: employee.phone,
      designation: employee.designation,
      department: employee.department,
      contractSalary,
    },
    attendance: {
      days: summary?.days ?? payroll?.calendarDays ?? 0,
      present: summary?.present ?? payroll?.present ?? 0,
      absent: summary?.absent ?? payroll?.absent ?? 0,
      leave: summary?.leave ?? payroll?.leave ?? 0,
      holiday: summary?.holiday ?? payroll?.holiday ?? 0,
      half_day: summary?.half_day ?? payroll?.half_day ?? 0,
      working: payroll?.effectivePresent ?? summary?.effectivePresent ?? 0,
      allowedAbsences: payroll?.allowedAbsences ?? 0,
      chargeableAbsences: payroll?.chargeableAbsences ?? 0,
    },
    rates: {
      dailyRate: payroll?.perDayDeduction ?? 0,
      halfDayRate: payroll?.halfDayDeduction ?? 0,
    },
    earnings: {
      contractSalary,
      absenceDeduction,
      absenceNote: payroll
        ? `${payroll.chargeableAbsences} day deductible of ${payroll.absent} (${payroll.allowedAbsences} allowed)`
        : "",
      grossEarned: basePayAfterAttendance,
      basePayAfterAttendance,
    },
    commission: pendingCommission,
    advances: {
      pendingTotal: pendingAdvance,
      monthAdvances,
      monthTotal: monthAdvanceTotal,
      previousRows: advanceDetail?.previousRows ?? [],
      previousBalance: advanceDetail?.previousBalance ?? Math.max(pendingAdvance - monthAdvanceTotal, 0),
      detail: advanceDetail,
    },
    totals: {
      grossPay,
      advanceDeduction: pendingAdvance,
      netPayable,
      totalDisbursement: netPayable,
    },
    existingRecord,
  };
}
