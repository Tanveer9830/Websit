import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formVersions, questions, type QuestionRow } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { QUESTION_TYPES, type QuestionType } from "@/lib/constants";

export type FormQuestion = {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  options: string[];
  order: number;
};

export type PublishedForm = {
  id: string;
  version: number;
  publishedAt: string | null;
  questions: FormQuestion[];
};

export type DraftForm = {
  id: string;
  version: number;
  questions: FormQuestion[];
};

export function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function serializeQuestion(question: QuestionRow): FormQuestion {
  const type = (
    QUESTION_TYPES.includes(question.type as QuestionType) ? question.type : "SHORT_TEXT"
  ) as QuestionType;
  return {
    id: question.id,
    type,
    title: question.title,
    description: question.description,
    placeholder: question.placeholder,
    required: question.required,
    enabled: question.enabled,
    options: parseOptions(question.options),
    order: question.order,
  };
}

async function questionsFor(versionId: string): Promise<QuestionRow[]> {
  return db
    .select()
    .from(questions)
    .where(eq(questions.formVersionId, versionId))
    .orderBy(asc(questions.order));
}

export async function getPublishedForm(): Promise<PublishedForm | null> {
  const rows = await db
    .select()
    .from(formVersions)
    .where(eq(formVersions.status, "PUBLISHED"))
    .orderBy(desc(formVersions.version))
    .limit(1);
  const version = rows[0];
  if (!version) return null;
  const questionRows = await questionsFor(version.id);
  return {
    id: version.id,
    version: version.version,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    questions: questionRows.filter((question) => question.enabled).map(serializeQuestion),
  };
}

export async function getDraftForm(): Promise<DraftForm | null> {
  const rows = await db
    .select()
    .from(formVersions)
    .where(eq(formVersions.status, "DRAFT"))
    .orderBy(desc(formVersions.version))
    .limit(1);
  const draft = rows[0];
  if (!draft) return null;
  const questionRows = await questionsFor(draft.id);
  return {
    id: draft.id,
    version: draft.version,
    questions: questionRows.map(serializeQuestion),
  };
}

const CLONE_DATA = (question: QuestionRow) => ({
  type: question.type,
  title: question.title,
  description: question.description,
  placeholder: question.placeholder,
  required: question.required,
  enabled: question.enabled,
  options: question.options,
  order: question.order,
});

/**
 * Guarantees exactly one editable draft. Clones the latest published questions
 * (including disabled ones) so the builder starts from the live form.
 */
export async function ensureDraftForm(): Promise<DraftForm> {
  const existing = await getDraftForm();
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const drafts = await tx
          .select()
          .from(formVersions)
          .where(eq(formVersions.status, "DRAFT"))
          .orderBy(desc(formVersions.version))
          .limit(1);
        const again = drafts[0];
        if (again) {
          const rows = await tx
            .select()
            .from(questions)
            .where(eq(questions.formVersionId, again.id))
            .orderBy(asc(questions.order));
          return { id: again.id, version: again.version, questions: rows.map(serializeQuestion) };
        }

        const publishedRows = await tx
          .select()
          .from(formVersions)
          .where(eq(formVersions.status, "PUBLISHED"))
          .orderBy(desc(formVersions.version))
          .limit(1);
        const published = publishedRows[0];
        const publishedQuestions = published
          ? await tx
              .select()
              .from(questions)
              .where(eq(questions.formVersionId, published.id))
              .orderBy(asc(questions.order))
          : [];

        const maxRows = await tx
          .select({ max: sql<number | null>`max(${formVersions.version})` })
          .from(formVersions);
        const [created] = await tx
          .insert(formVersions)
          .values({
            version: Number(maxRows[0]?.max ?? 0) + 1,
            status: "DRAFT",
          })
          .returning();

        const inserted =
          publishedQuestions.length > 0
            ? await tx
                .insert(questions)
                .values(publishedQuestions.map((question) => ({ ...CLONE_DATA(question), formVersionId: created!.id })))
                .returning()
            : [];

        return {
          id: created!.id,
          version: created!.version,
          questions: inserted.sort((a, b) => a.order - b.order).map(serializeQuestion),
        };
      });
    } catch (error) {
      if (attempt === 2) {
        console.error("[top-cloud] draft creation failed", error instanceof Error ? error.message : "unknown");
        throw new ApiError(409, "CONFLICT", "Could not prepare a form draft. Please retry.");
      }
    }
  }
  throw new ApiError(500, "INTERNAL_ERROR", "Could not prepare a form draft.");
}

export function publishValidationErrors(
  questionList: Pick<QuestionRow, "title" | "type" | "enabled" | "options">[],
): string[] {
  const errors: string[] = [];
  const enabled = questionList.filter((question) => question.enabled);
  if (enabled.length === 0) errors.push("Enable at least one question before publishing.");
  for (const question of enabled) {
    if (!question.title.trim()) errors.push("Every enabled question needs a title.");
    const needsOptions = ["SELECT", "RADIO", "CHECKBOX"].includes(question.type);
    if (needsOptions && parseOptions(question.options).length < 2) {
      errors.push(`“${question.title || "Untitled question"}” needs at least two options.`);
    }
  }
  return errors;
}

export type PreparedAnswer = {
  questionId: string;
  type: QuestionType;
  title: string;
  description: string;
  placeholder: string;
  options: string[];
  required: boolean;
  order: number;
  value: string | string[] | null;
  valueJson: string;
};

export type AnswerValidation = {
  ok: boolean;
  errors: Record<string, string>;
  answers: PreparedAnswer[];
};

export function validateApplicationAnswers(
  questionList: FormQuestion[],
  raw: Record<string, unknown>,
): AnswerValidation {
  const errors: Record<string, string> = {};
  const prepared: PreparedAnswer[] = [];

  for (const question of [...questionList].sort((a, b) => a.order - b.order)) {
    const value = raw[question.id];
    let normalised: string | string[] | null = null;
    let error: string | null = null;

    if (question.type === "CHECKBOX") {
      const list = Array.isArray(value)
        ? Array.from(
            new Set(value.filter((item): item is string => typeof item === "string")),
          )
            .map((item) => item.trim())
            .filter(Boolean)
        : typeof value === "string" && value
          ? [value]
          : [];
      if (list.length === 0) {
        if (question.required) error = "Choose at least one option.";
      } else if (list.some((item) => !question.options.includes(item))) {
        error = "Choose options from the list.";
      } else {
        normalised = list;
      }
    } else {
      const text =
        typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
      if (!text) {
        if (question.required) error = "This question is required.";
      } else if (text.length > (question.type === "LONG_TEXT" ? 4000 : 500)) {
        error =
          question.type === "LONG_TEXT"
            ? "Keep this under 4,000 characters."
            : "Keep this under 500 characters.";
      } else if (question.type === "EMAIL") {
        if (!z.string().email().safeParse(text).success) error = "Enter a valid email address.";
        else normalised = text;
      } else if (question.type === "NUMBER") {
        if (!/^-?\d{1,15}(\.\d{1,6})?$/.test(text)) error = "Enter a valid number.";
        else normalised = text;
      } else if (question.type === "SELECT" || question.type === "RADIO") {
        if (!question.options.includes(text)) error = "Choose one of the listed options.";
        else normalised = text;
      } else if (question.type === "YES_NO") {
        if (text !== "Yes" && text !== "No") error = "Choose Yes or No.";
        else normalised = text;
      } else {
        normalised = text;
      }
    }

    if (error) errors[question.id] = error;

    prepared.push({
      questionId: question.id,
      type: question.type,
      title: question.title,
      description: question.description,
      placeholder: question.placeholder,
      options: question.options,
      required: question.required,
      order: question.order,
      value: error ? null : normalised,
      valueJson: JSON.stringify(error ? null : normalised),
    });
  }

  return { ok: Object.keys(errors).length === 0, errors, answers: prepared };
}

export function parseStoredAnswer(raw: string): string | string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    return null;
  } catch {
    return null;
  }
}

export type PublishResult = {
  publishedVersion: number;
  draftVersion: number;
  publishedAt: string;
  questionCount: number;
};

/**
 * Publishes the current draft and immediately opens a fresh draft clone.
 * Existing applications keep pointing at their original form version and keep
 * their own answer snapshots, so historical submissions never change.
 */
export async function publishDraftForm(actorId: string): Promise<PublishResult> {
  await ensureDraftForm();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const draftRows = await tx
          .select()
          .from(formVersions)
          .where(eq(formVersions.status, "DRAFT"))
          .orderBy(desc(formVersions.version))
          .limit(1);
        const draft = draftRows[0];
        if (!draft) throw new ApiError(409, "NO_DRAFT", "There is no draft form to publish.");

        const draftQuestions = await tx
          .select()
          .from(questions)
          .where(eq(questions.formVersionId, draft.id))
          .orderBy(asc(questions.order));

        const errors = publishValidationErrors(draftQuestions);
        if (errors.length > 0) {
          throw new ApiError(422, "FORM_INVALID", "Fix the form before publishing.", { errors });
        }

        await tx
          .update(formVersions)
          .set({ status: "ARCHIVED", updatedAt: new Date() })
          .where(eq(formVersions.status, "PUBLISHED"));

        const publishedAt = new Date();
        const [published] = await tx
          .update(formVersions)
          .set({
            status: "PUBLISHED",
            publishedAt,
            publishedById: actorId,
            updatedAt: publishedAt,
          })
          .where(eq(formVersions.id, draft.id))
          .returning();

        const maxRows = await tx
          .select({ max: sql<number | null>`max(${formVersions.version})` })
          .from(formVersions);
        const [newDraft] = await tx
          .insert(formVersions)
          .values({ version: Number(maxRows[0]?.max ?? published!.version) + 1, status: "DRAFT" })
          .returning();

        if (draftQuestions.length > 0) {
          await tx.insert(questions).values(
            draftQuestions.map((question) => ({
              ...CLONE_DATA(question),
              formVersionId: newDraft!.id,
            })),
          );
        }

        return {
          publishedVersion: published!.version,
          draftVersion: newDraft!.version,
          publishedAt: publishedAt.toISOString(),
          questionCount: draftQuestions.filter((question) => question.enabled).length,
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt === 1) throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Could not publish the form.");
}
