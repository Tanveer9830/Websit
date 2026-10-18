import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  answers,
  applications,
  formVersions,
  reviewNotes,
  statusHistory,
  users,
  type AnswerRow,
  type ApplicationRow,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { validateApplicationAnswers, type PublishedForm } from "@/lib/form";
import type { PanelSettings } from "@/lib/settings";
import {
  APPLICATION_STATUSES,
  STATUS_META,
  type ApplicationStatus,
} from "@/lib/constants";
import type { ApplicationSubmitInput } from "@/lib/validation";
import type { SessionUser } from "@/lib/session";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACTIVE_STATUSES: ApplicationStatus[] = [
  "PENDING",
  "REVIEWING",
  "UNDER_CONSIDERATION",
  "APPROVED",
  "ON_HOLD",
];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function generateReference(now = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += REFERENCE_ALPHABET[randomInt(0, REFERENCE_ALPHABET.length)];
  }
  return `TC-${now.getUTCFullYear()}-${suffix}`;
}

export type SubmittedApplication = {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
};

export async function submitApplication(params: {
  user: SessionUser;
  input: ApplicationSubmitInput;
  form: PublishedForm;
  settings: PanelSettings;
}): Promise<SubmittedApplication> {
  const { user, input, form, settings } = params;

  if (!settings.applicationsOpen) {
    throw new ApiError(403, "APPLICATIONS_CLOSED", "Applications are paused right now. Please check back soon.");
  }
  if (settings.requireVerifiedEmail && !user.emailVerifiedAt) {
    throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Verify your email address before submitting an application.");
  }

  let position: string | null = null;
  if (settings.positionsEnabled) {
    const requested = (input.position ?? "").trim();
    if (!requested || !settings.positions.includes(requested)) {
      throw new ApiError(422, "INVALID_POSITION", "Choose a staff position from the list.", {
        fields: { position: "Choose a staff position from the list." },
      });
    }
    position = requested;
  }

  if (!settings.allowMultiple) {
    const activeRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(and(eq(applications.userId, user.id), inArray(applications.status, ACTIVE_STATUSES)));
    if (Number(activeRows[0]?.count ?? 0) > 0) {
      throw new ApiError(
        409,
        "APPLICATION_LIMIT",
        "You already have an active application. Please wait for a decision before applying again.",
      );
    }
  }

  const discordUsername = settings.collectDiscord ? (input.discordUsername ?? "").trim() || null : null;
  const discordId = settings.collectDiscord ? (input.discordId ?? "").trim() || null : null;

  const validation = validateApplicationAnswers(form.questions, input.answers);
  if (!validation.ok) {
    throw new ApiError(422, "ANSWER_VALIDATION", "Some answers need your attention.", {
      fields: validation.errors,
    });
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const reference = generateReference();
    try {
      const application = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(applications)
          .values({
            reference,
            userId: user.id,
            formVersionId: form.id,
            status: "PENDING",
            position,
            discordUsername,
            discordId,
          })
          .returning();

        if (validation.answers.length > 0) {
          await tx.insert(answers).values(
            validation.answers.map((answer) => ({
              applicationId: created!.id,
              questionId: answer.questionId,
              questionType: answer.type,
              questionTitle: answer.title,
              questionDescription: answer.description,
              placeholder: answer.placeholder,
              options: JSON.stringify(answer.options),
              required: answer.required,
              answer: answer.valueJson,
              order: answer.order,
            })),
          );
        }

        await tx.insert(statusHistory).values({
          applicationId: created!.id,
          fromStatus: null,
          toStatus: "PENDING",
          actorId: user.id,
          actorLabel: user.username,
          note: "Application received.",
        });

        return created!;
      });

      return {
        id: application.id,
        reference: application.reference,
        status: application.status,
        submittedAt: application.submittedAt.toISOString(),
      };
    } catch (error) {
      const isReferenceCollision =
        error instanceof Error && /UNIQUE constraint failed: applications\.reference/i.test(error.message);
      if (!isReferenceCollision || attempt === 3) throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Could not generate a unique reference. Please retry.");
}

export async function getStatusCounts(userId?: string) {
  const rows = await db
    .select({ status: applications.status, count: sql<number>`count(*)` })
    .from(applications)
    .where(userId ? eq(applications.userId, userId) : undefined)
    .groupBy(applications.status);

  const counts: Record<ApplicationStatus, number> = {
    PENDING: 0,
    REVIEWING: 0,
    UNDER_CONSIDERATION: 0,
    APPROVED: 0,
    REJECTED: 0,
    ON_HOLD: 0,
  };
  for (const row of rows) {
    if (isApplicationStatus(row.status)) counts[row.status] = Number(row.count);
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, total };
}

export function statusMeta(status: string) {
  return isApplicationStatus(status) ? STATUS_META[status] : STATUS_META.PENDING;
}

export type MemberApplicationSummary = {
  id: string;
  reference: string;
  status: string;
  position: string | null;
  submittedAt: Date;
  updatedAt: Date;
  lastStatusChangedAt: Date;
  feedbackCount: number;
};

export async function getMemberApplications(userId: string): Promise<MemberApplicationSummary[]> {
  const rows = await db
    .select({
      id: applications.id,
      reference: applications.reference,
      status: applications.status,
      position: applications.position,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
      lastStatusChangedAt: applications.lastStatusChangedAt,
    })
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.submittedAt));

  if (rows.length === 0) return [];

  const feedbackRows = await db
    .select({ applicationId: reviewNotes.applicationId, count: sql<number>`count(*)` })
    .from(reviewNotes)
    .where(
      and(
        inArray(
          reviewNotes.applicationId,
          rows.map((row) => row.id),
        ),
        eq(reviewNotes.visibility, "APPLICANT"),
        eq(reviewNotes.published, true),
      ),
    )
    .groupBy(reviewNotes.applicationId);
  const feedbackCounts = new Map(feedbackRows.map((row) => [row.applicationId, Number(row.count)]));

  return rows.map((row) => ({ ...row, feedbackCount: feedbackCounts.get(row.id) ?? 0 }));
}

export type MemberApplicationDetail = {
  id: string;
  reference: string;
  status: string;
  position: string | null;
  submittedAt: Date;
  updatedAt: Date;
  lastStatusChangedAt: Date;
  formVersion: number;
  answers: AnswerRow[];
  history: { id: string; status: string; at: Date }[];
  feedback: { id: string; body: string; publishedAt: Date | null; createdAt: Date }[];
};

/**
 * Ownership is enforced inside the query itself. A member can never retrieve
 * another member's application, even with a guessed / modified URL.
 */
export async function getMemberApplication(
  id: string,
  userId: string,
): Promise<MemberApplicationDetail | null> {
  const rows = await db
    .select({ application: applications, formVersion: formVersions.version })
    .from(applications)
    .innerJoin(formVersions, eq(applications.formVersionId, formVersions.id))
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [answerRows, historyRows, feedbackRows] = await Promise.all([
    db
      .select()
      .from(answers)
      .where(eq(answers.applicationId, row.application.id))
      .orderBy(asc(answers.order)),
    db
      .select({ id: statusHistory.id, status: statusHistory.toStatus, at: statusHistory.createdAt })
      .from(statusHistory)
      .where(eq(statusHistory.applicationId, row.application.id))
      .orderBy(asc(statusHistory.createdAt)),
    db
      .select({
        id: reviewNotes.id,
        body: reviewNotes.body,
        publishedAt: reviewNotes.publishedAt,
        createdAt: reviewNotes.createdAt,
      })
      .from(reviewNotes)
      .where(
        and(
          eq(reviewNotes.applicationId, row.application.id),
          eq(reviewNotes.visibility, "APPLICANT"),
          eq(reviewNotes.published, true),
        ),
      )
      .orderBy(asc(reviewNotes.publishedAt)),
  ]);

  return {
    id: row.application.id,
    reference: row.application.reference,
    status: row.application.status,
    position: row.application.position,
    submittedAt: row.application.submittedAt,
    updatedAt: row.application.updatedAt,
    lastStatusChangedAt: row.application.lastStatusChangedAt,
    formVersion: row.formVersion,
    answers: answerRows,
    history: historyRows,
    feedback: feedbackRows,
  };
}

export async function updateApplicationStatus(params: {
  applicationId: string;
  status: ApplicationStatus;
  note?: string;
  actor: { id: string; username: string };
}) {
  if (!isApplicationStatus(params.status)) {
    throw new ApiError(422, "INVALID_STATUS", "Choose a valid application status.");
  }

  const rows = await db
    .select({
      application: applications,
      applicant: { id: users.id, username: users.username, email: users.email },
    })
    .from(applications)
    .innerJoin(users, eq(applications.userId, users.id))
    .where(eq(applications.id, params.applicationId))
    .limit(1);
  const record = rows[0];
  if (!record) throw new ApiError(404, "NOT_FOUND", "Application not found.");
  if (record.application.status === params.status) {
    throw new ApiError(400, "NO_CHANGE", "That is already the current status.");
  }

  const updated = await db.transaction(async (tx) => {
    const currentRows = await tx
      .select()
      .from(applications)
      .where(eq(applications.id, params.applicationId))
      .limit(1);
    const current = currentRows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Application not found.");
    if (current.status === params.status) {
      throw new ApiError(409, "CONFLICT", "The status was already updated. Refresh and try again.");
    }

    const [result] = await tx
      .update(applications)
      .set({
        status: params.status,
        lastStatusChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, params.applicationId))
      .returning();

    await tx.insert(statusHistory).values({
      applicationId: params.applicationId,
      fromStatus: current.status,
      toStatus: params.status,
      actorId: params.actor.id,
      actorLabel: params.actor.username,
      note: params.note?.trim() || null,
    });

    return result!;
  });

  return {
    previousStatus: record.application.status,
    application: updated,
    applicant: record.applicant,
  };
}

export async function addInternalNote(params: {
  applicationId: string;
  authorId: string;
  body: string;
}) {
  const exists = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.id, params.applicationId))
    .limit(1);
  if (!exists[0]) throw new ApiError(404, "NOT_FOUND", "Application not found.");
  const [note] = await db
    .insert(reviewNotes)
    .values({
      applicationId: params.applicationId,
      authorId: params.authorId,
      body: params.body.trim(),
      visibility: "INTERNAL",
      published: false,
    })
    .returning();
  return note!;
}

export async function publishApplicantFeedback(params: {
  applicationId: string;
  authorId: string;
  body: string;
}) {
  const exists = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.id, params.applicationId))
    .limit(1);
  if (!exists[0]) throw new ApiError(404, "NOT_FOUND", "Application not found.");
  const [note] = await db
    .insert(reviewNotes)
    .values({
      applicationId: params.applicationId,
      authorId: params.authorId,
      body: params.body.trim(),
      visibility: "APPLICANT",
      published: true,
      publishedAt: new Date(),
    })
    .returning();
  return note!;
}

export type AdminApplicationDetail = {
  application: ApplicationRow;
  applicant: {
    id: string;
    username: string;
    email: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  };
  formVersion: { version: number; publishedAt: Date | null };
  answers: AnswerRow[];
  history: {
    id: string;
    from: string | null;
    to: string;
    note: string | null;
    actor: string | null;
    at: Date;
  }[];
  notes: {
    id: string;
    body: string;
    visibility: string;
    published: boolean;
    author: string | null;
    createdAt: Date;
    publishedAt: Date | null;
  }[];
};

export async function getAdminApplication(id: string): Promise<AdminApplicationDetail | null> {
  const rows = await db
    .select({
      application: applications,
      applicant: {
        id: users.id,
        username: users.username,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
      },
      formVersion: { version: formVersions.version, publishedAt: formVersions.publishedAt },
    })
    .from(applications)
    .innerJoin(users, eq(applications.userId, users.id))
    .innerJoin(formVersions, eq(applications.formVersionId, formVersions.id))
    .where(eq(applications.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const [answerRows, historyRows, noteRows] = await Promise.all([
    db
      .select()
      .from(answers)
      .where(eq(answers.applicationId, id))
      .orderBy(asc(answers.order)),
    db
      .select({
        id: statusHistory.id,
        from: statusHistory.fromStatus,
        to: statusHistory.toStatus,
        note: statusHistory.note,
        actor: statusHistory.actorLabel,
        actorName: users.username,
        at: statusHistory.createdAt,
      })
      .from(statusHistory)
      .leftJoin(users, eq(statusHistory.actorId, users.id))
      .where(eq(statusHistory.applicationId, id))
      .orderBy(asc(statusHistory.createdAt)),
    db
      .select({
        id: reviewNotes.id,
        body: reviewNotes.body,
        visibility: reviewNotes.visibility,
        published: reviewNotes.published,
        author: users.username,
        createdAt: reviewNotes.createdAt,
        publishedAt: reviewNotes.publishedAt,
      })
      .from(reviewNotes)
      .leftJoin(users, eq(reviewNotes.authorId, users.id))
      .where(eq(reviewNotes.applicationId, id))
      .orderBy(desc(reviewNotes.createdAt)),
  ]);

  return {
    application: row.application,
    applicant: row.applicant,
    formVersion: row.formVersion,
    answers: answerRows,
    history: historyRows.map((entry) => ({
      id: entry.id,
      from: entry.from,
      to: entry.to,
      note: entry.note,
      actor: entry.actorName ?? entry.actor ?? null,
      at: entry.at,
    })),
    notes: noteRows.map((note) => ({
      id: note.id,
      body: note.body,
      visibility: note.visibility,
      published: note.published,
      author: note.author,
      createdAt: note.createdAt,
      publishedAt: note.publishedAt,
    })),
  };
}
