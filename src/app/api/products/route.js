import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateSKU } from "@/lib/receipt";
import { logActivity } from "@/lib/activityLog";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const lowStock = searchParams.get("lowStock");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where = {};
    if (!includeInactive) where.isActive = true;
    if (categoryId) where.categoryId = parseInt(categoryId);

    let products = await prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    if (lowStock === "true") {
      products = products.filter((p) => p.currentStock <= p.minimumStock);
    }

    return Response.json({ success: true, products });
  } catch (error) {
    console.error("List products error:", error);
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
    const {
      name, categoryId, unit, bagWeight, costPrice, salePrice,
      minimumStock, currentStock, description, sku,
    } = body;

    if (!name || !categoryId) {
      return Response.json({ error: "Product name and category are required" }, { status: 400 });
    }

    const category = await prisma.productCategory.findUnique({
      where: { id: parseInt(categoryId) },
    });
    if (!category) return Response.json({ error: "Category not found" }, { status: 404 });

    const productSku = sku || (await generateSKU(category.name));

    const product = await prisma.product.create({
      data: {
        name,
        sku: productSku,
        categoryId: parseInt(categoryId),
        unit: unit || "kg",
        bagWeight: unit === "bag" ? (parseFloat(bagWeight) || 34) : null,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        minimumStock: parseFloat(minimumStock) || 0,
        currentStock: parseFloat(currentStock) || 0,
        description,
      },
      include: { category: true },
    });

    if (product.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "adjustment",
          quantity: product.currentStock,
          previousStock: 0,
          newStock: product.currentStock,
          notes: "Opening stock on product creation",
        },
      });
    }

    logActivity({ userId: user.userId, action: "CREATE", module: "products", entityType: "Product", entityId: product.id, details: { name: product.name }, req });

    return Response.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    if (error.code === "P2002") {
      return Response.json({ error: "SKU already exists" }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
