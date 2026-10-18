import { getSessionFromRequest, clearSessionCookie, destroySession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { assertMutation, attachCookies, handle, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("auth.logout", async () => {
    assertMutation(req);
    const auth = await getSessionFromRequest(req);
    if (auth) {
      await destroySession(auth.sessionId);
      await audit({
        actorId: auth.user.id,
        actorLabel: auth.user.username,
        action: "LOGOUT",
      });
    }
    return attachCookies(json({ ok: true }), clearSessionCookie());
  });
}
