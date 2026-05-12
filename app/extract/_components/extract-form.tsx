"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createExtraction, type ExtractionResult } from "@/lib/overlay/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Extracting…" : "Extract"}
    </button>
  );
}

export function ExtractForm() {
  const [mode, setMode] = useState<"paste" | "url">("paste");
  const [state, formAction] = useActionState<ExtractionResult | null, FormData>(
    createExtraction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <fieldset className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="source"
            value="paste"
            checked={mode === "paste"}
            onChange={() => setMode("paste")}
          />
          Paste text
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="source"
            value="url"
            checked={mode === "url"}
            onChange={() => setMode("url")}
          />
          Fetch URL
        </label>
      </fieldset>

      {mode === "paste" ? (
        <textarea
          name="sourceText"
          required
          rows={10}
          placeholder="Paste forum post / article / coach notes here…"
          className="w-full rounded border border-gray-300 p-2 font-mono text-sm"
        />
      ) : (
        <input
          type="url"
          name="sourceUrl"
          required
          placeholder="https://forum.example.com/thread/123"
          className="w-full rounded border border-gray-300 p-2 text-sm"
        />
      )}

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-green-700">
            Extraction #{state.id} saved.
          </p>
        )}
      </div>
    </form>
  );
}
