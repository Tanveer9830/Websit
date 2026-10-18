import { getSettings, updateSettings, type PanelSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { ApiError, assertMutation, handle, json, parseBody, requireAdmin } from "@/lib/api";
import { settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  return handle("admin.settings.update", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "MANAGE_SETTINGS");
    const input = await parseBody(req, settingsSchema);
    const current = await getSettings();

    const patch = { ...input } as Partial<PanelSettings>;

    if (patch.positions) {
      const seen = new Set<string>();
      const normalised: string[] = [];
      for (const position of patch.positions) {
        const clean = position.trim();
        const key = clean.toLowerCase();
        if (!clean || seen.has(key)) continue;
        seen.add(key);
        normalised.push(clean);
      }
      patch.positions = normalised.slice(0, 20);
    }

    const nextPositions = patch.positions ?? current.positions;
    const nextPositionsEnabled = patch.positionsEnabled ?? current.positionsEnabled;
    if (nextPositionsEnabled && nextPositions.length === 0) {
      throw new ApiError(422, "INVALID_POSITIONS", "Add at least one position, or turn positions off.", {
        fields: { positions: "Add at least one position, or turn positions off." },
      });
    }

    const settings = await updateSettings(patch);

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "SETTINGS_UPDATED",
      targetType: "Settings",
      targetId: "panel",
      metadata: { fields: Object.keys(patch) },
    });

    return json({ ok: true, settings, message: "Panel settings saved." });
  });
}
