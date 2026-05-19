import Link from "next/link";
import { Previewer } from "./_components/previewer";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Plan enrichment previewer</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← home
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        Colle un race context + un brut plan (sortie de l&apos;engine déterministe mobile) et lance l&apos;enrichissement
        via Claude. Vois la KB matchée, les opérations appliquées/rejetées, le plan final, et les tokens consommés.
      </p>

      <Previewer />
    </main>
  );
}
