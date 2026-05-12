"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  editRule,
  setRuleStatus,
  type EditRuleResult,
} from "@/lib/overlay/actions";

type Props = {
  ruleId: number;
  extractionId: number;
  status: "proposed" | "accepted" | "rejected" | "modified";
  sourceQuote: string | null;
  ruleJson: string;
};

function PendingButton({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "…" : label}
    </button>
  );
}

const STATUS_COLORS: Record<Props["status"], string> = {
  proposed: "bg-gray-100 text-gray-700",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700 line-through",
  modified: "bg-blue-100 text-blue-800",
};

export function RuleCard({
  ruleId,
  extractionId,
  status,
  sourceQuote,
  ruleJson,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(ruleJson);
  const [editState, editAction] = useActionState<EditRuleResult | null, FormData>(
    editRule,
    null,
  );

  const parsedRule = safeParse(ruleJson);

  return (
    <article className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500">#{ruleId}</span>
          {parsedRule && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {parsedRule.scope}
            </span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[status]}`}
          >
            {status}
          </span>
        </div>
      </header>

      {sourceQuote && (
        <blockquote className="mb-3 border-l-2 border-gray-300 pl-3 text-sm italic text-gray-600">
          &ldquo;{sourceQuote}&rdquo;
        </blockquote>
      )}

      {parsedRule?.description && !editing && (
        <p className="mb-2 text-sm font-medium text-gray-900">
          {parsedRule.description}
        </p>
      )}

      {editing ? (
        <form action={editAction} className="space-y-2">
          <input type="hidden" name="ruleId" value={ruleId} />
          <input type="hidden" name="extractionId" value={extractionId} />
          <textarea
            name="ruleJson"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={Math.max(6, editText.split("\n").length + 1)}
            className="w-full rounded border border-gray-300 p-2 font-mono text-xs"
            spellCheck={false}
          />
          {editState && !editState.ok && (
            <p className="text-xs text-red-600">{editState.error}</p>
          )}
          <div className="flex gap-2">
            <PendingButton
              label="Save"
              className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditText(ruleJson);
              }}
              className="rounded border border-gray-300 px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <pre className="mb-3 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
          {pretty(ruleJson)}
        </pre>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-2 text-xs">
          <form action={setRuleStatus}>
            <input type="hidden" name="ruleId" value={ruleId} />
            <input type="hidden" name="extractionId" value={extractionId} />
            <input type="hidden" name="status" value="accepted" />
            <PendingButton
              label="Accept"
              className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-50"
            />
          </form>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-gray-300 px-3 py-1"
          >
            Edit
          </button>
          <form action={setRuleStatus}>
            <input type="hidden" name="ruleId" value={ruleId} />
            <input type="hidden" name="extractionId" value={extractionId} />
            <input type="hidden" name="status" value="rejected" />
            <PendingButton
              label="Reject"
              className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-50"
            />
          </form>
          {status !== "proposed" && (
            <form action={setRuleStatus}>
              <input type="hidden" name="ruleId" value={ruleId} />
              <input type="hidden" name="extractionId" value={extractionId} />
              <input type="hidden" name="status" value="proposed" />
              <PendingButton
                label="Revert"
                className="rounded border border-gray-400 px-3 py-1 text-gray-700"
              />
            </form>
          )}
        </div>
      )}
    </article>
  );
}

function safeParse(s: string): { scope?: string; description?: string } | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function pretty(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
