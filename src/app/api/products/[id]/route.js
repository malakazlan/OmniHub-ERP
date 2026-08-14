import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const productId = parseInt(id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

    return Response.json({ success: true, product });
  } catch (error) {
    console.error("Fetch product error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const productId = parseInt(id);
    const body = await req.json();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

    const previousStock = product.currentStock;
    const nextStock =
      body.currentStock !== undefined && body.currentStock !== ""
        ? parseFloat(body.currentStock)
        : previousStock;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id: productId },
        data: {
          name: body.name,
          categoryId: body.categoryId ? parseInt(body.categoryId) : product.categoryId,
          unit: body.unit,
          bagWeight: body.unit === "bag" ? (parseFloat(body.bagWeight) || 34) : null,
          costPrice: body.costPrice !== undefined ? parseFloat(body.costPrice) : product.costPrice,
          salePrice: body.salePrice !== undefined ? parseFloat(body.salePrice) : product.salePrice,
          minimumStock: body.minimumStock !== undefined ? parseFloat(body.minimumStock) : product.minimumStock,
          currentStock: Number.isFinite(nextStock) ? nextStock : previousStock,
          description: body.description,
          isActive: body.isActive !== undefined ? body.isActive : product.isActive,
        },
        include: { category: true },
      });

      if (Number.isFinite(nextStock) && nextStock !== previousStock) {
        await tx.stockMovement.create({
          data: {
            productId: productId,
            movementType: "adjustment",
            quantity: Math.abs(nextStock - previousStock),
            previousStock,
            newStock: nextStock,
            notes: "Stock adjusted from product edit",
          },
        });
      }

      return result;
    });

    return Response.json({ success: true, product: updated });
  } catch (error) {
    console.error("Update product error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const productId = parseInt(id);

    const [purchaseItems, saleItems] = await Promise.all([
      prisma.purchaseItem.count({ where: { productId } }),
      prisma.saleItem.count({ where: { productId } }),
    ]);

    if (purchaseItems > 0 || saleItems > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      });
      return Response.json({ success: true, message: "Product deactivated (has transaction history)" });
    }

    await prisma.product.delete({ where: { id: productId } });
    return Response.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
