"use client";

import { useState } from "react";
import { SAMPLE_BRUT_PLAN, SAMPLE_RACE_CONTEXT } from "./sample-data";

type ApiSuccess = {
  plan: unknown;
  applied: Array<Record<string, unknown>>;
  rejected: Array<{ op: Record<string, unknown>; reason: string }>;
  articles_considered: Array<{ slug: string; title: string; quality: string }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
};

type ApiError = { error: string; detail?: string; issues?: unknown[] };

export function Previewer() {
  const [raceText, setRaceText] = useState(() => JSON.stringify(SAMPLE_RACE_CONTEXT, null, 2));
  const [brutText, setBrutText] = useState(() => JSON.stringify(SAMPLE_BRUT_PLAN, null, 2));
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setLatencyMs(null);

    let raceContext: unknown;
    let brutPlan: unknown;
    try {
      raceContext = JSON.parse(raceText);
      brutPlan = JSON.parse(brutText);
    } catch (err) {
      setError({ error: "JSON invalide", detail: err instanceof Error ? err.message : String(err) });
      setLoading(false);
      return;
    }

    const t0 = performance.now();
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceContext, brutPlan }),
      });
      setLatencyMs(Math.round(performance.now() - t0));
      const body = (await res.json()) as ApiSuccess | ApiError;
      if (!res.ok) setError(body as ApiError);
      else setResult(body as ApiSuccess);
    } catch (err) {
      setError({ error: "fetch failed", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Race context (JSON)</span>
          <textarea
            value={raceText}
            onChange={(e) => setRaceText(e.target.value)}
            className="h-72 rounded border border-gray-300 p-2 font-mono text-xs"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Brut plan (TimelinePlan JSON)</span>
          <textarea
            value={brutText}
            onChange={(e) => setBrutText(e.target.value)}
            className="h-72 rounded border border-gray-300 p-2 font-mono text-xs"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Enrichissement…" : "Enrichir le plan"}
        </button>
        {latencyMs !== null && <span className="text-xs text-gray-500">Latence : {latencyMs} ms</span>}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm">
          <div className="font-semibold text-red-700">Erreur : {error.error}</div>
          {error.detail && <div className="mt-1 text-red-600">{error.detail}</div>}
          {error.issues && (
            <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(error.issues, null, 2)}</pre>
          )}
        </div>
      )}

      {result && <Result data={result} />}
    </div>
  );
}

function Result({ data }: { data: ApiSuccess }) {
  const cost = estimateCost(data.usage);
  return (
    <div className="space-y-4">
      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Résumé</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Articles KB considérés : {data.articles_considered.length}</li>
          <li>Opérations appliquées : {data.applied.length}</li>
          <li>Opérations rejetées : {data.rejected.length}</li>
          <li>
            Tokens : input {data.usage.inputTokens} (cache R {data.usage.cacheReadTokens} / W{" "}
            {data.usage.cacheWriteTokens}), output {data.usage.outputTokens}
          </li>
          <li>Coût estimé : ≈ ${cost.toFixed(4)}</li>
        </ul>
      </section>

      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Articles KB</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {data.articles_considered.length === 0 && <li className="text-gray-500">(aucun)</li>}
          {data.articles_considered.map((a) => (
            <li key={a.slug}>
              <span className="font-mono text-xs text-gray-500">[{a.slug}]</span> {a.title}{" "}
              <QualityBadge quality={a.quality} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Opérations appliquées</h2>
        <OpsList ops={data.applied} kind="applied" />
      </section>

      {data.rejected.length > 0 && (
        <section className="rounded border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-lg font-semibold text-orange-800">Opérations rejetées</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {data.rejected.map((r, i) => (
              <li key={i}>
                <span className="font-mono text-xs text-orange-700">{r.reason}</span>
                <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(r.op, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Plan enrichi (JSON complet)</h2>
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-50 p-2 text-xs">
          {JSON.stringify(data.plan, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function OpsList({ ops }: { ops: Array<Record<string, unknown>>; kind: "applied" | "rejected" }) {
  if (ops.length === 0) return <p className="mt-2 text-sm text-gray-500">(aucune)</p>;
  return (
    <ul className="mt-2 space-y-3 text-sm">
      {ops.map((op, i) => (
        <li key={i} className="rounded bg-gray-50 p-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs">{String(op.op)}</span>
            <span className="text-xs text-gray-500">
              confidence {Number(op.confidence ?? 0).toFixed(2)}
            </span>
          </div>
          <p className="mt-1 italic">{String(op.why ?? "")}</p>
          <pre className="mt-1 overflow-x-auto text-xs text-gray-700">
            {JSON.stringify(op, null, 2)}
          </pre>
        </li>
      ))}
    </ul>
  );
}

function QualityBadge({ quality }: { quality: string }) {
  const color = quality === "good" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800";
  return <span className={`ml-2 rounded px-2 py-0.5 text-xs ${color}`}>{quality}</span>;
}

/**
 * Estimation grossière du coût en USD pour haiku-4-5.
 * Tarifs Anthropic (mai 2026) : input $1/M, cache write $1.25/M, cache read $0.10/M, output $5/M.
 */
function estimateCost(usage: ApiSuccess["usage"]): number {
  return (
    (usage.inputTokens * 1.0 +
      usage.cacheWriteTokens * 1.25 +
      usage.cacheReadTokens * 0.1 +
      usage.outputTokens * 5.0) /
    1_000_000
  );
}
