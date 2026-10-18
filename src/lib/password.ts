import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP-recommended starting parameters (19 MiB, t=2, p=1).
const ARGON_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}

const COMMON_PASSWORDS = new Set([
  "admin",
  "admin123",
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "letmein",
  "welcome",
  "welcome1",
  "iloveyou",
  "topcloud",
  "changeme",
  "staffapplication",
]);

export type PasswordCheck = { ok: true } | { ok: false; message: string };

export function validatePasswordStrength(password: string, options: { min?: number; isOwner?: boolean } = {}): PasswordCheck {
  const min = options.min ?? 8;
  if (password.length < min) {
    return { ok: false, message: `Use at least ${min} characters.` };
  }
  if (password.length > 200) {
    return { ok: false, message: "Passwords may be at most 200 characters." };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: "Include at least one letter and one number." };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, message: "That password is too common. Choose something unique." };
  }
  if (options.isOwner && password === "admin") {
    return { ok: false, message: "You must replace the temporary default password." };
  }
  return { ok: true };
}

/**
 * A throwaway hash used to equalise response timing when a login identifier
 * does not exist. It is not a credential for any account.
 */
let dummyHashPromise: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hash("timing-equalisation-only-not-a-valid-credential", ARGON_OPTIONS);
  return dummyHashPromise;
}
