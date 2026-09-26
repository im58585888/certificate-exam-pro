import { query } from "@/lib/db";

// Liveness/readiness probe for hosting platforms and uptime monitors.
export async function GET() {
  try {
    await query("select 1");
    return Response.json({ ok: true, db: "up" });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
