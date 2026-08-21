import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { applyOpeningBalance } from "@/lib/accountOpening";

function getAccountType(companyType) {
  if (companyType === "supplier") return "liability";
  return "asset";
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const companies = await prisma.company.findMany({
      include: {
        saleOrders: { select: { totalAmount: true, paidAmount: true } },
        purchaseOrders: { select: { totalAmount: true, paidAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const companiesWithBalance = await Promise.all(
      companies.map(async (company) => {
        if (!company.accountId) return { ...company, balance: 0 };
        const account = await prisma.account.findUnique({
          where: { id: company.accountId },
          select: { balance: true },
        });
        return { ...company, balance: account?.balance || 0 };
      })
    );

    return Response.json({ success: true, companies: companiesWithBalance });
  } catch (error) {
    console.error("List companies error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;
    const adminOnly = requireProjectAccountsAdmin(user);
    if (adminOnly) return adminOnly;

    const {
      name, contactPerson, phone, whatsappNumber, email, ntn, strn,
      city, address, companyType, bankName, bankAccountNo, creditLimit, notes, openingBalance,
    } = body;

    if (!name?.trim()) return Response.json({ error: "Company name is required" }, { status: 400 });
    if (!phone?.trim()) return Response.json({ error: "Phone is required" }, { status: 400 });

    const type = companyType || "both";

    const result = await runTransaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: name.trim(),
          type: getAccountType(type),
          category: "company",
          city: city || null,
          phone: phone.trim(),
          whatsappNumber: whatsappNumber || null,
          address: address || null,
        },
      });

      await applyOpeningBalance(tx, account.id, getAccountType(type), openingBalance, body.openingBalanceDate);

      const company = await tx.company.create({
        data: {
          name,
          contactPerson,
          phone,
          whatsappNumber,
          email,
          ntn,
          strn,
          city,
          address,
          companyType: type,
          bankName,
          bankAccountNo,
          creditLimit: parseFloat(creditLimit) || 0,
          notes,
          accountId: account.id,
        },
      });

      return company;
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "companies", entityType: "Company", entityId: result.id, details: { name: result.name }, req });

    return Response.json({ success: true, company: result }, { status: 201 });
  } catch (error) {
    console.error("Create company error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
