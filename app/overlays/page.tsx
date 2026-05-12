import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function OverlaysPage() {
  const overlays = await db
    .select()
    .from(schema.overlays)
    .orderBy(desc(schema.overlays.createdAt));

  const linkRows = await db
    .select({
      overlayId: schema.overlayRules.overlayId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.overlayRules)
    .groupBy(schema.overlayRules.overlayId);
  const countsById = new Map(linkRows.map((r) => [r.overlayId, r.count]));

  const [{ ready }] = await db
    .select({
      ready: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.proposedRules)
    .where(
      sql`${schema.proposedRules.status} in ('accepted', 'modified')`,
    );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Overlays</h1>
        <Link
          href="/overlays/new"
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
        >
          + Compose new
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        Overlays bundle accepted/modified rules into a JSON file you can import
        into the native app. {ready} rule{ready === 1 ? "" : "s"} ready to
        include.
      </p>

      {overlays.length === 0 ? (
        <p className="text-sm text-gray-500">No overlays yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200">
          {overlays.map((row) => {
            const ruleCount = countsById.get(row.id) ?? 0;
            return (
              <li key={row.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/overlays/${row.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="font-mono text-xs text-gray-500">
                    v{row.version}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {ruleCount} rule{ruleCount === 1 ? "" : "s"} linked
                  </span>
                  <span>{row.createdAt.toLocaleString()}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
