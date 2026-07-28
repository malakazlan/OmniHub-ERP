import prisma from "@/lib/prisma";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { createCashLedgerAccount, assignUserPrimaryCash } from "@/lib/cashAccounts";
import { attachCashAccountsToEmployees } from "@/lib/accountRelations";
import { defaultModulesForRole, loginRoleFromEmployeeRole } from "@/lib/modulePresets";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");
    const where = {};
    if (roleFilter) where.role = roleFilter;

    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { attendance: true, salaryRecords: true } },
      },
    });

    const withCash = await attachCashAccountsToEmployees(employees);

    return Response.json({ success: true, employees: withCash });
  } catch (error) {
    console.error("List employees error:", error);
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
      name,
      fatherName,
      cnic,
      phone,
      role,
      designation,
      department,
      salary,
      joiningDate,
      address,
      bankName,
      bankAccountNo,
      notes,
      createAccount,
      createCashAccount,
      assignUserId,
      createLogin,
      loginEmail,
      loginPassword,
      loginRole,
      allowedModules,
    } = body;

    if (!name) {
      return Response.json({ error: "Employee name is required" }, { status: 400 });
    }

    if (cnic) {
      const existing = await prisma.employee.findUnique({ where: { cnic } });
      if (existing) {
        return Response.json({ error: "Employee with this CNIC already exists" }, { status: 400 });
      }
    }

    if (createLogin) {
      if (!loginEmail || !loginPassword) {
        return Response.json({ error: "Login email and password are required" }, { status: 400 });
      }
      const dup = await prisma.user.findUnique({ where: { email: loginEmail } });
      if (dup) {
        return Response.json({ error: "A user with this email already exists" }, { status: 400 });
      }
    }

    const employee = await prisma.$transaction(async (tx) => {
      let accountId = null;
      let cashAccountId = null;
      let linkedUserId = assignUserId ? parseInt(assignUserId, 10) : null;

      if (createLogin) {
        const assignedLoginRole = loginRole || loginRoleFromEmployeeRole(role);
        const modules =
          Array.isArray(allowedModules) && allowedModules.length
            ? allowedModules
            : defaultModulesForRole(assignedLoginRole);
        const hashedPassword = await hashPassword(loginPassword);
        const newUser = await tx.user.create({
          data: {
            email: loginEmail,
            name,
            password: hashedPassword,
            phone: phone || null,
            role: assignedLoginRole,
            allowedModules: JSON.stringify(modules),
            isActive: true,
          },
        });
        linkedUserId = newUser.id;
      }

      if (createAccount !== false) {
        const isDriver = role === "driver";
        const account = await tx.account.create({
          data: {
            name: isDriver ? `${name} (Driver)` : `${name} (Salary)`,
            type: "liability",
            category: isDriver ? "transport" : "salary",
            phone: phone || null,
            cnic: cnic || null,
            address: address || null,
          },
        });
        accountId = account.id;
      }

      if (createCashAccount !== false) {
        const ownerUserId = linkedUserId;
        const cashAcc = await createCashLedgerAccount(tx, {
          name: `Cash — ${name}`,
          openingBalance: 0,
          ownerUserId,
        });
        cashAccountId = cashAcc.id;
        if (ownerUserId) {
          await assignUserPrimaryCash(tx, ownerUserId, cashAcc.id);
        }
      }

      return tx.employee.create({
        data: {
          name,
          fatherName: fatherName || null,
          cnic: cnic || null,
          phone: phone || null,
          role: role || null,
          designation: designation || null,
          department: department || null,
          salary: parseFloat(salary) || 0,
          joiningDate: joiningDate ? new Date(joiningDate) : null,
          address: address || null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo || null,
          notes: notes || null,
          accountId,
          cashAccountId,
          userId: linkedUserId,
        },
      });
    });

    const [employeeWithCash] = await attachCashAccountsToEmployees([employee]);

    return Response.json({ success: true, employee: employeeWithCash }, { status: 201 });
  } catch (error) {
    console.error("Create employee error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
