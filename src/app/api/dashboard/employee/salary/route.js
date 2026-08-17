import { getUserFromRequest } from "@/lib/auth";
import { usesEmployeeDashboard } from "@/lib/employeeDashboard";
import {
  findEmployeeByUserId,
  getEmployeePayrollSnapshot,
} from "@/lib/employeePortalPayroll";
import prisma from "@/lib/prisma";

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
    if (!employee) {
      return Response.json({
        success: true,
        linked: false,
        message: "No employee profile linked to this login.",
      });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    const snapshot = await getEmployeePayrollSnapshot(prisma, employee.id, month, year);

    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    });

    return Response.json({
      success: true,
      linked: true,
      employee,
      period: { month, year, monthName: MONTH_NAMES[month - 1] },
      snapshot,
      salaryRecords,
    });
  } catch (error) {
    console.error("Employee salary portal error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
