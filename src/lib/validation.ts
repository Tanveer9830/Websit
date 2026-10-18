import { z } from "zod";
import { APPLICATION_STATUSES, QUESTION_TYPES } from "@/lib/constants";
import { ALL_PERMISSIONS, type Permission } from "@/lib/permissions";

const username = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[A-Za-z0-9_.-]+$/, "Use letters, numbers, dots, dashes or underscores only.")
  .transform((value) => value.toLowerCase());

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(254, "Email address is too long.")
  .email("Enter a valid email address.");

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "Passwords may be at most 200 characters.");

export const registerSchema = z.object({
  username,
  email,
  password,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your username or email.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
  admin: z.boolean().optional().default(false),
  next: z.string().max(300).optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "This reset link is invalid.").max(300),
  password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20, "This verification link is invalid.").max(300),
});

export const resendVerificationSchema = z.object({});

export const profileSchema = z
  .object({
    username: username.optional(),
    email: email.optional(),
    currentPassword: z.string().max(200).optional(),
  })
  .refine((value) => Boolean(value.username || value.email), {
    message: "Nothing to update.",
    path: ["form"],
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: password,
});

export const questionInputSchema = z
  .object({
    type: z.enum(QUESTION_TYPES),
    title: z.string().trim().min(2, "Question title is required.").max(160),
    description: z.string().trim().max(500).optional().default(""),
    placeholder: z.string().trim().max(120).optional().default(""),
    required: z.boolean().optional().default(true),
    enabled: z.boolean().optional().default(true),
    options: z.array(z.string().trim().min(1).max(100)).max(30).optional().default([]),
  })
  .superRefine((value, ctx) => {
    const needsOptions = value.type === "SELECT" || value.type === "RADIO" || value.type === "CHECKBOX";
    if (needsOptions) {
      if (value.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Add at least two answer options.",
        });
      }
      if (new Set(value.options).size !== value.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Answer options must be unique.",
        });
      }
    }
  });

export const reorderQuestionsSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100),
});

export const statusUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: z.string().trim().max(1000).optional().default(""),
});

export const internalNoteSchema = z.object({
  body: z.string().trim().min(1, "Write a note first.").max(4000),
});

export const feedbackSchema = z.object({
  body: z.string().trim().min(1, "Write feedback first.").max(4000),
});

const permissionEnum = z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]]);

export const roleUpdateSchema = z
  .object({
    role: z.enum(["MEMBER", "ADMIN"]),
    permissions: z.array(permissionEnum).max(ALL_PERMISSIONS.length).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (value.role === "ADMIN" && value.permissions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["permissions"],
        message: "Choose at least one permission for an administrator.",
      });
    }
  });

export const memberStatusSchema = z.object({
  disabled: z.boolean(),
});

const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour such as #8b5cf6.");

const logoUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      /^https?:\/\/[^\s]+$/i.test(value) ||
      /^\/[^\s]*$/.test(value),
    "Use an https:// image URL or an internal path starting with /.",
  );

export const settingsSchema = z
  .object({
    brandName: z.string().trim().min(1, "Panel name is required.").max(40).optional(),
    tagline: z.string().trim().max(120).optional(),
    description: z.string().trim().max(400).optional(),
    logoUrl: logoUrl.optional(),
    accentFrom: hexColor.optional(),
    accentTo: hexColor.optional(),
    supportEmail: z.string().trim().toLowerCase().max(254).email("Enter a valid support email.").optional(),
    footerNote: z.string().trim().max(160).optional(),
    applicationsOpen: z.boolean().optional(),
    positionsEnabled: z.boolean().optional(),
    positions: z
      .array(z.string().trim().min(1, "Position names cannot be empty.").max(60))
      .max(20)
      .optional(),
    collectDiscord: z.boolean().optional(),
    allowMultiple: z.boolean().optional(),
    requireVerifiedEmail: z.boolean().optional(),
    notifyStatusEmail: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "No settings supplied." });

const applicationAnswerValue = z.union([z.string().max(4000), z.array(z.string().max(200)).max(30), z.null()]);

export const applicationSubmitSchema = z.object({
  position: z.string().trim().max(60).optional().nullable(),
  discordUsername: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9._-]*$/, "Discord usernames can use letters, numbers, dots, dashes and underscores.")
    .optional()
    .nullable(),
  discordId: z
    .string()
    .trim()
    .max(32)
    .regex(/^[0-9]*$/, "A Discord ID contains digits only.")
    .optional()
    .nullable(),
  answers: z.record(z.string().min(1).max(64), applicationAnswerValue),
});

export const adminSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.union([z.enum(APPLICATION_STATUSES), z.literal("ALL")]).optional().default("ALL"),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;
