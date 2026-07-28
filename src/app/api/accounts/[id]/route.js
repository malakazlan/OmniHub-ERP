import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { userCanAccessAccount } from "@/lib/accountAccess";

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const accountId = parseInt(id);

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

    const allowed = await userCanAccessAccount(prisma, user, accountId);
    if (!allowed) return Response.json({ error: "You do not have access to this account" }, { status: 403 });

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { accountId },
      orderBy: { date: "desc" },
      take: 50,
    });

    return Response.json({ success: true, account, ledgerEntries });
  } catch (error) {
    console.error("Fetch account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can update accounts" }, { status: 403 });
    }

    const { id } = await params;
    const accountId = parseInt(id);
    const body = await req.json();

    const account = await prisma.account.update({
      where: { id: accountId },
      data: {
        name: body.name,
        city: body.city,
        phone: body.phone,
        whatsappNumber: body.whatsappNumber,
        address: body.address,
        reference: body.reference,
        isActive: body.isActive,
        ownerUserId:
          body.ownerUserId === null || body.ownerUserId === ""
            ? null
            : body.ownerUserId !== undefined
              ? parseInt(body.ownerUserId, 10)
              : undefined,
      },
    });

    if (body.ownerUserId !== undefined && account.category === "cash") {
      const ownerId =
        body.ownerUserId === null || body.ownerUserId === ""
          ? null
          : parseInt(body.ownerUserId, 10);
      if (ownerId) {
        await prisma.user.update({
          where: { id: ownerId },
          data: { cashAccountId: accountId },
        });
      }
    }

    return Response.json({ success: true, account });
  } catch (error) {
    console.error("Update account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete accounts" }, { status: 403 });
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    const entryCount = await prisma.ledgerEntry.count({ where: { accountId } });
    if (entryCount > 0 || Math.abs(account.balance || 0) > 0.005) {
      return Response.json(
        {
          error:
            "Cannot delete an account with ledger activity or non-zero balance. Set it inactive instead.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { cashAccountId: accountId },
        data: { cashAccountId: null },
      });
      await tx.employee.updateMany({
        where: { cashAccountId: accountId },
        data: { cashAccountId: null },
      });
      await tx.bankAccount.deleteMany({ where: { ledgerAccountId: accountId } });
      await tx.account.delete({ where: { id: accountId } });
    });

    return Response.json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
