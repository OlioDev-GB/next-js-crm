"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UPDATE_ADDENDUM_WIDGET_NAME } from "@/widgets/update-addendum";
import type { UpdateAddendumResult } from "@/widgets/update-addendum/types";
import type { WidgetOpenContext } from "@/widgets/types";

type UpdateAddendumWidgetProps = WidgetOpenContext & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Update Addendum — appends text to Deals.Addendum via Mass_Update_Addendum.
 */
export function UpdateAddendumWidget({
  open,
  onClose,
  selectedRecordIds,
  module = "Deals",
  className,
}: UpdateAddendumWidgetProps) {
  const titleId = useId();
  const textId = useId();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UpdateAddendumResult | null>(null);

  const [openSnapshot, setOpenSnapshot] = useState(false);
  if (open !== openSnapshot) {
    setOpenSnapshot(open);
    if (open) {
      setText("");
      setSubmitting(false);
      setError(null);
      setResult(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  async function handleSubmit() {
    setError(null);
    setResult(null);

    if (selectedRecordIds.length === 0) {
      setError("Select at least one SOW.");
      return;
    }
    if (!text.trim()) {
      setError("Enter addendum text.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/widgets/update-addendum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedRecordIds, text, module }),
      });
      const data = (await response.json().catch(
        () => ({}),
      )) as UpdateAddendumResult;
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to update addendum.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update addendum.");
    } finally {
      setSubmitting(false);
    }
  }

  const showSuccess = Boolean(result?.ok);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px] dark:bg-black/60"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={submitting}
        className={cn(
          "relative w-full max-w-[28rem] overflow-hidden rounded-2xl border border-crm-border bg-crm-panel shadow-xl",
          className,
        )}
      >
        {submitting ?
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-crm-panel/85 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
            <p className="text-sm font-medium text-crm-text">Updating addendum…</p>
          </div>
        : null}

        <header className="flex items-start justify-between gap-3 border-b border-crm-border bg-crm-panel-muted/80 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="page-heading truncate text-base sm:text-lg">
              {UPDATE_ADDENDUM_WIDGET_NAME}
            </h2>
            <p className="mt-1 text-sm text-crm-text-muted">
              {selectedRecordIds.length.toLocaleString("en-US")} SOW
              {selectedRecordIds.length === 1 ? "" : "s"} selected
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="crm-toolbar-btn shrink-0"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {showSuccess && result ?
            <>
              <p className="whitespace-pre-wrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                {result.message || "Addendum updated."}
              </p>
              <Button
                type="button"
                className="mt-5 h-10 w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={onClose}
              >
                OK
              </Button>
            </>
          : <>
              <label htmlFor={textId} className="mb-2 block text-sm font-medium text-crm-text">
                Addendum
              </label>
              <textarea
                id={textId}
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={5}
                placeholder="Enter details..."
                className="w-full rounded-lg border border-crm-border bg-crm-panel px-3 py-2 text-sm text-crm-text outline-none focus:border-blue-500"
              />

              {error ?
                <p className="mt-4 whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              : null}

              <Button
                type="button"
                className="mt-5 h-10 w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={submitting || selectedRecordIds.length === 0}
              >
                Submit
              </Button>
            </>
          }
        </div>
      </div>
    </div>
  );
}
