import prisma from "./prisma";

/**
 * Best-effort activity log writer. Never throws — logging failures
 * must not break the primary request flow.
 */
export async function logActivity({ userId, action, module, entityType, entityId, details, req }) {
  try {
    if (!userId) return null;

    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) return null;

    let ipAddress = null;
    if (req) {
      ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null;
    }

    return await prisma.activityLog.create({
      data: {
        userId,
        action,
        module,
        entityType: entityType || null,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
      },
    });
  } catch (error) {
    if (error?.code !== "P2003") {
      console.error("Activity log write failed:", error);
    }
    return null;
  }
}
