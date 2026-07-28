import prisma from "@/lib/prisma";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { MODULES } from "@/lib/constants";
import { defaultModulesForRole } from "@/lib/modulePresets";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        allowedModules: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const usersSafe = users.map((u) => ({
      ...u,
      allowedModules: JSON.parse(u.allowedModules || "[]"),
    }));

    return Response.json({ success: true, users: usersSafe });
  } catch (error) {
    console.error("List users error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, password, phone, role, allowedModules, isActive } = body;

    if (!email || !name || !password) {
      return Response.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "manager", "salesperson", "accountant", "driver", "viewer"];
    const assignedRole = validRoles.includes(role) ? role : "viewer";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    let modules = allowedModules;
    if (!modules || !Array.isArray(modules)) {
      modules = defaultModulesForRole(assignedRole);
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phone: phone || null,
        role: assignedRole,
        allowedModules: JSON.stringify(modules),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        allowedModules: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        success: true,
        user: { ...newUser, allowedModules: JSON.parse(newUser.allowedModules || "[]") },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
