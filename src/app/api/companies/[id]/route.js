import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { LEDGER_ENTRY_ORDER } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { syncAccountBalanceFromForm, updateOpeningBalanceDate } from "@/lib/accountOpening";

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const companyId = parseInt(id);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        saleOrders: { orderBy: { saleDate: "desc" }, take: 10 },
        purchaseOrders: { orderBy: { purchaseDate: "desc" }, take: 10 },
      },
    });

    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    let balance = 0;
    let ledgerEntries = [];
    if (company.accountId) {
      const account = await prisma.account.findUnique({ where: { id: company.accountId } });
      balance = account?.balance || 0;
      ledgerEntries = await prisma.ledgerEntry.findMany({
        where: { accountId: company.accountId },
        orderBy: LEDGER_ENTRY_ORDER,
      });
    }

    return Response.json({ success: true, company, balance, ledgerEntries });
  } catch (error) {
    console.error("Fetch company error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const companyId = parseInt(id);
    const body = await req.json();

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const updated = await runTransaction(async (tx) => {
      const c = await tx.company.update({
        where: { id: companyId },
        data: {
          name: body.name,
          contactPerson: body.contactPerson,
          phone: body.phone,
          whatsappNumber: body.whatsappNumber,
          email: body.email,
          ntn: body.ntn,
          strn: body.strn,
          city: body.city,
          address: body.address,
          companyType: body.companyType,
          bankName: body.bankName,
          bankAccountNo: body.bankAccountNo,
          creditLimit: body.creditLimit !== undefined ? parseFloat(body.creditLimit) : company.creditLimit,
          notes: body.notes,
          isActive: body.isActive !== undefined ? body.isActive : company.isActive,
        },
      });

      if (company.accountId) {
        await tx.account.update({
          where: { id: company.accountId },
          data: {
            name: body.name || c.name,
            city: body.city,
            phone: body.phone,
            whatsappNumber: body.whatsappNumber,
            address: body.address,
            isActive: body.isActive !== undefined ? body.isActive : company.isActive,
          },
        });
        await syncAccountBalanceFromForm(tx, company.accountId, body.currentBalance);
        if (body.openingBalanceDate) {
          await updateOpeningBalanceDate(tx, company.accountId, body.openingBalanceDate);
        }
      }

      return c;
    });

    return Response.json({ success: true, company: updated });
  } catch (error) {
    console.error("Update company error:", error);
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
    const companyId = parseInt(id);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const [saleCount, purchaseCount] = await Promise.all([
      prisma.saleOrder.count({ where: { companyId } }),
      prisma.purchaseOrder.count({ where: { companyId } }),
    ]);

    if (saleCount > 0 || purchaseCount > 0) {
      return Response.json({
        error: "Cannot delete company with transaction history. Suspend the account instead.",
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.company.delete({ where: { id: companyId } });
      if (company.accountId) {
        await tx.account.delete({ where: { id: company.accountId } });
      }
    });

    logActivity({ userId: user.userId, action: "DELETE", module: "companies", entityType: "Company", entityId: companyId, details: { name: company.name }, req });

    return Response.json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    console.error("Delete company error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
