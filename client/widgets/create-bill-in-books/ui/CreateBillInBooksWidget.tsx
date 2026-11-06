"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CREATE_BILL_IN_BOOKS_WIDGET_NAME } from "@/widgets/create-bill-in-books";
import type { CreateBillInBooksResult } from "@/widgets/create-bill-in-books/types";
import type { WidgetOpenContext } from "@/widgets/types";

type CreateBillInBooksWidgetProps = WidgetOpenContext & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Port of Create Bills in Books — runs Zoho function on selected invoices.
 */
export function CreateBillInBooksWidget({
  open,
  onClose,
  selectedRecordIds,
  className,
}: CreateBillInBooksWidgetProps) {
  const titleId = useId();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CreateBillInBooksResult | null>(null);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setResult(null);
      return;
    }

    const ids = [...new Set((selectedRecordIds ?? []).map(String))]
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      setResult({
        ok: false,
        message: "Select at least one vendor invoice.",
      });
      return;
    }

    let cancelled = false;
    setRunning(true);
    setResult(null);

    void (async () => {
      try {
        const res = await fetch("/api/widgets/create-bill-in-books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordIds: ids }),
        });
        const data = (await res.json().catch(() => ({}))) as CreateBillInBooksResult;
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) {
          setResult({
            ok: false,
            message:
              err instanceof Error
                ? err.message
                : "There was an error processing your request. Please try again later.",
          });
        }
      } finally {
        if (!cancelled) setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedRecordIds]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !running) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, running]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[1px] dark:bg-black/60"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !running) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full max-w-md rounded-2xl border border-crm-border bg-crm-panel p-5 shadow-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="page-heading text-base sm:text-lg">
            {CREATE_BILL_IN_BOOKS_WIDGET_NAME}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="crm-toolbar-btn shrink-0"
            aria-label="Close"
            disabled={running}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="mt-4 min-h-[5rem] text-sm text-crm-text">
          {running ?
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="size-8 animate-spin text-blue-600" aria-hidden />
              <p className="font-medium text-blue-600">Processing…</p>
            </div>
          : result ?
            <div className="space-y-2">
              <p
                className={cn(
                  "font-semibold",
                  result.ok ? "text-green-600" : "text-red-600",
                )}
              >
                {result.ok ? "Success!" : "Error!"}
              </p>
              {result.ok ?
                <ul className="space-y-1 text-crm-text">
                  <li>
                    Total: <b>{result.total ?? "—"}</b>
                  </li>
                  <li>
                    Processed:{" "}
                    <b className="text-green-600">{result.total ?? "—"}</b>
                  </li>
                  <li>
                    Skipped:{" "}
                    <b className="text-blue-600">{result.skipped ?? "—"}</b>
                  </li>
                  <li>
                    Success:{" "}
                    <b className="text-blue-600">{result.success ?? "—"}</b>
                  </li>
                  <li>
                    Failed:{" "}
                    <b className="text-red-600">{result.failed ?? "—"}</b>
                  </li>
                  {result.log ?
                    <li>
                      Log: <b className="text-red-600">{result.log}</b>
                    </li>
                  : null}
                </ul>
              : <p>{result.message}</p>}
            </div>
          : null}
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="crm-toolbar-btn"
            disabled={running}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
