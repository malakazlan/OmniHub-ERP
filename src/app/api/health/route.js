export async function GET() {
  return Response.json({
    status: "ok",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
}
