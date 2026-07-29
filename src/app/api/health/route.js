import prisma, { checkDatabaseConnection } from "@/lib/prisma";

export async function GET() {
  try {
    await checkDatabaseConnection();
    return Response.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "degraded",
        database: "unavailable",
        hint: "Start MySQL (XAMPP), verify DATABASE_URL in .env, run npm run db:setup",
        message: error?.message || "Connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
