import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { revokeAllSessions } from "@/lib/session";
import { serializePermissions } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, requireOwner } from "@/lib/api";
import { roleUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.members.role", async () => {
    assertMutation(req);
    const auth = await requireOwner(req);
    const { id } = await context.params;
    const input = await parseBody(req, roleUpdateSchema);

    const rows = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const target = rows[0];
    if (!target) throw new ApiError(404, "NOT_FOUND", "Member not found.");
    if (target.role === "OWNER") {
      throw new ApiError(403, "OWNER_PROTECTED", "The owner account cannot be demoted or modified.");
    }
    if (target.id === auth.user.id) {
      throw new ApiError(400, "SELF_CHANGE", "You cannot change your own role.");
    }

    const promoting = input.role === "ADMIN";
    const [updated] = await db
      .update(users)
      .set({
        role: input.role,
        permissions: promoting ? serializePermissions(input.permissions ?? []) : "[]",
        mustChangePassword: promoting,
      })
      .where(eq(users.id, target.id))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        permissions: users.permissions,
        mustChangePassword: users.mustChangePassword,
        isDisabled: users.isDisabled,
      });

    // Privilege changes invalidate existing sessions so every future request is
    // re-authenticated against the new role and permission set.
    await revokeAllSessions(target.id);

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: promoting ? "ADMIN_PROMOTED" : "ADMIN_DEMOTED",
      targetType: "User",
      targetId: target.id,
      metadata: {
        username: target.username,
        from: target.role,
        to: input.role,
        permissions: input.permissions ?? [],
      },
      ip: getClientIp(req),
    });

    return json({
      ok: true,
      member: updated,
      message: promoting
        ? `${target.username} is now an administrator. They must sign in again and set a new password before using the panel.`
        : `${target.username} is now a member. Their sessions were signed out.`,
    });
  });
}
