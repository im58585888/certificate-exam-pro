import { getUser, isAdmin } from "@/lib/auth";
import { markOwnerNetwork, OWNER_COOKIE, recordHit, type Hit } from "@/lib/traffic";

// Page-view beacon from <Tracker>. Always answers 204 so analytics problems never surface to visitors.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.path !== "string" || !body.path.startsWith("/")) return new Response(null, { status: 204 });
    if (/^\/(admin|api)(\/|$)/.test(body.path)) return new Response(null, { status: 204 });
    if (isAdmin(await getUser())) {
      // Don't count the owner: remember this network, and mark this browser so it stays uncounted after signing out.
      await markOwnerNetwork();
      return new Response(null, {
        status: 204,
        headers: { "set-cookie": `${OWNER_COOKIE}=1; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` },
      });
    }
    const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : undefined);
    const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
    const hit: Hit = {
      path: body.path,
      referrer: str(body.referrer),
      utm: { source: str(utm.source), medium: str(utm.medium), campaign: str(utm.campaign), content: str(utm.content) },
      clickId: ["fbclid", "gclid", "rdt_cid"].includes(body.clickId) ? body.clickId : undefined,
      width: typeof body.width === "number" ? body.width : undefined,
    };
    await recordHit(hit);
  } catch (err) {
    console.error("[traffic] hit not recorded", err);
  }
  return new Response(null, { status: 204 });
}
