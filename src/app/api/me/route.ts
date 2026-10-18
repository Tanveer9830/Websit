import { handle, json, requireUser } from "@/lib/api";
import { parsePermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle("me", async () => {
    const { user } = await requireUser(req);
    return json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: parsePermissions(user.permissions),
        emailVerified: Boolean(user.emailVerifiedAt),
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });
}
