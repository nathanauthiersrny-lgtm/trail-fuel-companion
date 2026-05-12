import { desc } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { ExtractForm } from "./_components/extract-form";

export const dynamic = "force-dynamic";

export default async function ExtractPage() {
  const recent = await db
    .select()
    .from(schema.extractions)
    .orderBy(desc(schema.extractions.createdAt))
    .limit(10);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Extract rules</h1>
      <p className="text-sm text-gray-600">
        Paste a forum post, article, or coach notes — or give a URL and we
        fetch + clean it. Stored for later LLM extraction.
      </p>

      <ExtractForm />

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Recent extractions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No extractions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {recent.map((row) => (
              <li key={row.id} className="space-y-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-gray-500">
                    #{row.id} · {row.source} ·{" "}
                    <StatusBadge status={row.status} />
                  </span>
                  <Link
                    href={`/extract/${row.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Review →
                  </Link>
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
                <p className="text-[10px] text-gray-400">
                  {row.createdAt.toLocaleString()}
                </p>
              </li>
            ))}
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
