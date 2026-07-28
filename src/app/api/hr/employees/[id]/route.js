import prisma from "@/lib/prisma";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { defaultModulesForRole, loginRoleFromEmployeeRole } from "@/lib/modulePresets";
import { MODULES } from "@/lib/constants";
import { createCashLedgerAccount, assignUserPrimaryCash } from "@/lib/cashAccounts";

async function fetchLoginUser(userId) {
  if (!userId) return null;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      allowedModules: true,
    },
  });
  if (!u) return null;
  return {
    ...u,
    allowedModules: JSON.parse(u.allowedModules || "[]"),
  };
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        attendance: { take: 30, orderBy: { date: "desc" } },
        salaryRecords: { take: 12, orderBy: [{ year: "desc" }, { month: "desc" }] },
      },
    });

    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    const loginUser = await fetchLoginUser(employee.userId);

    return Response.json({ success: true, employee: { ...employee, loginUser } });
  } catch (error) {
    console.error("Fetch employee error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function upsertEmployeeLogin(tx, { existing, body, employeeName, phone, adminUser }) {
  if (adminUser.role !== "admin") return existing.userId;

  const {
    createLogin,
    loginEmail,
    loginPassword,
    loginRole,
    allowedModules,
    loginIsActive,
  } = body;

  if (existing.userId) {
    const data = {};
    if (loginEmail) {
      const dup = await tx.user.findFirst({
        where: { email: loginEmail, id: { not: existing.userId } },
      });
      if (dup) throw new Error("A user with this email already exists");
      data.email = loginEmail;
    }
    if (loginPassword) {
      data.password = await hashPassword(loginPassword);
    }
    if (loginRole) data.role = loginRole;
    if (loginIsActive !== undefined) data.isActive = Boolean(loginIsActive);
    if (Array.isArray(allowedModules)) {
      data.allowedModules = JSON.stringify(
        loginRole === "admin" || body.loginRole === "admin" ? MODULES : allowedModules
      );
    }
    data.name = employeeName;
    if (phone !== undefined) data.phone = phone || null;

    if (Object.keys(data).length) {
      await tx.user.update({ where: { id: existing.userId }, data });
    }
    return existing.userId;
  }

  if (!createLogin) return null;

  if (!loginEmail || !loginPassword) {
    throw new Error("Login email and password are required to create a login");
  }
  const dup = await tx.user.findUnique({ where: { email: loginEmail } });
  if (dup) throw new Error("A user with this email already exists");

  const assignedLoginRole = loginRole || loginRoleFromEmployeeRole(body.role || existing.role);
  const modules =
    Array.isArray(allowedModules) && allowedModules.length
      ? allowedModules
      : defaultModulesForRole(assignedLoginRole);

  const newUser = await tx.user.create({
    data: {
      email: loginEmail,
      name: employeeName,
      password: await hashPassword(loginPassword),
      phone: phone || null,
      role: assignedLoginRole,
      allowedModules: JSON.stringify(modules),
      isActive: loginIsActive !== false,
    },
  });

  if (existing.cashAccountId) {
    await assignUserPrimaryCash(tx, newUser.id, existing.cashAccountId);
    await tx.account.update({
      where: { id: existing.cashAccountId },
      data: { ownerUserId: newUser.id },
    });
  }

  return newUser.id;
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = parseInt(id, 10);
    const body = await req.json();

    const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    const employee = await prisma.$transaction(async (tx) => {
      const updatedName = body.name ?? existing.name;
      const updatedPhone = body.phone ?? existing.phone;

      let linkedUserId = existing.userId;
      if (user.role === "admin") {
        const loginId = await upsertEmployeeLogin(tx, {
          existing,
          body,
          employeeName: updatedName,
          phone: updatedPhone,
          adminUser: user,
        });
        if (loginId != null) linkedUserId = loginId;
      }

      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: {
          name: updatedName,
          fatherName: body.fatherName ?? existing.fatherName,
          cnic: body.cnic ?? existing.cnic,
          phone: updatedPhone,
          role: body.role ?? existing.role,
          designation: body.designation ?? existing.designation,
          department: body.department ?? existing.department,
          salary: body.salary !== undefined ? parseFloat(body.salary) || 0 : existing.salary,
          joiningDate: body.joiningDate ? new Date(body.joiningDate) : existing.joiningDate,
          address: body.address ?? existing.address,
          bankName: body.bankName ?? existing.bankName,
          bankAccountNo: body.bankAccountNo ?? existing.bankAccountNo,
          notes: body.notes ?? existing.notes,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
          userId: linkedUserId,
        },
      });

      if (existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            name: `${updatedName} (Salary)`,
            phone: updatedPhone,
            cnic: body.cnic ?? existing.cnic,
            address: body.address ?? existing.address,
            isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
          },
        });
      }

      return updated;
    });

    const loginUser = await fetchLoginUser(employee.userId);

    return Response.json({ success: true, employee: { ...employee, loginUser } });
  } catch (error) {
    console.error("Update employee error:", error);
    if (error.message?.includes("email") || error.message?.includes("Login")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete employees" }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = parseInt(id, 10);

    const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.delete({ where: { id: employeeId } });
      if (existing.accountId) {
        await tx.account.delete({ where: { id: existing.accountId } }).catch(() => {});
      }
      if (existing.cashAccountId && existing.cashAccountId !== existing.accountId) {
        const cashEntries = await tx.ledgerEntry.count({
          where: { accountId: existing.cashAccountId },
        });
        if (cashEntries === 0) {
          await tx.account.delete({ where: { id: existing.cashAccountId } }).catch(() => {});
        }
      }
    });

    return Response.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    console.error("Delete employee error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
