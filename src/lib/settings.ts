import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { DEFAULT_ACCENT_FROM, DEFAULT_ACCENT_TO, PRODUCT_NAME } from "@/lib/constants";

export type PanelSettings = {
  brandName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  accentFrom: string;
  accentTo: string;
  supportEmail: string;
  footerNote: string;
  applicationsOpen: boolean;
  positionsEnabled: boolean;
  positions: string[];
  collectDiscord: boolean;
  allowMultiple: boolean;
  requireVerifiedEmail: boolean;
  notifyStatusEmail: boolean;
};

export const DEFAULT_SETTINGS: PanelSettings = {
  brandName: PRODUCT_NAME,
  tagline: "Staff applications, elevated.",
  description:
    "The staff application panel for Top Cloud. Apply once, follow every step, and hear back from a real person — not a void.",
  logoUrl: "",
  accentFrom: DEFAULT_ACCENT_FROM,
  accentTo: DEFAULT_ACCENT_TO,
  supportEmail: "team@topcloud.local",
  footerNote: "Every application is read by a human. Good luck — we're rooting for you.",
  applicationsOpen: true,
  positionsEnabled: true,
  positions: ["Community Support", "Moderation", "Engineering", "Design & Content"],
  collectDiscord: true,
  allowMultiple: true,
  requireVerifiedEmail: false,
  notifyStatusEmail: false,
};

export const SETTING_KEYS: Record<keyof PanelSettings, string> = {
  brandName: "brand.name",
  tagline: "brand.tagline",
  description: "brand.description",
  logoUrl: "brand.logoUrl",
  accentFrom: "brand.accentFrom",
  accentTo: "brand.accentTo",
  supportEmail: "brand.supportEmail",
  footerNote: "brand.footerNote",
  applicationsOpen: "apply.open",
  positionsEnabled: "apply.positionsEnabled",
  positions: "apply.positions",
  collectDiscord: "apply.collectDiscord",
  allowMultiple: "apply.allowMultiple",
  requireVerifiedEmail: "apply.requireVerifiedEmail",
  notifyStatusEmail: "notify.statusEmail",
};

const KEY_TO_SETTING = Object.fromEntries(
  Object.entries(SETTING_KEYS).map(([setting, key]) => [key, setting as keyof PanelSettings]),
) as Record<string, keyof PanelSettings>;

function encode(key: keyof PanelSettings, value: PanelSettings[keyof PanelSettings]): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value ?? "");
}

function decode(key: keyof PanelSettings, raw: string): PanelSettings[keyof PanelSettings] | undefined {
  const fallback = DEFAULT_SETTINGS[key];
  if (typeof fallback === "boolean") return raw === "true";
  if (Array.isArray(fallback)) {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string").slice(0, 20)
        : fallback;
    } catch {
      return fallback;
    }
  }
  return raw;
}

export async function getSettings(): Promise<PanelSettings> {
  try {
    const rows = await db.select().from(settingsTable);
    const settings: PanelSettings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      const settingKey = KEY_TO_SETTING[row.key];
      if (!settingKey) continue;
      const value = decode(settingKey, row.value);
      if (value !== undefined) {
        (settings as unknown as Record<string, unknown>)[settingKey] = value;
      }
    }
    if (!settings.brandName.trim()) settings.brandName = PRODUCT_NAME;
    if (!/^#[0-9a-fA-F]{6}$/.test(settings.accentFrom)) settings.accentFrom = DEFAULT_ACCENT_FROM;
    if (!/^#[0-9a-fA-F]{6}$/.test(settings.accentTo)) settings.accentTo = DEFAULT_ACCENT_TO;
    return settings;
  } catch (error) {
    console.error(
      "[top-cloud] could not read settings (database not initialized?)",
      error instanceof Error ? error.message : "unknown",
    );
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(patch: Partial<PanelSettings>): Promise<PanelSettings> {
  const entries = Object.entries(patch).filter(([key]) => key in SETTING_KEYS) as [
    keyof PanelSettings,
    PanelSettings[keyof PanelSettings],
  ][];

  await db.transaction(async (tx) => {
    for (const [settingKey, value] of entries) {
      const key = SETTING_KEYS[settingKey];
      await tx
        .insert(settingsTable)
        .values({ key, value: encode(settingKey, value) })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: encode(settingKey, value) } });
    }
  });

  return getSettings();
}

export async function ensureDefaultSettings(): Promise<void> {
  const existing = await db.select({ key: settingsTable.key }).from(settingsTable);
  const existingKeys = new Set(existing.map((row) => row.key));
  const missing = (Object.keys(SETTING_KEYS) as (keyof PanelSettings)[]).filter(
    (settingKey) => !existingKeys.has(SETTING_KEYS[settingKey]),
  );
  if (missing.length === 0) return;
  await db
    .insert(settingsTable)
    .values(
      missing.map((settingKey) => ({
        key: SETTING_KEYS[settingKey],
        value: encode(settingKey, DEFAULT_SETTINGS[settingKey]),
      })),
    )
    .onConflictDoNothing();
}
