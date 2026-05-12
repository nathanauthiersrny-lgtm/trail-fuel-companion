"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteExtraction } from "@/lib/overlay/actions";

function PendingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

export function DeleteExtractionButton({
  extractionId,
  ruleSummary,
}: {
  extractionId: number;
  ruleSummary: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={deleteExtraction}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete extraction #${extractionId}? ${ruleSummary} will be wiped.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="extractionId" value={extractionId} />
      <PendingButton label="Delete" />
    </form>
  );
}
