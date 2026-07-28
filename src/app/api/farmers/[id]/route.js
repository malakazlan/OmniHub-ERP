import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

// GET: Fetch a single farmer's details and transaction logs
export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const farmerId = parseInt(id);

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      include: {
        purchases: {
          orderBy: { purchaseDate: "desc" },
          take: 10,
        },
      },
    });

    if (!farmer) {
      return Response.json({ error: "Farmer not found" }, { status: 404 });
    }

    // Load ledger entries
    let ledgerEntries = [];
    let balance = 0;
    if (farmer.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: farmer.accountId },
      });
      balance = account ? account.balance : 0;

      ledgerEntries = await prisma.ledgerEntry.findMany({
        where: { accountId: farmer.accountId },
        orderBy: { date: "desc" },
        take: 20,
      });
    }

    return Response.json({
      success: true,
      farmer,
      balance,
      ledgerEntries,
    });
  } catch (error) {
    console.error("Fetch farmer detail error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT: Update farmer details
export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const farmerId = parseInt(id);
    const body = await req.json();

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
    });

    if (!farmer) {
      return Response.json({ error: "Farmer not found" }, { status: 404 });
    }

    // Update both Farmer and Account inside transaction
    const updatedFarmer = await prisma.$transaction(async (tx) => {
      // 1. Update Farmer
      const f = await tx.farmer.update({
        where: { id: farmerId },
        data: {
          name: body.name,
          fatherName: body.fatherName,
          cnic: body.cnic,
          phone: body.phone,
          whatsappNumber: body.whatsappNumber,
          city: body.city,
          village: body.village,
          address: body.address,
          bankName: body.bankName,
          bankAccountNo: body.bankAccountNo,
          notes: body.notes,
          isActive: body.isActive !== undefined ? body.isActive : farmer.isActive,
        },
      });

      // 2. Update linked Account
      if (farmer.accountId) {
        await tx.account.update({
          where: { id: farmer.accountId },
          data: {
            name: `${body.name || f.name} (Farmer)`,
            city: body.city,
            phone: body.phone,
            whatsappNumber: body.whatsappNumber,
            cnic: body.cnic,
            address: body.address,
            isActive: body.isActive !== undefined ? body.isActive : farmer.isActive,
          },
        });
      }

      return f;
    });

    return Response.json({ success: true, farmer: updatedFarmer });
  } catch (error) {
    console.error("Update farmer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove farmer
export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const farmerId = parseInt(id);

    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
    });

    if (!farmer) {
      return Response.json({ error: "Farmer not found" }, { status: 404 });
    }

    // Check if farmer has purchases (cannot delete if transactions exist)
    const purchaseCount = await prisma.purchaseOrder.count({
      where: { farmerId },
    });

    if (purchaseCount > 0) {
      return Response.json({
        error: "Cannot delete farmer with active purchase history. Suspend the account instead.",
      }, { status: 400 });
    }

    // Delete farmer and account inside transaction
    await prisma.$transaction(async (tx) => {
      await tx.farmer.delete({
        where: { id: farmerId },
      });

      if (farmer.accountId) {
        await tx.account.delete({
          where: { id: farmer.accountId },
        });
      }
    });

    logActivity({ userId: user.userId, action: "DELETE", module: "farmers", entityType: "Farmer", entityId: farmerId, details: { name: farmer.name }, req });

    return Response.json({ success: true, message: "Farmer deleted successfully" });
  } catch (error) {
    console.error("Delete farmer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
