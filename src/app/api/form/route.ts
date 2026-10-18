import { getPublishedForm } from "@/lib/form";
import { getSettings } from "@/lib/settings";
import { handle, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle("form", async () => {
    const [form, settings] = await Promise.all([getPublishedForm(), getSettings()]);
    return json({
      form,
      config: {
        applicationsOpen: settings.applicationsOpen,
        positionsEnabled: settings.positionsEnabled,
        positions: settings.positions,
        collectDiscord: settings.collectDiscord,
        allowMultiple: settings.allowMultiple,
        requireVerifiedEmail: settings.requireVerifiedEmail,
      },
    });
  });
}
