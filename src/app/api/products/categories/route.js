import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return Response.json({ success: true, categories });
  } catch (error) {
    console.error("List categories error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name) return Response.json({ error: "Category name is required" }, { status: 400 });

    const category = await prisma.productCategory.create({ data: { name } });
    return Response.json({ success: true, category }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json({ error: "Category already exists" }, { status: 400 });
    }
    console.error("Create category error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
