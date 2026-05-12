import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { overlayFileSchema, type OverlayFile } from "./schema";

export type OverlayBuildResult = {
  file: OverlayFile;
  includedRuleIds: number[];
  skippedRuleIds: number[];
};

export async function buildOverlayFile(
  overlayId: number,
): Promise<OverlayBuildResult | null> {
  const [overlay] = await db
    .select()
    .from(schema.overlays)
    .where(eq(schema.overlays.id, overlayId));
  if (!overlay) return null;

  const links = await db
    .select({ proposedRuleId: schema.overlayRules.proposedRuleId })
    .from(schema.overlayRules)
    .where(eq(schema.overlayRules.overlayId, overlayId));
  const linkedIds = links.map((l) => l.proposedRuleId);

  if (linkedIds.length === 0) {
    const file = overlayFileSchema.parse({ version: overlay.version, rules: [] });
    return { file, includedRuleIds: [], skippedRuleIds: [] };
  }

  const rows = await db
    .select()
    .from(schema.proposedRules)
    .where(
      and(
        inArray(schema.proposedRules.id, linkedIds),
        or(
          eq(schema.proposedRules.status, "accepted"),
          eq(schema.proposedRules.status, "modified"),
        ),
      ),
    );

  const includedRuleIds: number[] = [];
  const rules = rows.map((r) => {
    includedRuleIds.push(r.id);
    return JSON.parse(r.ruleJson);
  });

  const skippedRuleIds = linkedIds.filter(
    (id) => !includedRuleIds.includes(id),
  );

  const file = overlayFileSchema.parse({
    version: overlay.version,
    rules,
  });

  return { file, includedRuleIds, skippedRuleIds };
}
