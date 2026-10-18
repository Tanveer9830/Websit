import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { hashIp } from "@/lib/request";

const SENSITIVE_KEY = /pass(word)?|token|secret|hash|cookie|authorization/i;

export function redactMetadata(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactMetadata(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redactMetadata(entry, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") return value.slice(0, 500);
  return value;
}

export type AuditInput = {
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ? JSON.stringify(redactMetadata(input.metadata)) : null,
      ipHash: input.ip ? hashIp(input.ip) : null,
    });
  } catch (error) {
    console.error(
      "[top-cloud] audit log write failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}
