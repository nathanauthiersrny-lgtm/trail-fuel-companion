import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { ExtractForm } from "./_components/extract-form";
import { DeleteExtractionButton } from "./_components/delete-button";

export const dynamic = "force-dynamic";

type RuleCounts = {
  total: number;
  accepted: number;
  modified: number;
  rejected: number;
  proposed: number;
};

const EMPTY_COUNTS: RuleCounts = {
  total: 0,
  accepted: 0,
  modified: 0,
  rejected: 0,
  proposed: 0,
};

export default async function ExtractPage() {
  const extractions = await db
    .select()
    .from(schema.extractions)
    .orderBy(desc(schema.extractions.createdAt));

  const countRows = await db
    .select({
      extractionId: schema.proposedRules.extractionId,
      total: sql<number>`count(*)`.mapWith(Number),
      accepted: sql<number>`sum(case when ${schema.proposedRules.status} = 'accepted' then 1 else 0 end)`.mapWith(Number),
      modified: sql<number>`sum(case when ${schema.proposedRules.status} = 'modified' then 1 else 0 end)`.mapWith(Number),
      rejected: sql<number>`sum(case when ${schema.proposedRules.status} = 'rejected' then 1 else 0 end)`.mapWith(Number),
      proposed: sql<number>`sum(case when ${schema.proposedRules.status} = 'proposed' then 1 else 0 end)`.mapWith(Number),
    })
    .from(schema.proposedRules)
    .groupBy(schema.proposedRules.extractionId);

  const countsById = new Map<number, RuleCounts>(
    countRows.map((r) => [
      r.extractionId,
      {
        total: r.total,
        accepted: r.accepted,
        modified: r.modified,
        rejected: r.rejected,
        proposed: r.proposed,
      },
    ]),
  );

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Extract rules</h1>
        <p className="text-sm text-gray-600">
          Paste a forum post, article, or coach notes — or give a URL and we
          fetch + clean it. Stored for later LLM extraction.
        </p>
      </div>

      <ExtractForm />

      <section className="space-y-2">
        <h2 className="text-lg font-medium">
          History ({extractions.length})
        </h2>
        {extractions.length === 0 ? (
          <p className="text-sm text-gray-500">No extractions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {extractions.map((row) => {
              const counts = countsById.get(row.id) ?? EMPTY_COUNTS;
              return (
                <li key={row.id} className="space-y-1 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gray-500">
                      #{row.id} · {row.source} ·{" "}
                      <StatusBadge status={row.status} />
                      <QualityIcon
                        score={row.qualityScore}
                        warnings={row.qualityWarnings}
                      />
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/extract/${row.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Review →
                      </Link>
                      <DeleteExtractionButton
                        extractionId={row.id}
                        ruleSummary={`${counts.total} rule${counts.total === 1 ? "" : "s"}`}
                      />
                    </div>
                  </div>

                  {row.sourceUrl && (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs text-blue-600 hover:underline"
                    >
                      {row.sourceUrl}
                    </a>
                  )}

                  {row.errorMessage ? (
                    <p className="text-xs text-red-600">{row.errorMessage}</p>
                  ) : (
                    <p className="line-clamp-3 text-xs text-gray-700">
                      {row.sourceText.slice(0, 240)}
                      {row.sourceText.length > 240 ? "…" : ""}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400">
                    <span>
                      {counts.total === 0
                        ? "no rules"
                        : `${counts.total} rule${counts.total === 1 ? "" : "s"}`}
                      {counts.total > 0 && (
                        <>
                          {" — "}
                          <Counter n={counts.accepted} label="accepted" tone="green" />
                          {" · "}
                          <Counter n={counts.modified} label="modified" tone="blue" />
                          {" · "}
                          <Counter n={counts.rejected} label="rejected" tone="red" />
                          {" · "}
                          <Counter n={counts.proposed} label="pending" tone="gray" />
                        </>
                      )}
                    </span>
                    <span>{row.createdAt.toLocaleString()}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "processed"
      ? "text-green-700"
      : status === "failed"
        ? "text-red-600"
        : "text-gray-600";
  return <span className={color}>{status}</span>;
}

function QualityIcon({
  score,
  warnings,
}: {
  score: "good" | "weak" | "bad" | null;
  warnings: string[] | null;
}) {
  if (!score || score === "good") return null;
  const icon = score === "weak" ? "🟡" : "🔴";
  const tooltip =
    warnings && warnings.length > 0
      ? `${score}: ${warnings.join(" · ")}`
      : score;
  return (
    <span className="ml-1" title={tooltip}>
      {icon}
    </span>
  );
}

function Counter({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "green" | "blue" | "red" | "gray";
}) {
  const color =
    n === 0
      ? "text-gray-400"
      : tone === "green"
        ? "text-green-700"
        : tone === "blue"
          ? "text-blue-700"
          : tone === "red"
            ? "text-red-600"
            : "text-gray-600";
  return (
    <span className={color}>
      {n} {label}
    </span>
  );
}
