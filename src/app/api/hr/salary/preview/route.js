import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  buildMonthlySummary,
  computeAttendancePayroll,
  monthDateRange,
  toDateKey,
} from "@/lib/attendance";
import {
  getPendingAdvanceTotal,
  getPendingCommissionTotal,
  buildAdvanceReceiptDetail,
} from "@/lib/hrPayroll";
import { buildSalaryClearancePreview } from "@/lib/hrPayrollPreview";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = parseInt(searchParams.get("employeeId"), 10);
    const month = parseInt(searchParams.get("month"), 10);
    const year = parseInt(searchParams.get("year"), 10);

    if (!employeeId || !month || !year) {
      return Response.json({ error: "employeeId, month, and year are required" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

    const { start, end } = monthDateRange(year, month);

    const [
      attendanceRows,
      pendingAdvance,
      pendingCommission,
      monthAdvances,
      allAdvances,
      existingRecord,
    ] = await Promise.all([
      prisma.employeeAttendance.findMany({
        where: { employeeId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
      }),
      getPendingAdvanceTotal(prisma, employeeId),
      getPendingCommissionTotal(prisma, employeeId, month, year),
      prisma.salaryAdvance.findMany({
        where: {
          employeeId,
          advanceDate: { gte: start, lte: end },
        },
        orderBy: { advanceDate: "asc" },
      }),
      prisma.salaryAdvance.findMany({
        where: { employeeId },
        orderBy: [{ advanceDate: "asc" }, { id: "asc" }],
      }),
      prisma.salaryRecord.findUnique({
        where: { employeeId_month_year: { employeeId, month, year } },
      }),
    ]);

    const summaryRows = buildMonthlySummary([employee], attendanceRows, year, month);
    const summary = summaryRows[0];
    const payroll = computeAttendancePayroll(employee, summary);

    const advanceDetail = buildAdvanceReceiptDetail(
      allAdvances.map((a) => ({ ...a, advanceDate: toDateKey(a.advanceDate) })),
      month,
      year,
      { advanceDeduction: existingRecord?.advanceDeduction ?? pendingAdvance }
    );

    const preview = buildSalaryClearancePreview({
      employee,
      month,
      year,
      summary,
      payroll,
      pendingAdvance,
      pendingCommission,
      monthAdvances: monthAdvances.map((a) => ({
        ...a,
        advanceDate: toDateKey(a.advanceDate),
      })),
      advanceDetail,
      existingRecord,
    });

    return Response.json({ success: true, preview, payroll, summary });
  } catch (error) {
    console.error("Salary preview error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
