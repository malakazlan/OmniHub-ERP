import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cities = await prisma.city.findMany({
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, cities });
  } catch (error) {
    console.error("List cities error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return Response.json({ error: "City name is required" }, { status: 400 });
    }

    const trimmed = name.trim();
    const existing = await prisma.city.findUnique({ where: { name: trimmed } });
    if (existing) {
      return Response.json({ error: "City already exists" }, { status: 400 });
    }

    const city = await prisma.city.create({ data: { name: trimmed } });
    return Response.json({ success: true, city }, { status: 201 });
  } catch (error) {
    console.error("Create city error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
