import { revokeAllSessions } from "@/lib/session";
import { audit } from "@/lib/audit";
import { assertMutation, handle, json, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("account.revoke-sessions", async () => {
    assertMutation(req);
    const auth = await requireUser(req);
    const count = await revokeAllSessions(auth.user.id, auth.sessionId);
    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "SESSIONS_REVOKED",
      targetType: "User",
      targetId: auth.user.id,
      metadata: { revoked: count },
    });
    return json({ ok: true, revoked: count, message: `${count} other session${count === 1 ? "" : "s"} signed out.` });
  });
}
