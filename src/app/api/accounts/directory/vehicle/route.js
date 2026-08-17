import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { generateAccountCode } from "@/lib/receipt";
import { applyOpeningBalance } from "@/lib/accountOpening";
import { logActivity } from "@/lib/activityLog";
import { trimOrNull } from "@/lib/stringUtils";

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;
    const adminOnly = requireProjectAccountsAdmin(user);
    if (adminOnly) return adminOnly;

    const {
      registrationNumber,
      vehicleType,
      make,
      model,
      year,
      capacity,
      driverName,
      driverPhone,
      isOwned,
      openingBalance,
      notes,
      isActive,
    } = body;

    const regNo = registrationNumber?.trim();
    const type = vehicleType?.trim();
    const phone = driverPhone?.trim();

    if (!regNo) {
      return Response.json({ error: "Registration number is required" }, { status: 400 });
    }
    if (!type) {
      return Response.json({ error: "Vehicle type is required" }, { status: 400 });
    }
    if (!phone) {
      return Response.json({ error: "Driver phone is required" }, { status: 400 });
    }

    const existing = await prisma.vehicle.findUnique({ where: { registrationNumber: regNo } });
    if (existing) {
      return Response.json({ error: "Vehicle with this registration already exists" }, { status: 400 });
    }

    const displayName = `${regNo} (${type.charAt(0).toUpperCase()}${type.slice(1)})`;
    const code = await generateAccountCode("vehicle");

    const result = await runTransaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: displayName,
          code,
          type: "asset",
          category: "vehicle",
          phone,
          reference: regNo,
          isActive: isActive !== false,
        },
      });

      await applyOpeningBalance(tx, account.id, "asset", openingBalance);

      const vehicle = await tx.vehicle.create({
        data: {
          registrationNumber: regNo,
          vehicleType: type,
          make: trimOrNull(make),
          model: trimOrNull(model),
          year: year ? parseInt(year, 10) : null,
          capacity: parseFloat(capacity) || 0,
          driverName: trimOrNull(driverName),
          driverPhone: phone,
          isOwned: isOwned !== undefined ? Boolean(isOwned) : true,
          isActive: isActive !== false,
          notes: trimOrNull(notes),
          accountId: account.id,
        },
      });

      return { account, vehicle };
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "Vehicle",
      entityId: result.vehicle.id,
      details: { registrationNumber: regNo },
      req,
    });

    return Response.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Create directory vehicle account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
