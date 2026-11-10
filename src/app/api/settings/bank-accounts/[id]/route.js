import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const accountId = parseInt(id);
    const body = await req.json();

    const existing = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!existing) {
      return Response.json({ error: "Bank account not found" }, { status: 404 });
    }

    if (!body.bankName || !body.accountTitle || !body.accountNumber) {
      return Response.json(
        { error: "Bank name, account title, and account number are required" },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        bankName: body.bankName,
        accountTitle: body.accountTitle,
        accountNumber: body.accountNumber,
        branchCode: body.branchCode || null,
        branchName: body.branchName || null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    return Response.json({ success: true, bankAccount });
  } catch (error) {
    console.error("Update bank account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const accountId = parseInt(id);

    const existing = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!existing) {
      return Response.json({ error: "Bank account not found" }, { status: 404 });
    }

    await prisma.bankAccount.delete({ where: { id: accountId } });
    return Response.json({ success: true, message: "Bank account deleted successfully" });
  } catch (error) {
    console.error("Delete bank account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
