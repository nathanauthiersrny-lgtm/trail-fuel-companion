import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { buildOverlayFile } from "@/lib/overlay/build-overlay-file";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return new Response("Invalid overlay id", { status: 400 });
  }

  const [overlay] = await db
    .select()
    .from(schema.overlays)
    .where(eq(schema.overlays.id, id));
  if (!overlay) return new Response("Not found", { status: 404 });

  const built = await buildOverlayFile(id);
  if (!built) return new Response("Build failed", { status: 500 });

  const filename = `${slugify(overlay.name)}-v${overlay.version}.json`;
  return new Response(JSON.stringify(built.file, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "overlay";
}
