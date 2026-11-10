import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { name } = await req.json();

    if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

    const updated = await prisma.productCategory.update({
      where: { id: parseInt(id) },
      data: { name },
    });

    return Response.json({ success: true, category: updated });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json({ error: "Category name already exists" }, { status: 400 });
    }
    console.error("Update category error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const catId = parseInt(id);

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: catId },
    });

    if (productCount > 0) {
      const activeCount = await prisma.product.count({
        where: { categoryId: catId, isActive: true },
      });
      const inactiveCount = productCount - activeCount;
      
      let errorMsg = `Cannot delete category that contains ${productCount} items.`;
      if (inactiveCount > 0 && activeCount === 0) {
        errorMsg = `Cannot delete category. It contains ${inactiveCount} inactive (deactivated) items. Turn on "Show Inactive" in the Items page to see and move/delete them.`;
      } else if (inactiveCount > 0) {
        errorMsg = `Cannot delete category. It contains ${activeCount} active and ${inactiveCount} inactive items.`;
      }

      return Response.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    await prisma.productCategory.delete({
      where: { id: catId },
    });

    return Response.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
