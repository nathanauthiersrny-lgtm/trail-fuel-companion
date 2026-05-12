"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createOverlay,
  type CreateOverlayResult,
} from "@/lib/overlay/actions";

export type EligibleRule = {
  id: number;
  extractionId: number;
  sourceQuote: string | null;
  status: "accepted" | "modified";
  scope: string;
  description: string;
  ruleId: string;
  sourceLabel: string;
};

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
    >
      {pending
        ? "Creating…"
        : `Create overlay (${count} rule${count === 1 ? "" : "s"})`}
    </button>
  );
}

export function ComposeForm({ rules }: { rules: EligibleRule[] }) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(rules.map((r) => r.id)),
  );
  const [state, formAction] = useActionState<CreateOverlayResult | null, FormData>(
    createOverlay,
    null,
  );

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-gray-700">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Hot weather pack"
            className="w-full rounded border border-gray-300 p-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-gray-700">Version (semver)</span>
          <input
            name="version"
            required
            defaultValue="1.0.0"
            pattern="\d+\.\d+\.\d+"
            className="w-full rounded border border-gray-300 p-2 font-mono"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Pick rules to include ({selected.size} / {rules.length})
        </legend>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelected(new Set(rules.map((r) => r.id)))}
            className="text-blue-600 hover:underline"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-blue-600 hover:underline"
          >
            Clear
          </button>
        </div>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200">
          {rules.map((r) => (
            <li key={r.id} className="p-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="ruleIds"
                  value={r.id}
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {r.scope}
                    </span>
                    <span className="font-mono text-xs text-gray-500">
                      {r.ruleId}
                    </span>
                    {r.status === "modified" && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        modified
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900">{r.description}</p>
                  {r.sourceQuote && (
                    <p className="text-xs italic text-gray-600">
                      &ldquo;{r.sourceQuote}&rdquo;
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">
                    <Link
                      href={`/extract/${r.extractionId}`}
                      className="hover:underline"
                    >
                      from extraction #{r.extractionId} ({r.sourceLabel})
                    </Link>
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton count={selected.size} />
        {state && !state.ok && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-green-700">
            Created overlay #{state.id} —{" "}
            <Link
              href={`/overlays/${state.id}`}
              className="text-blue-700 underline"
            >
              open
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
