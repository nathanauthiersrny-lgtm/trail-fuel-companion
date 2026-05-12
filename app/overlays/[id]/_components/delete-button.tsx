"use client";

import { useFormStatus } from "react-dom";
import { deleteOverlay } from "@/lib/overlay/actions";

function PendingButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete overlay"}
    </button>
  );
}

export function DeleteOverlayButton({
  overlayId,
  name,
}: {
  overlayId: number;
  name: string;
}) {
  return (
    <form
      action={deleteOverlay}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete overlay "${name}"? The proposed rules themselves are kept.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="overlayId" value={overlayId} />
      <PendingButton />
    </form>
  );
}
