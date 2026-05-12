import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { deleteOverlay } from "@/lib/overlay/actions";
import { buildOverlayFile } from "@/lib/overlay/build-overlay-file";
import { DeleteOverlayButton } from "./_components/delete-button";

export const dynamic = "force-dynamic";

export default async function OverlayDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const [overlay] = await db
    .select()
    .from(schema.overlays)
    .where(eq(schema.overlays.id, id));
  if (!overlay) notFound();

  const built = await buildOverlayFile(id);
  if (!built) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="text-sm">
        <Link href="/overlays" className="text-blue-600 hover:underline">
          ← Back to overlays
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{overlay.name}</h1>
        <p className="text-xs text-gray-500">
          v{overlay.version} · created {overlay.createdAt.toLocaleString()}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/overlays/${id}/download`}
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
        >
          Download .json
        </a>
        <DeleteOverlayButton overlayId={id} name={overlay.name} />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">
          Included rules ({built.file.rules.length})
        </h2>
        {built.skippedRuleIds.length > 0 && (
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
            {built.skippedRuleIds.length} linked rule
            {built.skippedRuleIds.length === 1 ? " is" : "s are"} currently
            rejected / proposed and excluded from the export. Live-filtered on
            each download.
          </p>
        )}
        {built.file.rules.length === 0 ? (
          <p className="text-sm text-gray-500">No live rules to include.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {built.file.rules.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                    {r.scope}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {r.id}
                  </span>
                </div>
                <p className="mt-1 text-gray-900">{r.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Preview (.json)</h2>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(built.file, null, 2)}
        </pre>
      </section>
    </main>
  );
}
