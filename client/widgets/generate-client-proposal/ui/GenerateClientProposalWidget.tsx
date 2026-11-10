"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GENERATE_CLIENT_PROPOSAL_WIDGET_NAME } from "@/widgets/generate-client-proposal";
import type { WidgetOpenContext } from "@/widgets/types";

type GenerateClientProposalWidgetProps = WidgetOpenContext & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Fullscreen host for the Generate Client Proposal HTML widget
 * (`/widgets/generate-client-proposal/widget.html`) — port of Zoho
 * `olio-generate-client-proposal-v16`.
 */
export function GenerateClientProposalWidget({
  open,
  onClose,
  selectedRecordIds,
  className,
}: GenerateClientProposalWidgetProps) {
  const titleId = useId();
  const recordId = selectedRecordIds[0]?.trim() ?? "";

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
    recordId ?
      `/widgets/generate-client-proposal/widget.html?recordId=${encodeURIComponent(recordId)}`
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
            {GENERATE_CLIENT_PROPOSAL_WIDGET_NAME}
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
          {!recordId ?
            <p className="p-6 text-sm text-crm-text-muted">
              Record ID not found.
            </p>
          : <iframe
              title={GENERATE_CLIENT_PROPOSAL_WIDGET_NAME}
              src={src}
              className="h-full w-full border-0 bg-white"
            />
          }
        </div>
      </div>
    </div>
  );
}
