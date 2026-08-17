import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { userCanAccessAccount } from "@/lib/accountAccess";
import { findPartyEntityByAccount } from "@/lib/accountRelations";
import { LEDGER_ENTRY_ORDER } from "@/lib/ledger";
import { trimOrNull } from "@/lib/stringUtils";
import { syncAccountBalanceFromForm } from "@/lib/accountOpening";

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
      orderBy: LEDGER_ENTRY_ORDER,
    });

    const { partyEntity, bankMeta, entityId } = await findPartyEntityByAccount(account);

    return Response.json({
      success: true,
      account,
      ledgerEntries,
      partyEntity,
      bankMeta,
      entityId,
    });
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

    const account = await runTransaction(async (tx) => {
      const updated = await tx.account.update({
        where: { id: accountId },
        data: {
          name: body.name?.trim() || undefined,
          city: body.city !== undefined ? trimOrNull(body.city) : undefined,
          phone: body.phone !== undefined ? trimOrNull(body.phone) : undefined,
          whatsappNumber: body.whatsappNumber !== undefined ? trimOrNull(body.whatsappNumber) : undefined,
          cnic: body.cnic !== undefined ? trimOrNull(body.cnic) : undefined,
          address: body.address !== undefined ? trimOrNull(body.address) : undefined,
          reference: body.reference !== undefined ? trimOrNull(body.reference) : undefined,
          isActive: body.isActive !== undefined ? body.isActive : undefined,
          ownerUserId:
            body.ownerUserId === null || body.ownerUserId === ""
              ? null
              : body.ownerUserId !== undefined
                ? parseInt(body.ownerUserId, 10)
                : undefined,
        },
      });

      await syncAccountBalanceFromForm(tx, accountId, body.currentBalance);

      if (body.bankMeta && updated.category === "bank") {
        const bm = body.bankMeta;
        const existingBank = await tx.bankAccount.findFirst({
          where: { ledgerAccountId: accountId },
        });
        if (existingBank) {
          await tx.bankAccount.update({
            where: { id: existingBank.id },
            data: {
              bankName: bm.bankName ?? existingBank.bankName,
              accountTitle: bm.accountTitle ?? existingBank.accountTitle,
              accountNumber: bm.accountNumber ?? existingBank.accountNumber,
              branchCode: bm.branchCode ?? existingBank.branchCode,
              branchName: bm.branchName ?? existingBank.branchName,
            },
          });
        }
      }

      if (body.ownerUserId !== undefined && updated.category === "cash") {
        const ownerId =
          body.ownerUserId === null || body.ownerUserId === ""
            ? null
            : parseInt(body.ownerUserId, 10);
        if (ownerId) {
          await tx.user.update({
            where: { id: ownerId },
            data: { cashAccountId: accountId },
          });
        }
      }

      return updated;
    });

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

    await runTransaction(async (tx) => {
      await tx.user.updateMany({
        where: { cashAccountId: accountId },
        data: { cashAccountId: null },
      });
      await tx.employee.updateMany({
        where: { cashAccountId: accountId },
        data: { cashAccountId: null },
      });
      await tx.bankAccount.deleteMany({ where: { ledgerAccountId: accountId } });
      if (account.category === "vehicle") {
        const vehicle = await tx.vehicle.findFirst({ where: { accountId } });
        if (vehicle) {
          const transportCount = await tx.transport.count({ where: { vehicleId: vehicle.id } });
          if (transportCount > 0) {
            throw new Error("Cannot delete vehicle account with transport history");
          }
          await tx.vehicle.delete({ where: { id: vehicle.id } });
        }
      }
      await tx.account.delete({ where: { id: accountId } });
    });

    return Response.json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
