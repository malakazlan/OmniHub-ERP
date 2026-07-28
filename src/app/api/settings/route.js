import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const DEFAULT_SETTINGS = {
  company_name: "Metro Feeds",
  company_address: "",
  company_phone: "",
  company_email: "",
  ntn: "",
  strn: "",
  currency: "PKR",
  tax_rate: "0",
  bag_weight: "34",
  fiscal_year_start: "7",
};

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.setting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    const settingsMap = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return Response.json({ success: true, settings: settingsMap, raw: settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return Response.json({ error: "Settings object is required" }, { status: 400 });
    }

    const upserts = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value ?? ""), group: "general" },
        update: { value: String(value ?? "") },
      })
    );

    await Promise.all(upserts);

    const updated = await prisma.setting.findMany();
    const settingsMap = { ...DEFAULT_SETTINGS };
    for (const s of updated) {
      settingsMap[s.key] = s.value;
    }

    return Response.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Update settings error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
