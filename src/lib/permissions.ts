import type { Role } from "@/lib/constants";

export const PERMISSIONS = {
  REVIEW_APPLICATIONS: {
    label: "Review applications",
    description:
      "Open submitted applications, update statuses, write internal notes and publish applicant feedback.",
  },
  MANAGE_QUESTIONS: {
    label: "Manage questions",
    description: "Create, edit, reorder, delete and publish application form questions.",
  },
  MANAGE_MEMBERS: {
    label: "View members",
    description: "View the member directory. Only the owner can change roles or disable accounts.",
  },
  MANAGE_SETTINGS: {
    label: "Manage panel settings",
    description: "Edit branding, application availability, positions and notification settings.",
  },
  VIEW_AUDIT: {
    label: "View audit log",
    description: "Read the immutable record of important administrative actions.",
  },
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

export function parsePermissions(raw: string | null | undefined): Permission[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter(isPermission)));
  } catch {
    return [];
  }
}

export function serializePermissions(permissions: readonly Permission[]): string {
  return JSON.stringify(Array.from(new Set(permissions.filter(isPermission))));
}

export type PermissionUser = {
  role: string;
  permissions?: string | null;
};

export function isOwner(user: PermissionUser | null | undefined): boolean {
  return user?.role === "OWNER";
}

export function isAdminLike(user: PermissionUser | null | undefined): boolean {
  return user?.role === "OWNER" || user?.role === "ADMIN";
}

export function hasPermission(
  user: PermissionUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  if (user.role !== "ADMIN") return false;
  return parsePermissions(user.permissions).includes(permission);
}

export function hasAnyAdminPermission(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  if (user.role !== "ADMIN") return false;
  return parsePermissions(user.permissions).length > 0;
}

export function primaryRoleLabel(role: Role | string): string {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN") return "Administrator";
  return "Member";
}
