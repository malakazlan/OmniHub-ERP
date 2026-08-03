import prisma from "@/lib/prisma";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { parseAssignedCashAccountId } from "@/lib/userCashAccount";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  allowedModules: true,
  cashAccountId: true,
  lastLogin: true,
  createdAt: true,
  primaryCashAccount: { select: { id: true, name: true, code: true } },
};

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const target = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: USER_SELECT,
    });

    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({
      success: true,
      user: { ...target, allowedModules: JSON.parse(target.allowedModules || "[]") },
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const body = await req.json();

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return Response.json({ error: "User not found" }, { status: 404 });

    if (body.email && body.email !== existing.email) {
      const dup = await prisma.user.findUnique({ where: { email: body.email } });
      if (dup) return Response.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    const validRoles = ["admin", "manager", "salesperson", "accountant", "driver", "viewer"];
    const data = {
      email: body.email || existing.email,
      name: body.name || existing.name,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      role: validRoles.includes(body.role) ? body.role : existing.role,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
    };

    if (Array.isArray(body.allowedModules)) {
      data.allowedModules = JSON.stringify(body.allowedModules);
    }

    if (body.password) {
      data.password = await hashPassword(body.password);
    }

    if (body.cashAccountId !== undefined) {
      try {
        data.cashAccountId = await parseAssignedCashAccountId(
          prisma,
          body.cashAccountId,
          userId
        );
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Prevent an admin from locking themselves out
    if (userId === user.id && data.isActive === false) {
      return Response.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });

    return Response.json({
      success: true,
      user: { ...updated, allowedModules: JSON.parse(updated.allowedModules || "[]") },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (userId === user.id) {
      return Response.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return Response.json({ error: "User not found" }, { status: 404 });

    if (existing.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return Response.json({ error: "Cannot delete the last remaining admin" }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    return Response.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
