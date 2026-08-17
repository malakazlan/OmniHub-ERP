import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  getSalaryReviewReminders,
  getPendingAdvanceTotal,
  getPendingCommissionTotal,
  computeNetSalary,
  MONTH_NAMES,
} from "@/lib/hrPayroll";
import {
  buildMonthlySummary,
  computeAttendancePayroll,
} from "@/lib/attendance";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const reminders = await getSalaryReviewReminders(prisma, month, year);

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, salary: true },
    });

    let missingSalary = 0;
    let pendingPayment = 0;
    for (const r of reminders) {
      if (r.type === "missing_salary") missingSalary += 1;
      if (r.type === "pending_payment") pendingPayment += 1;
    }

    return Response.json({
      success: true,
      reminders,
      month,
      year,
      monthName: MONTH_NAMES[month - 1],
      summary: {
        total: reminders.length,
        missingSalary,
        pendingPayment,
        activeEmployees: employees.length,
      },
    });
  } catch (error) {
    console.error("Salary reminders error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Payroll preview for clearance screen */
export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const month = parseInt(body.month, 10);
    const year = parseInt(body.year, 10);
    const employeeId = parseInt(body.employeeId, 10);

    if (!employeeId || !month || !year) {
      return Response.json({ error: "Employee, month and year required" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

    const pendingAdvance = await getPendingAdvanceTotal(prisma, employeeId);
    const pendingCommission = await getPendingCommissionTotal(prisma, employeeId, month, year);

    const existing = await prisma.salaryRecord.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const attendanceRows = await prisma.employeeAttendance.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
    });
    const summaryRows = buildMonthlySummary([employee], attendanceRows, year, month);
    const attendancePayroll = computeAttendancePayroll(employee, summaryRows[0]);

    const suggestedBase = attendancePayroll.baseSalary;
    const suggestedDeductions = attendancePayroll.deductions;

    return Response.json({
      success: true,
      employee,
      pendingAdvance,
      pendingCommission,
      attendance: summaryRows[0] || null,
      attendancePayroll,
      suggested: {
        baseSalary: suggestedBase,
        deductions: suggestedDeductions,
        advanceDeduction: pendingAdvance,
        commissionBonus: pendingCommission,
        netSalary: computeNetSalary({
          baseSalary: suggestedBase,
          deductions: suggestedDeductions,
          advanceDeduction: pendingAdvance,
          commissionBonus: pendingCommission,
        }),
      },
      existing,
    });
  } catch (error) {
    console.error("Clearance preview error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
