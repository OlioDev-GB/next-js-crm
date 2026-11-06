"use client";

import { useEffect, useId, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CREATE_SOW_RECORD_WIDGET_NAME } from "@/widgets/create-sow-record";
import type { WidgetOpenContext } from "@/widgets/types";

type CreateSowRecordWidgetProps = WidgetOpenContext & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Host for Create SOW Records — List HTML widget
 * (`/widgets/create-sow-record/index.html`).
 */
export function CreateSowRecordWidget({
  open,
  onClose,
  selectedRecordIds,
  module = "Accounts",
  className,
}: CreateSowRecordWidgetProps) {
  const titleId = useId();

  const ids = useMemo(
    () =>
      [...new Set((selectedRecordIds ?? []).map(String))]
        .map((id) => id.trim())
        .filter(Boolean),
    [selectedRecordIds],
  );

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const src =
    ids.length > 0 ?
      `/widgets/create-sow-record/index.html?recordIds=${encodeURIComponent(ids.join(","))}&module=${encodeURIComponent(module)}`
    : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-zinc-950/50 p-2 backdrop-blur-[1px] sm:p-4 dark:bg-black/60"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-panel shadow-xl",
          className,
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-crm-border bg-crm-panel-muted/80 px-4 py-3">
          <h2 id={titleId} className="page-heading truncate text-base sm:text-lg">
            {CREATE_SOW_RECORD_WIDGET_NAME}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="crm-toolbar-btn shrink-0"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="min-h-0 flex-1 bg-white">
          {ids.length === 0 ?
            <p className="p-6 text-sm text-crm-text-muted">
              Select at least one Site account.
            </p>
          : <iframe
              title={CREATE_SOW_RECORD_WIDGET_NAME}
              src={src}
              className="h-full w-full border-0 bg-white"
            />
          }
        </div>
      </div>
    </div>
  );
}
