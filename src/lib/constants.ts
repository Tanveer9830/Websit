export const PRODUCT_NAME = "Top Cloud";
export const PRODUCT_TAGLINE = "Staff applications, elevated.";

export const ROLES = ["MEMBER", "ADMIN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const QUESTION_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "NUMBER",
  "SELECT",
  "RADIO",
  "CHECKBOX",
  "YES_NO",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; short: string; description: string; hasOptions: boolean }
> = {
  SHORT_TEXT: {
    label: "Short text",
    short: "Short text",
    description: "A single-line answer.",
    hasOptions: false,
  },
  LONG_TEXT: {
    label: "Long text",
    short: "Paragraph",
    description: "A multi-line paragraph answer.",
    hasOptions: false,
  },
  EMAIL: {
    label: "Email",
    short: "Email",
    description: "A validated email address.",
    hasOptions: false,
  },
  NUMBER: {
    label: "Number",
    short: "Number",
    description: "A numeric value.",
    hasOptions: false,
  },
  SELECT: {
    label: "Dropdown",
    short: "Dropdown",
    description: "Pick one option from a menu.",
    hasOptions: true,
  },
  RADIO: {
    label: "Single choice",
    short: "Radio",
    description: "Pick exactly one option.",
    hasOptions: true,
  },
  CHECKBOX: {
    label: "Multiple choice",
    short: "Checkboxes",
    description: "Pick one or more options.",
    hasOptions: true,
  },
  YES_NO: {
    label: "Yes / no",
    short: "Yes / no",
    description: "A simple yes or no question.",
    hasOptions: false,
  },
};

export const APPLICATION_STATUSES = [
  "PENDING",
  "REVIEWING",
  "UNDER_CONSIDERATION",
  "APPROVED",
  "REJECTED",
  "ON_HOLD",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_META: Record<
  ApplicationStatus,
  {
    label: string;
    description: string;
    tone: string;
    color: string;
    cssClass: string;
  }
> = {
  PENDING: {
    label: "Pending",
    description: "Received and waiting for a first look.",
    tone: "info",
    color: "#60a5fa",
    cssClass: "status-pending",
  },
  REVIEWING: {
    label: "Reviewing",
    description: "A reviewer is reading this application.",
    tone: "violet",
    color: "#a78bfa",
    cssClass: "status-reviewing",
  },
  UNDER_CONSIDERATION: {
    label: "Under consideration",
    description: "Shortlisted and being considered for the team.",
    tone: "cyan",
    color: "#22d3ee",
    cssClass: "status-consideration",
  },
  APPROVED: {
    label: "Approved",
    description: "Accepted — welcome to the team.",
    tone: "success",
    color: "#34d399",
    cssClass: "status-approved",
  },
  REJECTED: {
    label: "Rejected",
    description: "Not selected at this time.",
    tone: "danger",
    color: "#fb7185",
    cssClass: "status-rejected",
  },
  ON_HOLD: {
    label: "On hold",
    description: "Decision temporarily paused.",
    tone: "muted",
    color: "#94a3b8",
    cssClass: "status-hold",
  },
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  OWNER_BOOTSTRAP: "Owner initialized",
  OWNER_RECOVERY: "Owner recovery performed",
  USER_REGISTERED: "Member registered",
  EMAIL_VERIFIED: "Email verified",
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILED: "Sign-in failed",
  LOGIN_BLOCKED: "Sign-in blocked (rate limit)",
  LOGOUT: "Signed out",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET: "Password reset",
  ACCOUNT_UPDATED: "Account updated",
  SESSIONS_REVOKED: "Sessions revoked",
  APPLICATION_SUBMITTED: "Application submitted",
  APPLICATION_STATUS_CHANGED: "Application status changed",
  APPLICATION_NOTE_ADDED: "Internal note added",
  APPLICATION_FEEDBACK_PUBLISHED: "Applicant feedback published",
  FORM_PUBLISHED: "Form published",
  QUESTION_CREATED: "Question created",
  QUESTION_UPDATED: "Question updated",
  QUESTION_DELETED: "Question deleted",
  QUESTIONS_REORDERED: "Questions reordered",
  SETTINGS_UPDATED: "Settings updated",
  ADMIN_PROMOTED: "Administrator granted",
  ADMIN_DEMOTED: "Administrator revoked",
  MEMBER_DISABLED: "Member disabled",
  MEMBER_ENABLED: "Member enabled",
};

export const DEFAULT_ACCENT_FROM = "#8b5cf6";
export const DEFAULT_ACCENT_TO = "#3b82f6";
