import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "accountant")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const categoryId = parseInt(id, 10);
    const { name, code, description } = await req.json();

    const category = await prisma.expenseCategory.update({
      where: { id: categoryId },
      data: { name, code: code || null, description: description || null },
    });

    return Response.json({ success: true, category });
  } catch (error) {
    console.error("Update expense category error:", error);
    if (error.code === "P2002") {
      return Response.json({ error: "Category with this name already exists" }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const categoryId = parseInt(id, 10);

    const expenseCount = await prisma.expense.count({ where: { categoryId } });
    if (expenseCount > 0) {
      return Response.json({ error: "Cannot delete category with recorded expenses" }, { status: 400 });
    }

    await prisma.expenseCategory.delete({ where: { id: categoryId } });

    logActivity({ userId: user.userId, action: "DELETE", module: "accounts", entityType: "ExpenseCategory", entityId: categoryId, req });

    return Response.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete expense category error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
