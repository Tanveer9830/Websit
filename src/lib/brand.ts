import type { CSSProperties } from "react";
import type { PanelSettings } from "@/lib/settings";

export type Brand = {
  name: string;
  logoUrl: string;
  accentFrom: string;
  accentTo: string;
  tagline: string;
  supportEmail: string;
};

export function brandFromSettings(settings: PanelSettings): Brand {
  return {
    name: settings.brandName,
    logoUrl: settings.logoUrl,
    accentFrom: settings.accentFrom,
    accentTo: settings.accentTo,
    tagline: settings.tagline,
    supportEmail: settings.supportEmail,
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function brandCssVars(settings: PanelSettings): CSSProperties {
  const from = HEX.test(settings.accentFrom) ? settings.accentFrom : "#8b5cf6";
  const to = HEX.test(settings.accentTo) ? settings.accentTo : "#3b82f6";
  return {
    "--brand-from": from,
    "--brand-to": to,
  } as CSSProperties;
}

/** Safe defaults for components used outside a DB-backed layout (e.g. tests). */
export const DEFAULT_BRAND: Brand = {
  name: "Top Cloud",
  logoUrl: "",
  accentFrom: "#8b5cf6",
  accentTo: "#3b82f6",
  tagline: "Staff applications, elevated.",
  supportEmail: "team@topcloud.local",
};
