import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { parseReturnItems } from "@/lib/saleReturn";

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const returnId = parseInt(id, 10);

    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: returnId },
      include: {
        originalSale: {
          include: {
            shop: { select: { id: true, name: true, phone: true } },
            company: { select: { id: true, name: true, phone: true } },
            farmer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!saleReturn) {
      return Response.json({ error: "Return not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      saleReturn: {
        ...saleReturn,
        items: parseReturnItems(saleReturn),
      },
      sale: saleReturn.originalSale,
    });
  } catch (error) {
    console.error("Fetch sale return error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
