// One-off JSON snapshot, handy for curl checks.
import { latest, sample } from "@/lib/sampler";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = latest() ?? (await sample());
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
