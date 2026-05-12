import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { reextract } from "@/lib/overlay/actions";
import { RuleCard } from "./_components/rule-card";

export const dynamic = "force-dynamic";

export default async function ExtractionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const [ext] = await db
    .select()
    .from(schema.extractions)
    .where(eq(schema.extractions.id, id));
  if (!ext) notFound();

  const rules = await db
    .select()
    .from(schema.proposedRules)
    .where(eq(schema.proposedRules.extractionId, id))
    .orderBy(asc(schema.proposedRules.id));

  const accepted = rules.filter((r) => r.status === "accepted").length;
  const modified = rules.filter((r) => r.status === "modified").length;
  const rejected = rules.filter((r) => r.status === "rejected").length;
  const pending = rules.filter((r) => r.status === "proposed").length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="text-sm">
        <Link href="/extract" className="text-blue-600 hover:underline">
          ← Back to extract
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Extraction #{id}</h1>
        <p className="text-xs text-gray-500">
          {ext.source}
          {ext.sourceUrl && (
            <>
              {" · "}
              <a
                href={ext.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {ext.sourceUrl}
              </a>
            </>
          )}
          {" · "}
          {ext.createdAt.toLocaleString()}
        </p>
        {ext.errorMessage && (
          <p className="rounded bg-red-50 p-2 text-xs text-red-700">
            Intake error: {ext.errorMessage}
          </p>
        )}
      </header>

      {ext.qualityScore && ext.qualityScore !== "good" && (
        <QualityBanner
          score={ext.qualityScore}
          warnings={ext.qualityWarnings ?? []}
        />
      )}

      <details className="rounded border border-gray-200 bg-white">
        <summary className="cursor-pointer p-3 text-sm font-medium">
          Source text ({ext.sourceText.length} chars)
        </summary>
        <pre className="whitespace-pre-wrap p-3 text-xs text-gray-700">
          {ext.sourceText}
        </pre>
      </details>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Proposed rules ({rules.length})
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              {accepted} accepted · {modified} modified · {rejected} rejected ·{" "}
              {pending} pending
            </span>
            <ReExtractButton extractionId={id} hasAccepted={accepted + modified > 0} />
          </div>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-gray-500">
            No rules proposed yet. Try re-extracting if the source actually
            contains concrete claims.
          </p>
        ) : (
          <div className="space-y-3">
            {rules.map((r) => (
              <RuleCard
                key={r.id}
                ruleId={r.id}
                extractionId={id}
                status={r.status}
                sourceQuote={r.sourceQuote}
                ruleJson={r.ruleJson}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function QualityBanner({
  score,
  warnings,
}: {
  score: "weak" | "bad";
  warnings: string[];
}) {
  const styles =
    score === "bad"
      ? "border-red-300 bg-red-50 text-red-900"
      : "border-amber-300 bg-amber-50 text-amber-900";
  const icon = score === "bad" ? "🔴" : "🟡";
  const label = score === "bad" ? "Bad sample" : "Weak sample";
  return (
    <div className={`rounded border ${styles} p-3 text-sm`}>
      <p className="font-medium">
        {icon} {label}
      </p>
      {warnings.length > 0 ? (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs italic">
          No specific concerns provided by the model.
        </p>
      )}
      <p className="mt-2 text-xs">
        Rules below are still extracted; use your judgment when accepting them.
      </p>
    </div>
  );
}

function ReExtractButton({
  extractionId,
  hasAccepted,
}: {
  extractionId: number;
  hasAccepted: boolean;
}) {
  return (
    <form action={reextract}>
      <input type="hidden" name="extractionId" value={extractionId} />
      <button
        type="submit"
        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
        formNoValidate
      >
        Re-extract{hasAccepted ? " (wipes review)" : ""}
      </button>
    </form>
  );
}
