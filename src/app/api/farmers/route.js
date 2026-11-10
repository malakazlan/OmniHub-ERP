import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { applyOpeningBalance } from "@/lib/accountOpening";
import { FARMER_ACCOUNT_TYPE } from "@/lib/farmerAccount";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

// GET: List all farmers
export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const farmers = await prisma.farmer.findMany({
      include: {
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch the ledger balances for each farmer
    const farmersWithBalance = await Promise.all(
      farmers.map(async (farmer) => {
        if (!farmer.accountId) return { ...farmer, balance: 0 };
        const account = await prisma.account.findUnique({
          where: { id: farmer.accountId },
          select: { balance: true },
        });
        return {
          ...farmer,
          balance: account ? account.balance : 0,
        };
      })
    );

    return Response.json({ success: true, farmers: farmersWithBalance });
  } catch (error) {
    console.error("List farmers error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Register a new farmer
export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;
    const adminOnly = requireProjectAccountsAdmin(user);
    if (adminOnly) return adminOnly;

    const { name, fatherName, cnic, phone, whatsappNumber, city, village, address, bankName, bankAccountNo, notes, openingBalance } = body;

    if (!name?.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return Response.json({ error: "Phone is required" }, { status: 400 });
    }

    const trimOrNull = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const farmerName = name.trim();
    const farmerPhone = phone.trim();
    const farmerCnic = trimOrNull(cnic);

    if (farmerCnic) {
      const existingFarmer = await prisma.farmer.findUnique({
        where: { cnic: farmerCnic },
      });
      if (existingFarmer) {
        return Response.json({ error: "Farmer with this CNIC already exists" }, { status: 400 });
      }
    }

    // Create Farmer and Account within a Prisma transaction
    const result = await runTransaction(async (tx) => {
      // 1. Create a matching general ledger account
      const account = await tx.account.create({
        data: {
          name: farmerName,
          type: FARMER_ACCOUNT_TYPE,
          category: "farmer",
          city: trimOrNull(city),
          phone: farmerPhone,
          whatsappNumber: trimOrNull(whatsappNumber),
          cnic: farmerCnic,
          address: trimOrNull(address),
        },
      });

      await applyOpeningBalance(tx, account.id, FARMER_ACCOUNT_TYPE, openingBalance, body.openingBalanceDate);

      const newFarmer = await tx.farmer.create({
        data: {
          name: farmerName,
          fatherName: trimOrNull(fatherName),
          cnic: farmerCnic,
          phone: farmerPhone,
          whatsappNumber: trimOrNull(whatsappNumber),
          city: trimOrNull(city),
          village: trimOrNull(village),
          address: trimOrNull(address),
          bankName: trimOrNull(bankName),
          bankAccountNo: trimOrNull(bankAccountNo),
          notes: trimOrNull(notes),
          accountId: account.id,
        },
      });

      return newFarmer;
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "farmers", entityType: "Farmer", entityId: result.id, details: { name: result.name }, req });

    return Response.json({ success: true, farmer: result }, { status: 201 });
  } catch (error) {
    console.error("Register farmer error:", error);
    if (error.code === "P2028") {
      return Response.json(
        { error: "Database busy — check MySQL is running and retry in a moment." },
        { status: 503 }
      );
    }
    if (error.code === "P2002") {
      return Response.json(
        { error: "A farmer with this CNIC already exists." },
        { status: 400 }
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
