import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { usesEmployeeDashboard } from "@/lib/employeeDashboard";
import {
  findEmployeeByUserId,
  getEmployeePayrollSnapshot,
} from "@/lib/employeePortalPayroll";
import { monthDateRange } from "@/lib/attendance";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(req) {
  try {
    const auth = getUserFromRequest(req);
    if (!auth?.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        allowedModules: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      allowedModules: JSON.parse(user.allowedModules || "[]"),
    };

    if (!usesEmployeeDashboard(sessionUser)) {
      return Response.json({ error: "Use operations dashboard" }, { status: 403 });
    }

    const employee = await findEmployeeByUserId(prisma, user.id);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start, end } = monthDateRange(year, month);

    let attendance = [];
    let attendanceSummary = { present: 0, absent: 0, half_day: 0, leave: 0, holiday: 0, other: 0 };
    let salaryRecords = [];
    let payrollSnapshot = null;
    let orderSummary = null;

    if (employee) {
      attendance = await prisma.employeeAttendance.findMany({
        where: { employeeId: employee.id, date: { gte: start, lte: end } },
        orderBy: { date: "desc" },
      });

      for (const row of attendance) {
        const key = attendanceSummary[row.status] !== undefined ? row.status : "other";
        if (attendanceSummary[key] !== undefined) attendanceSummary[key] += 1;
        else attendanceSummary.other += 1;
      }

      salaryRecords = await prisma.salaryRecord.findMany({
        where: { employeeId: employee.id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
      });

      payrollSnapshot = await getEmployeePayrollSnapshot(prisma, employee.id, month, year);

      if (sessionUser.allowedModules.includes("orders") || sessionUser.role === "salesperson") {
        const [pending, accepted, converted] = await Promise.all([
          prisma.customerOrder.count({ where: { createdById: user.id, status: "pending" } }),
          prisma.customerOrder.count({ where: { createdById: user.id, status: "accepted" } }),
          prisma.customerOrder.count({
            where: {
              createdById: user.id,
              status: "converted",
              orderDate: { gte: start, lte: end },
            },
          }),
        ]);
        orderSummary = { pending, accepted, convertedThisMonth: converted };
      }
    }

    const latestSalary = salaryRecords[0] || null;

    return Response.json({
      success: true,
      user: sessionUser,
      employee,
      linked: !!employee,
      period: { month, year, monthName: MONTH_NAMES[month - 1] },
      attendance,
      attendanceSummary,
      salaryRecords,
      latestSalary,
      payrollSnapshot,
      orderSummary,
    });
  } catch (error) {
    console.error("Employee dashboard error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
