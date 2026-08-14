import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const RECEIVABLE_CATEGORIES = ["shop", "company"];
const PAYABLE_CATEGORIES = ["farmer", "company"];

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";

    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        category: { in: [...RECEIVABLE_CATEGORIES, ...PAYABLE_CATEGORIES, "general"] },
        balance: { not: 0 },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const receivables = accounts.filter(
      (a) => RECEIVABLE_CATEGORIES.includes(a.category) && a.balance > 0
    );
    const payables = accounts.filter(
      (a) => (PAYABLE_CATEGORIES.includes(a.category) || a.category === "general") && a.balance < 0
    );

    let rows = accounts;
    if (type === "receivable") rows = receivables;
    else if (type === "payable") rows = payables.map((a) => ({ ...a, balance: Math.abs(a.balance) }));

    const totalReceivable = receivables.reduce((s, a) => s + a.balance, 0);
    const totalPayable = payables.reduce((s, a) => s + Math.abs(a.balance), 0);

    return Response.json({
      success: true,
      summary: {
        receivableCount: receivables.length,
        payableCount: payables.length,
        totalReceivable,
        totalPayable,
        netPosition: totalReceivable - totalPayable,
      },
      receivables,
      payables: payables.map((a) => ({ ...a, balance: Math.abs(a.balance) })),
      accounts: rows,
    });
  } catch (error) {
    console.error("Receivables report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
