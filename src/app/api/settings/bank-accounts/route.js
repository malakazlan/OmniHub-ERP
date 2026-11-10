import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { directoryCreateBlocked } from "@/lib/directoryCreate";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ success: true, bankAccounts });
  } catch (error) {
    console.error("List bank accounts error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;

    const { bankName, accountTitle, accountNumber, branchCode, branchName } = body;

    if (!bankName || !accountTitle || !accountNumber) {
      return Response.json(
        { error: "Bank name, account title, and account number are required" },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        bankName,
        accountTitle,
        accountNumber,
        branchCode: branchCode || null,
        branchName: branchName || null,
      },
    });

    return Response.json({ success: true, bankAccount }, { status: 201 });
  } catch (error) {
    console.error("Create bank account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
