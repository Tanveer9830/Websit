import { client } from "@/db";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await client.execute("SELECT 1");
    return json({ status: "ok", database: "up", service: "top-cloud", timestamp: new Date().toISOString() });
  } catch {
    return json(
      { status: "degraded", database: "down", service: "top-cloud", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
