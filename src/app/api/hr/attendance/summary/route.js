import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  buildMonthlySummary,
  computeAttendancePayroll,
  monthDateRange,
} from "@/lib/attendance";
import {
  getPendingAdvanceTotal,
  getPendingCommissionTotal,
} from "@/lib/hrPayroll";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const month = parseInt(searchParams.get("month"), 10);
    const year = parseInt(searchParams.get("year"), 10);

    if (!employeeId || !month || !year) {
      return Response.json(
        { error: "employeeId, month, and year are required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId, 10) },
      select: {
        id: true,
        name: true,
        department: true,
        salary: true,
        allowedAbsences: true,
        absenceDeductionPerDay: true,
      },
    });

    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    const start = monthDateRange(year, month).start;
    const end = monthDateRange(year, month).end;

    const [attendance, pendingAdvance, pendingCommission] = await Promise.all([
      prisma.employeeAttendance.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: start, lte: end },
        },
        orderBy: { date: "asc" },
      }),
      getPendingAdvanceTotal(prisma, employee.id),
      getPendingCommissionTotal(prisma, employee.id, month, year),
    ]);

    const summaryRows = buildMonthlySummary([employee], attendance, year, month);
    const summary = summaryRows[0];
    const payroll = computeAttendancePayroll(employee, summary);

    return Response.json({
      success: true,
      employee,
      summary,
      payroll,
      pendingAdvance,
      pendingCommission,
      attendance,
    });
  } catch (error) {
    console.error("Attendance summary error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
