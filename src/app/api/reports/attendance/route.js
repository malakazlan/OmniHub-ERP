import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { buildMonthlySummary, countStatuses } from "@/lib/attendance";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [employees, attendance] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, department: true, designation: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.employeeAttendance.findMany({
        where: { date: { gte: start, lte: end } },
        include: { employee: { select: { id: true, name: true, department: true } } },
        orderBy: [{ date: "asc" }, { employeeId: "asc" }],
      }),
    ]);

    const summary = buildMonthlySummary(employees, attendance, year, month);
    const totals = countStatuses(attendance);

    return Response.json({
      success: true,
      month,
      year,
      employees,
      attendance,
      summary,
      totals: {
        ...totals,
        employees: employees.length,
        records: attendance.length,
      },
    });
  } catch (error) {
    console.error("Attendance report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
