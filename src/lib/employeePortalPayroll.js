import prisma from "@/lib/prisma";
import {
  buildMonthlySummary,
  computeAttendancePayroll,
  monthDateRange,
  toDateKey,
} from "@/lib/attendance";
import {
  getPendingAdvanceTotal,
  getPendingCommissionTotal,
} from "@/lib/hrPayroll";
import { buildSalaryClearancePreview } from "@/lib/hrPayrollPreview";

/** Payroll snapshot for an employee portal (self-service). */
export async function getEmployeePayrollSnapshot(db, employeeId, month, year) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      cnic: true,
      phone: true,
      designation: true,
      department: true,
      salary: true,
      userId: true,
      allowedAbsences: true,
      absenceDeductionPerDay: true,
    },
  });

  if (!employee) return null;

  const { start, end } = monthDateRange(year, month);

  const [
    attendanceRows,
    pendingAdvance,
    pendingCommission,
    monthAdvances,
    salaryRecord,
  ] = await Promise.all([
    db.employeeAttendance.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    }),
    getPendingAdvanceTotal(db, employeeId),
    getPendingCommissionTotal(db, employeeId, month, year),
    db.salaryAdvance.findMany({
      where: { employeeId, advanceDate: { gte: start, lte: end } },
      orderBy: { advanceDate: "asc" },
    }),
    db.salaryRecord.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    }),
  ]);

  const summaryRows = buildMonthlySummary([employee], attendanceRows, year, month);
  const summary = summaryRows[0];
  const payroll = computeAttendancePayroll(employee, summary);

  const preview = buildSalaryClearancePreview({
    employee,
    month,
    year,
    summary,
    payroll,
    pendingAdvance: salaryRecord ? salaryRecord.advanceDeduction : pendingAdvance,
    pendingCommission: salaryRecord ? salaryRecord.commissionBonus : pendingCommission,
    monthAdvances: monthAdvances.map((a) => ({
      ...a,
      advanceDate: toDateKey(a.advanceDate),
    })),
    existingRecord: salaryRecord,
    bonus: salaryRecord?.bonus ?? 0,
  });

  return {
    preview,
    payroll,
    summary,
    attendance: attendanceRows.map((r) => ({
      ...r,
      date: toDateKey(r.date),
    })),
    salaryRecord,
    isPosted: !!salaryRecord,
  };
}

export async function findEmployeeByUserId(db, userId) {
  if (!userId) return null;
  return db.employee.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      designation: true,
      department: true,
      salary: true,
      joiningDate: true,
      phone: true,
      cnic: true,
      isActive: true,
      userId: true,
      allowedAbsences: true,
      absenceDeductionPerDay: true,
    },
  });
}
