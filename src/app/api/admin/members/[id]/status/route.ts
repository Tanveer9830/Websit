import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { revokeAllSessions } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, requireOwner } from "@/lib/api";
import { memberStatusSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.members.status", async () => {
    assertMutation(req);
    const auth = await requireOwner(req);
    const { id } = await context.params;
    const input = await parseBody(req, memberStatusSchema);

    const rows = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const target = rows[0];
    if (!target) throw new ApiError(404, "NOT_FOUND", "Member not found.");
    if (target.role === "OWNER") {
      throw new ApiError(403, "OWNER_PROTECTED", "The owner account cannot be disabled.");
    }
    if (target.id === auth.user.id) {
      throw new ApiError(400, "SELF_CHANGE", "You cannot disable your own account.");
    }

    const [updated] = await db
      .update(users)
      .set({ isDisabled: input.disabled })
      .where(eq(users.id, target.id))
      .returning({ id: users.id, username: users.username, isDisabled: users.isDisabled });
    if (input.disabled) await revokeAllSessions(target.id);

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: input.disabled ? "MEMBER_DISABLED" : "MEMBER_ENABLED",
      targetType: "User",
      targetId: target.id,
      metadata: { username: target.username },
      ip: getClientIp(req),
    });

    return json({
      ok: true,
      member: updated,
      message: input.disabled ? "Member disabled." : "Member re-enabled.",
    });
  });
}
