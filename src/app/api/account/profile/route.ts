import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { issueAuthToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, requireUser } from "@/lib/api";
import { profileSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  return handle("account.profile", async () => {
    assertMutation(req);
    const { user } = await requireUser(req);
    const input = await parseBody(req, profileSchema);

    const changes: {
      username?: string;
      email?: string;
      emailVerifiedAt?: Date | null;
    } = {};
    let emailChanged = false;

    if (input.username && input.username !== user.username) {
      const taken = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, input.username), ne(users.id, user.id)))
        .limit(1);
      if (taken[0]) {
        throw new ApiError(409, "USERNAME_TAKEN", "That username is already in use.", {
          fields: { username: "That username is already in use." },
        });
      }
      changes.username = input.username;
    }

    if (input.email && input.email !== user.email) {
      if (!input.currentPassword) {
        throw new ApiError(422, "PASSWORD_REQUIRED", "Confirm your current password to change your email.", {
          fields: { currentPassword: "Enter your current password to change your email." },
        });
      }
      const fullUser = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const valid = fullUser[0]
        ? await verifyPassword(fullUser[0].passwordHash, input.currentPassword)
        : false;
      if (!valid) {
        throw new ApiError(401, "INVALID_PASSWORD", "Your current password is incorrect.", {
          fields: { currentPassword: "Your current password is incorrect." },
        });
      }
      const taken = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), ne(users.id, user.id)))
        .limit(1);
      if (taken[0]) {
        throw new ApiError(409, "EMAIL_TAKEN", "That email is already in use.", {
          fields: { email: "That email is already in use." },
        });
      }
      changes.email = input.email;
      changes.emailVerifiedAt = null;
      emailChanged = true;
    }

    if (Object.keys(changes).length === 0) {
      return json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
        },
        message: "Nothing changed.",
      });
    }

    const [updated] = await db
      .update(users)
      .set(changes)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
      });

    if (emailChanged) {
      try {
        const { token } = await issueAuthToken(user.id, "EMAIL_VERIFY");
        await sendVerificationEmail({ to: updated!.email, username: updated!.username, token });
      } catch (error) {
        console.error(
          "[top-cloud] verification email failed",
          error instanceof Error ? error.message : "unknown",
        );
      }
    }

    await audit({
      actorId: user.id,
      actorLabel: updated!.username,
      action: "ACCOUNT_UPDATED",
      targetType: "User",
      targetId: user.id,
      metadata: { fields: Object.keys(changes).filter((key) => key !== "emailVerifiedAt") },
      ip: getClientIp(req),
    });

    return json({
      user: {
        id: updated!.id,
        username: updated!.username,
        email: updated!.email,
        emailVerified: Boolean(updated!.emailVerifiedAt),
      },
      message: emailChanged
        ? "Profile updated. Verify your new email address from your inbox."
        : "Profile updated.",
    });
  });
}
