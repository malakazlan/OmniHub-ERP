import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

function parseDateOnly(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where = {};

    if (employeeId) {
      where.employeeId = parseInt(employeeId);
    }

    if (dateParam) {
      const date = parseDateOnly(dateParam);
      where.date = date;
    } else if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const attendance = await prisma.employeeAttendance.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true } },
      },
      orderBy: [{ date: "desc" }, { employeeId: "asc" }],
    });

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true, designation: true },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, attendance, employees });
  } catch (error) {
    console.error("List attendance error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "accountant")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, date, status, checkIn, checkOut, notes, records } = body;

    if (records && Array.isArray(records)) {
      const results = [];
      for (const rec of records) {
        if (!rec.employeeId || !rec.date || !rec.status) continue;
        const dateOnly = parseDateOnly(rec.date);
        const record = await prisma.employeeAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId: parseInt(rec.employeeId),
              date: dateOnly,
            },
          },
          create: {
            employeeId: parseInt(rec.employeeId),
            date: dateOnly,
            status: rec.status,
            checkIn: rec.checkIn ? new Date(rec.checkIn) : null,
            checkOut: rec.checkOut ? new Date(rec.checkOut) : null,
            notes: rec.notes || null,
          },
          update: {
            status: rec.status,
            checkIn: rec.checkIn ? new Date(rec.checkIn) : null,
            checkOut: rec.checkOut ? new Date(rec.checkOut) : null,
            notes: rec.notes || null,
          },
        });
        results.push(record);
      }
      return Response.json({ success: true, attendance: results }, { status: 201 });
    }

    if (!employeeId || !date || !status) {
      return Response.json(
        { error: "Employee, date, and status are required" },
        { status: 400 }
      );
    }

    const dateOnly = parseDateOnly(date);
    const record = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId: parseInt(employeeId),
          date: dateOnly,
        },
      },
      create: {
        employeeId: parseInt(employeeId),
        date: dateOnly,
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        notes: notes || null,
      },
      update: {
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        notes: notes || null,
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
    });

    return Response.json({ success: true, attendance: record }, { status: 201 });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
