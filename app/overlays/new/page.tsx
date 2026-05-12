import { desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { ComposeForm, type EligibleRule } from "./_components/compose-form";

export const dynamic = "force-dynamic";

export default async function ComposeOverlayPage() {
  const rules = await db
    .select()
    .from(schema.proposedRules)
    .where(sql`${schema.proposedRules.status} in ('accepted', 'modified')`)
    .orderBy(desc(schema.proposedRules.extractionId), schema.proposedRules.id);

  const extractionIds = Array.from(new Set(rules.map((r) => r.extractionId)));
  const exts =
    extractionIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.extractions)
          .where(inArray(schema.extractions.id, extractionIds));
  const extsById = new Map(exts.map((e) => [e.id, e]));

  const eligible: EligibleRule[] = rules.map((r) => {
    const parsed = safeParse(r.ruleJson);
    const ext = extsById.get(r.extractionId);
    return {
      id: r.id,
      extractionId: r.extractionId,
      sourceQuote: r.sourceQuote,
      status: r.status as "accepted" | "modified",
      scope: parsed?.scope ?? "?",
      description: parsed?.description ?? "(no description)",
      ruleId: parsed?.id ?? "?",
      sourceLabel: ext
        ? ext.sourceUrl
          ? new URL(ext.sourceUrl).host
          : "paste"
        : "?",
    };
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="text-sm">
        <Link href="/overlays" className="text-blue-600 hover:underline">
          ← Back to overlays
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">Compose overlay</h1>
      {eligible.length === 0 ? (
        <p className="text-sm text-gray-500">
          No accepted or modified rules yet. Go to{" "}
          <Link href="/extract" className="text-blue-600 hover:underline">
            /extract
          </Link>{" "}
          to review some rules first.
        </p>
      ) : (
        <ComposeForm rules={eligible} />
      )}
    </main>
  );
}

function safeParse(
  s: string,
): { scope?: string; description?: string; id?: string } | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
