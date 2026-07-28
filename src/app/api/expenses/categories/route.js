import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const categories = await prisma.expenseCategory.findMany({
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, categories });
  } catch (error) {
    console.error("List expense categories error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "accountant")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, code, description } = await req.json();
    if (!name) return Response.json({ error: "Category name is required" }, { status: 400 });

    const category = await prisma.expenseCategory.create({
      data: { name, code: code || null, description: description || null },
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "accounts", entityType: "ExpenseCategory", entityId: category.id, details: { name }, req });

    return Response.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error("Create expense category error:", error);
    if (error.code === "P2002") {
      return Response.json({ error: "Category with this name already exists" }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
