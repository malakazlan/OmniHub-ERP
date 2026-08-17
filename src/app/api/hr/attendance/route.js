import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { parseDateOnly, monthDateRange, serializeAttendanceRow } from "@/lib/attendance";

const ACTIVE_EMPLOYEE_SELECT = {
  id: true,
  name: true,
  department: true,
  designation: true,
  salary: true,
};

const ATTENDANCE_LEAN_SELECT = {
  id: true,
  employeeId: true,
  date: true,
  status: true,
};

async function upsertOneAttendance(tx, rec) {
  const dateOnly = parseDateOnly(rec.date);
  return tx.employeeAttendance.upsert({
    where: {
      employeeId_date: {
        employeeId: parseInt(rec.employeeId, 10),
        date: dateOnly,
      },
    },
    create: {
      employeeId: parseInt(rec.employeeId, 10),
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
    select: ATTENDANCE_LEAN_SELECT,
  });
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
    const lean = searchParams.get("lean") === "1";
    const skipEmployees = searchParams.get("skipEmployees") === "1";

    const where = {};

    if (employeeId) {
      where.employeeId = parseInt(employeeId, 10);
    }

    if (dateParam) {
      where.date = parseDateOnly(dateParam);
    } else if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const { start, end } = monthDateRange(y, m);
      where.date = { gte: start, lte: end };
    }

    const attendanceQuery = prisma.employeeAttendance.findMany({
      where,
      select: ATTENDANCE_LEAN_SELECT,
      orderBy: [{ employeeId: "asc" }, { date: "asc" }],
    });

    if (skipEmployees) {
      const attendance = await attendanceQuery;
      return Response.json({
        success: true,
        attendance: attendance.map(serializeAttendanceRow),
      });
    }

    const [attendance, employees] = await Promise.all([
      attendanceQuery,
      prisma.employee.findMany({
        where: { isActive: true },
        select: ACTIVE_EMPLOYEE_SELECT,
        orderBy: { name: "asc" },
      }),
    ]);

    return Response.json({
      success: true,
      attendance: attendance.map(serializeAttendanceRow),
      employees,
      lean,
    });
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
    const { employeeId, date, status, checkIn, checkOut, notes, records, clear } = body;

    if (clear && employeeId && date) {
      await prisma.employeeAttendance.deleteMany({
        where: {
          employeeId: parseInt(employeeId, 10),
          date: parseDateOnly(date),
        },
      });
      return Response.json({ success: true, cleared: true });
    }

    if (records && Array.isArray(records)) {
      const valid = records.filter((rec) => rec.employeeId && rec.date && rec.status);
      const CHUNK = 30;
      const results = await runTransaction(async (tx) => {
        const saved = [];
        for (let i = 0; i < valid.length; i += CHUNK) {
          const chunk = valid.slice(i, i + CHUNK);
          const batch = await Promise.all(chunk.map((rec) => upsertOneAttendance(tx, rec)));
          saved.push(...batch);
        }
        return saved;
      });
      return Response.json({
        success: true,
        attendance: results.map(serializeAttendanceRow),
      }, { status: 201 });
    }

    if (!employeeId || !date || !status) {
      return Response.json(
        { error: "Employee, date, and status are required" },
        { status: 400 }
      );
    }

    const record = await upsertOneAttendance(prisma, {
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      notes,
    });

    return Response.json({
      success: true,
      attendance: serializeAttendanceRow(record),
    }, { status: 201 });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "accountant")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, date } = body;

    if (!employeeId || !date) {
      return Response.json({ error: "Employee and date are required" }, { status: 400 });
    }

    await prisma.employeeAttendance.deleteMany({
      where: {
        employeeId: parseInt(employeeId, 10),
        date: parseDateOnly(date),
      },
    });

    return Response.json({ success: true, cleared: true });
  } catch (error) {
    console.error("Clear attendance error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
