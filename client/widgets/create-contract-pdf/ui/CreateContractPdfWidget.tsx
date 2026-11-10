"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CREATE_CONTRACT_PDF_WIDGET_NAME } from "@/widgets/create-contract-pdf";
import type { WidgetOpenContext } from "@/widgets/types";

type CreateContractPdfWidgetProps = WidgetOpenContext & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Fullscreen host for the Create Contract PDF HTML widget
 * (`/widgets/create-contract-pdf/widget.html`) — port of Zoho
 * `SOW_Create_Contract_PDF` (Deals/SOW).
 */
export function CreateContractPdfWidget({
  open,
  onClose,
  selectedRecordIds,
  module = "Deals",
  className,
}: CreateContractPdfWidgetProps) {
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
      `/widgets/create-contract-pdf/widget.html?recordId=${encodeURIComponent(recordId)}&module=${encodeURIComponent(module || "Deals")}`
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
            {CREATE_CONTRACT_PDF_WIDGET_NAME}
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
              title={CREATE_CONTRACT_PDF_WIDGET_NAME}
              src={src}
              className="h-full w-full border-0 bg-white"
            />
          }
        </div>
      </div>
    </div>
  );
}
