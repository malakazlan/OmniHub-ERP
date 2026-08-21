import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { LEDGER_ENTRY_ORDER } from "@/lib/ledger";
import { trimOrNull } from "@/lib/stringUtils";
import { syncAccountBalanceFromForm, updateOpeningBalanceDate } from "@/lib/accountOpening";

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
        orderBy: LEDGER_ENTRY_ORDER,
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

    const trim = trimOrNull;
    const farmerName = trim(body.name) || farmer.name;
    const farmerPhone = body.phone !== undefined ? trim(body.phone) : farmer.phone;
    const farmerCnic = body.cnic !== undefined ? trim(body.cnic) : farmer.cnic;

    if (farmerCnic && farmerCnic !== farmer.cnic) {
      const duplicate = await prisma.farmer.findFirst({
        where: { cnic: farmerCnic, NOT: { id: farmerId } },
      });
      if (duplicate) {
        return Response.json({ error: "Another farmer already uses this CNIC" }, { status: 400 });
      }
    }

    const updatedFarmer = await runTransaction(async (tx) => {
      const f = await tx.farmer.update({
        where: { id: farmerId },
        data: {
          name: farmerName,
          fatherName: body.fatherName !== undefined ? trim(body.fatherName) : farmer.fatherName,
          cnic: farmerCnic,
          phone: farmerPhone,
          whatsappNumber: body.whatsappNumber !== undefined ? trim(body.whatsappNumber) : farmer.whatsappNumber,
          city: body.city !== undefined ? trim(body.city) : farmer.city,
          village: body.village !== undefined ? trim(body.village) : farmer.village,
          address: body.address !== undefined ? trim(body.address) : farmer.address,
          bankName: body.bankName !== undefined ? trim(body.bankName) : farmer.bankName,
          bankAccountNo: body.bankAccountNo !== undefined ? trim(body.bankAccountNo) : farmer.bankAccountNo,
          notes: body.notes !== undefined ? trim(body.notes) : farmer.notes,
          isActive: body.isActive !== undefined ? body.isActive : farmer.isActive,
        },
      });

      if (farmer.accountId) {
        await tx.account.update({
          where: { id: farmer.accountId },
          data: {
            name: farmerName,
            city: f.city,
            phone: farmerPhone,
            whatsappNumber: f.whatsappNumber,
            cnic: farmerCnic,
            address: f.address,
            isActive: f.isActive,
          },
        });
        await syncAccountBalanceFromForm(tx, farmer.accountId, body.currentBalance);
        if (body.openingBalanceDate) {
          await updateOpeningBalanceDate(tx, farmer.accountId, body.openingBalanceDate);
        }
      }

      return f;
    });

    return Response.json({ success: true, farmer: updatedFarmer });
  } catch (error) {
    console.error("Update farmer error:", error);
    if (error.code === "P2028") {
      return Response.json(
        { error: "Database busy — check MySQL is running and retry in a moment." },
        { status: 503 }
      );
    }
    if (error.code === "P2002") {
      return Response.json({ error: "A farmer with this CNIC already exists." }, { status: 400 });
    }
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
    await runTransaction(async (tx) => {
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
