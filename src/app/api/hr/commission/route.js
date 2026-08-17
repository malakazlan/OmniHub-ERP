import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { syncCommissionsFromSales, MONTH_NAMES } from "@/lib/hrPayroll";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const sync = searchParams.get("sync") === "1";

    if (sync && canManage(user)) {
      await syncCommissionsFromSales(prisma, month, year);
    }

    const commissions = await prisma.employeeCommission.findMany({
      where: { month, year },
      include: {
        employee: { select: { id: true, name: true, department: true, commissionRate: true } },
      },
      orderBy: [{ commissionDate: "desc" }, { id: "desc" }],
    });

    const summary = commissions.reduce(
      (acc, row) => {
        acc.total += row.commissionAmount || 0;
        if (row.status === "pending") acc.pending += row.commissionAmount || 0;
        return acc;
      },
      { total: 0, pending: 0 }
    );

    return Response.json({
      success: true,
      commissions,
      summary,
      month,
      year,
      monthName: MONTH_NAMES[month - 1],
    });
  } catch (error) {
    console.error("List commissions error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const employeeId = parseInt(body.employeeId, 10);
    const commissionAmount = parseFloat(body.commissionAmount) || 0;
    const month = parseInt(body.month, 10);
    const year = parseInt(body.year, 10);

    if (!employeeId || commissionAmount <= 0 || !month || !year) {
      return Response.json({ error: "Employee, amount, month and year are required" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

    const commission = await prisma.employeeCommission.create({
      data: {
        employeeId,
        commissionDate: body.commissionDate ? new Date(body.commissionDate) : new Date(),
        saleAmount: parseFloat(body.saleAmount) || 0,
        commissionRate: parseFloat(body.commissionRate) || employee.commissionRate || 0,
        commissionAmount,
        month,
        year,
        notes: body.notes?.trim() || null,
        status: "pending",
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    return Response.json({ success: true, commission }, { status: 201 });
  } catch (error) {
    console.error("Create commission error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
