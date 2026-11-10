import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const cityId = parseInt(id);
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return Response.json({ error: "City name is required" }, { status: 400 });
    }

    const existing = await prisma.city.findUnique({ where: { id: cityId } });
    if (!existing) {
      return Response.json({ error: "City not found" }, { status: 404 });
    }

    const trimmed = name.trim();
    const duplicate = await prisma.city.findUnique({ where: { name: trimmed } });
    if (duplicate && duplicate.id !== cityId) {
      return Response.json({ error: "Another city with this name already exists" }, { status: 400 });
    }

    const city = await prisma.city.update({ where: { id: cityId }, data: { name: trimmed } });
    return Response.json({ success: true, city });
  } catch (error) {
    console.error("Update city error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const cityId = parseInt(id);

    const existing = await prisma.city.findUnique({ where: { id: cityId } });
    if (!existing) {
      return Response.json({ error: "City not found" }, { status: 404 });
    }

    await prisma.city.delete({ where: { id: cityId } });
    return Response.json({ success: true, message: "City deleted successfully" });
  } catch (error) {
    console.error("Delete city error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
