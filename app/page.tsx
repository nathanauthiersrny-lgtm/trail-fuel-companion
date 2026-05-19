import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Trail Fuel — companion</h1>
      <p className="text-sm text-gray-600">
        Extract nutrition rules from forum posts / coach notes / articles, then
        export an overlay JSON for the native app.
      </p>
      <nav className="space-y-2 text-sm">
        <Link
          href="/extract"
          className="block rounded border border-gray-300 p-3 hover:bg-gray-50"
        >
          → Extract rules from a paste or URL
        </Link>
        <Link
          href="/overlays"
          className="block rounded border border-gray-300 p-3 hover:bg-gray-50"
        >
          → Compose &amp; export overlay JSON
        </Link>
        <Link
          href="/preview"
          className="block rounded border border-gray-300 p-3 hover:bg-gray-50"
        >
          → Plan enrichment previewer (A.3)
        </Link>
      </nav>
    </main>
  );
}
