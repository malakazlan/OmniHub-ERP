import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";

// GET: List all farmers
export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
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
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;
    const adminOnly = requireProjectAccountsAdmin(user);
    if (adminOnly) return adminOnly;

    const { name, fatherName, cnic, phone, whatsappNumber, city, village, address, bankName, bankAccountNo, notes } = body;

    if (!name) {
      return Response.json({ error: "Farmer name is required" }, { status: 452 });
    }

    // Check if CNIC already exists
    if (cnic) {
      const existingFarmer = await prisma.farmer.findUnique({
        where: { cnic },
      });
      if (existingFarmer) {
        return Response.json({ error: "Farmer with this CNIC already exists" }, { status: 400 });
      }
    }

    // Create Farmer and Account within a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create a matching general ledger account
      const account = await tx.account.create({
        data: {
          name: `${name} (Farmer)`,
          type: "liability", // Payable account (we buy from them)
          category: "farmer",
          city,
          phone,
          whatsappNumber,
          cnic,
          address,
        },
      });

      // 2. Create Farmer record linked to the ledger account
      const newFarmer = await tx.farmer.create({
        data: {
          name,
          fatherName,
          cnic,
          phone,
          whatsappNumber,
          city,
          village,
          address,
          bankName,
          bankAccountNo,
          notes,
          accountId: account.id,
        },
      });

      return newFarmer;
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "farmers", entityType: "Farmer", entityId: result.id, details: { name: result.name }, req });

    return Response.json({ success: true, farmer: result }, { status: 201 });
  } catch (error) {
    console.error("Register farmer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
