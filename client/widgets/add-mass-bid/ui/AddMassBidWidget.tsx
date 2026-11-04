"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADD_MASS_BID_MAX_FILE_BYTES,
  ADD_MASS_BID_SEARCH_MIN_CHARS,
  ADD_MASS_BID_WIDGET_NAME,
} from "@/widgets/add-mass-bid";
import type {
  AddMassBidContextResult,
  AddMassBidResult,
  MassBidLineItem,
  SelectedBidConflict,
  SelectedBidsResult,
  VendorSearchResult,
  VendorSuggestion,
} from "@/widgets/add-mass-bid/types";
import type { WidgetOpenContext } from "@/widgets/types";

type AddMassBidWidgetProps = WidgetOpenContext & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Add Mass Bid — create one Bid per selected SOW with shared vendor pricing.
 */
export function AddMassBidWidget({
  open,
  onClose,
  selectedRecordIds,
  className,
}: AddMassBidWidgetProps) {
  const titleId = useId();
  const vendorInputId = useId();
  const bidNotesId = useId();
  const bidFileId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddMassBidResult | null>(null);

  const [lineItemsMatch, setLineItemsMatch] = useState(true);
  const [lineItems, setLineItems] = useState<MassBidLineItem[]>([]);
  const [vendorPrices, setVendorPrices] = useState<string[]>([]);

  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorOptions, setVendorOptions] = useState<VendorSuggestion[]>([]);
  const [showVendorOptions, setShowVendorOptions] = useState(false);
  const [searchingVendors, setSearchingVendors] = useState(false);

  const [selectedBid, setSelectedBid] = useState(false);
  const [bidNotes, setBidNotes] = useState("");
  const [bidFile, setBidFile] = useState<File | null>(null);

  const [confirmBids, setConfirmBids] = useState<SelectedBidConflict[] | null>(
    null,
  );

  const [openSnapshot, setOpenSnapshot] = useState(false);
  if (open !== openSnapshot) {
    setOpenSnapshot(open);
    if (open) {
      setLoading(false);
      setSubmitting(false);
      setError(null);
      setResult(null);
      setLineItemsMatch(true);
      setLineItems([]);
      setVendorPrices([]);
      setVendorQuery("");
      setVendorId("");
      setVendorName("");
      setVendorOptions([]);
      setShowVendorOptions(false);
      setSearchingVendors(false);
      setSelectedBid(false);
      setBidNotes("");
      setBidFile(null);
      setConfirmBids(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        if (confirmBids) {
          setConfirmBids(null);
          return;
        }
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, submitting, confirmBids]);

  useEffect(() => {
    if (!open || selectedRecordIds.length === 0) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const ids = selectedRecordIds.map(String).join(",");
    fetch(
      `/api/widgets/add-mass-bid?action=context&ids=${encodeURIComponent(ids)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const data = (await response.json().catch(
          () => ({}),
        )) as AddMassBidContextResult;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Failed to load SOW context.");
        }
        setLineItemsMatch(data.lineItemsMatch !== false);
        if (data.lineItemsMatch === false) {
          setError(
            data.message || "line items don't match, can't submit mass bid",
          );
          setLineItems([]);
          setVendorPrices([]);
          return;
        }
        const items = data.referenceLineItems ?? [];
        setLineItems(items);
        setVendorPrices(items.map((item) => String(item.vendorPrice ?? 0)));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load SOW context.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, selectedRecordIds]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!open) return null;

  function onVendorInput(value: string) {
    setVendorQuery(value);
    setVendorId("");
    setVendorName("");
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < ADD_MASS_BID_SEARCH_MIN_CHARS) {
      setVendorOptions([]);
      setShowVendorOptions(false);
      setSearchingVendors(false);
      return;
    }

    setSearchingVendors(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/widgets/add-mass-bid?action=vendors&q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(
          () => ({}),
        )) as VendorSearchResult;
        if (!response.ok || !data.ok) {
          setVendorOptions([]);
          setShowVendorOptions(true);
          return;
        }
        setVendorOptions(data.vendors ?? []);
        setShowVendorOptions(true);
      } catch {
        setVendorOptions([]);
        setShowVendorOptions(false);
      } finally {
        setSearchingVendors(false);
      }
    }, 300);
  }

  function selectVendor(vendor: VendorSuggestion) {
    setVendorQuery(vendor.name);
    setVendorId(vendor.id);
    setVendorName(vendor.name);
    setVendorOptions([]);
    setShowVendorOptions(false);
    setError(null);
  }

  function parsedVendorPrices() {
    return vendorPrices.map((value) => {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    });
  }

  async function createBids(confirmUncheck: boolean) {
    setError(null);
    setResult(null);

    if (!vendorId) {
      setError("Vendor is required.");
      return;
    }
    if (!lineItemsMatch) {
      setError("line items don't match, can't submit mass bid");
      return;
    }
    if (bidFile && bidFile.size > ADD_MASS_BID_MAX_FILE_BYTES) {
      setError("Bid file must be under 5MB.");
      return;
    }

    setSubmitting(true);
    try {
      let response: Response;

      if (bidFile) {
        const formData = new FormData();
        formData.set(
          "selectedRecordIds",
          JSON.stringify(selectedRecordIds),
        );
        formData.set("vendorId", vendorId);
        formData.set("selectedBid", String(selectedBid));
        formData.set("bidNotes", bidNotes);
        formData.set("vendorPrices", JSON.stringify(parsedVendorPrices()));
        formData.set("confirmUncheck", String(confirmUncheck));
        formData.set("bidFile", bidFile);
        response = await fetch("/api/widgets/add-mass-bid", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/widgets/add-mass-bid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedRecordIds,
            vendorId,
            selectedBid,
            bidNotes,
            vendorPrices: parsedVendorPrices(),
            confirmUncheck,
          }),
        });
      }

      const data = (await response.json().catch(() => ({}))) as AddMassBidResult;

      if (data.requiresConfirm && (data.selectedBids?.length ?? 0) > 0) {
        setConfirmBids(data.selectedBids ?? []);
        return;
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Mass Bid creation failed.");
      }

      setConfirmBids(null);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mass Bid creation failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreate() {
    if (selectedBid) {
      setSubmitting(true);
      setError(null);
      try {
        const ids = selectedRecordIds.map(String).join(",");
        const response = await fetch(
          `/api/widgets/add-mass-bid?action=selected-bids&ids=${encodeURIComponent(ids)}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(
          () => ({}),
        )) as SelectedBidsResult;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Failed to check selected bids.");
        }
        if ((data.bids?.length ?? 0) > 0) {
          setConfirmBids(data.bids ?? []);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check selected bids.",
        );
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    await createBids(false);
  }

  const showSuccess = Boolean(result?.ok);
  const showForm = lineItemsMatch && !showSuccess;

  const controlClassName = cn(
    "mt-1 block h-10 w-full rounded-md border border-crm-border bg-crm-panel px-2.5 text-sm text-crm-text shadow-sm",
    "placeholder:text-crm-text-muted",
    "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );

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
        aria-busy={submitting || loading}
        className={cn(
          "relative flex max-h-[min(92vh,48rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-panel shadow-xl",
          className,
        )}
      >
        {submitting || loading ?
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-crm-panel/85 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
            <p className="text-sm font-medium text-crm-text">
              {loading ? "Loading SOWs…" : "Creating bids…"}
            </p>
          </div>
        : null}

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-crm-border bg-crm-panel-muted/80 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="page-heading truncate text-base sm:text-lg">
              {ADD_MASS_BID_WIDGET_NAME}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {showSuccess && result ?
            <>
              <p className="whitespace-pre-wrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                {result.message || "Bids created."}
              </p>
              {result.errors && result.errors.length > 0 ?
                <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-auto rounded-xl border border-crm-border bg-crm-panel-muted/60 px-5 py-2 text-sm text-crm-text-muted">
                  {result.errors.map((item) => (
                    <li key={`${item.sowId}-${item.message}`}>
                      {item.sowId}: {item.message}
                    </li>
                  ))}
                </ul>
              : null}
              <Button
                type="button"
                className="mt-5 h-10 w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={onClose}
              >
                OK
              </Button>
            </>
          : <>
              {error ?
                <p className="mb-4 whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              : null}

              {showForm ?
                <div className="space-y-5">
                  <div className="relative">
                    <label
                      htmlFor={vendorInputId}
                      className="block text-sm font-medium text-crm-text"
                    >
                      Vendor
                    </label>
                    <input
                      id={vendorInputId}
                      value={vendorQuery}
                      onChange={(event) => onVendorInput(event.target.value)}
                      onFocus={() => {
                        if (vendorOptions.length > 0) setShowVendorOptions(true);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setShowVendorOptions(false), 150);
                      }}
                      placeholder="Search vendor (min 3 characters)"
                      className={controlClassName}
                      autoComplete="off"
                      disabled={submitting}
                    />
                    {searchingVendors ?
                      <Loader2 className="absolute right-3 top-10 size-4 animate-spin text-blue-500" />
                    : null}
                    {showVendorOptions ?
                      <ul className="absolute z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-crm-border bg-crm-panel shadow-lg">
                        {vendorOptions.length === 0 ?
                          <li className="px-3 py-2 text-sm text-crm-text-muted">
                            No vendors found
                          </li>
                        : vendorOptions.map((option) => (
                            <li key={option.id}>
                              <button
                                type="button"
                                className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-crm-text hover:bg-crm-panel-muted"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectVendor(option)}
                              >
                                {option.name}
                                {option.status ?
                                  <span className="ml-2 text-xs text-crm-text-muted">
                                    ({option.status})
                                  </span>
                                : null}
                              </button>
                            </li>
                          ))
                        }
                      </ul>
                    : null}
                    {vendorId ?
                      <p className="mt-1 text-xs text-crm-text-muted">
                        Selected: {vendorName || vendorId}
                      </p>
                    : null}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-crm-text">
                      Selected Bid
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "min-w-[4.5rem] rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors",
                        selectedBid ? "bg-green-600" : "bg-zinc-400",
                      )}
                      onClick={() => setSelectedBid((value) => !value)}
                      disabled={submitting}
                      aria-pressed={selectedBid}
                    >
                      {selectedBid ? "Yes" : "No"}
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor={bidNotesId}
                      className="block text-sm font-medium text-crm-text"
                    >
                      Bid Notes
                    </label>
                    <textarea
                      id={bidNotesId}
                      value={bidNotes}
                      onChange={(event) => setBidNotes(event.target.value)}
                      rows={3}
                      className={cn(controlClassName, "h-auto py-2")}
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={bidFileId}
                      className="block text-sm font-medium text-crm-text"
                    >
                      Bid File (optional, max 5MB)
                    </label>
                    <input
                      id={bidFileId}
                      type="file"
                      className="mt-1 block w-full text-sm text-crm-text file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setBidFile(file);
                        setError(null);
                      }}
                      disabled={submitting}
                    />
                    {bidFile ?
                      <p className="mt-1 text-xs text-crm-text-muted">
                        {bidFile.name} ({Math.ceil(bidFile.size / 1024)} KB)
                      </p>
                    : null}
                  </div>

                  {lineItems.length > 0 ?
                    <div className="overflow-x-auto rounded-lg border border-crm-border">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-crm-panel-muted text-left">
                          <tr>
                            <th className="border-b border-crm-border p-2 font-semibold text-crm-text">
                              Service
                            </th>
                            <th className="border-b border-crm-border p-2 font-semibold text-crm-text">
                              Start
                            </th>
                            <th className="border-b border-crm-border p-2 font-semibold text-crm-text">
                              End
                            </th>
                            <th className="border-b border-crm-border p-2 font-semibold text-crm-text">
                              Client Price
                            </th>
                            <th className="border-b border-crm-border p-2 font-semibold text-crm-text">
                              Vendor Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item, index) => (
                            <tr key={`${item.serviceId}-${index}`}>
                              <td className="border-b border-crm-border p-2 text-crm-text">
                                {item.serviceName || item.serviceId}
                              </td>
                              <td className="border-b border-crm-border p-2 text-crm-text">
                                {item.startDate}
                              </td>
                              <td className="border-b border-crm-border p-2 text-crm-text">
                                {item.endDate}
                              </td>
                              <td className="border-b border-crm-border p-2 text-crm-text">
                                {item.clientPrice}
                              </td>
                              <td className="border-b border-crm-border p-2">
                                <input
                                  type="number"
                                  value={vendorPrices[index] ?? ""}
                                  onChange={(event) => {
                                    const next = [...vendorPrices];
                                    next[index] = event.target.value;
                                    setVendorPrices(next);
                                  }}
                                  className="h-9 w-full rounded-md border border-crm-border bg-crm-panel px-2 text-sm text-crm-text focus:border-blue-500 focus:outline-none"
                                  disabled={submitting}
                                  placeholder="Enter vendor price"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  : null}

                  <Button
                    type="button"
                    className="h-10 w-full bg-blue-600 text-white hover:bg-blue-500"
                    onClick={() => {
                      void handleCreate();
                    }}
                    disabled={
                      submitting ||
                      loading ||
                      selectedRecordIds.length === 0 ||
                      !vendorId
                    }
                  >
                    Create Bid
                  </Button>
                </div>
              : null}
            </>
          }
        </div>

        {confirmBids ?
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/50 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={`${titleId}-confirm`}
              className="w-full max-w-lg overflow-hidden rounded-xl border border-crm-border bg-crm-panel shadow-xl"
            >
              <div className="border-b border-crm-border px-4 py-3">
                <h3
                  id={`${titleId}-confirm`}
                  className="text-sm font-semibold text-crm-text"
                >
                  Uncheck existing Selected Bids?
                </h3>
                <p className="mt-1 text-xs text-crm-text-muted">
                  These bids will be set to Selected Bid = No before creating
                  the new mass bid.
                </p>
              </div>
              <div className="max-h-56 overflow-y-auto px-4 py-3">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-crm-text-muted">
                      <th className="pb-2 pr-2 font-medium">Bid</th>
                      <th className="pb-2 pr-2 font-medium">Vendor</th>
                      <th className="pb-2 font-medium">Vendor Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmBids.map((bid) => (
                      <tr key={bid.id} className="border-t border-crm-border">
                        <td className="py-2 pr-2 text-crm-text">{bid.name}</td>
                        <td className="py-2 pr-2 text-crm-text">
                          {bid.vendorName}
                        </td>
                        <td className="py-2 text-crm-text">
                          {bid.vendorPrice != null ?
                            bid.vendorPrice.toFixed(2)
                          : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 border-t border-crm-border px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 flex-1"
                  disabled={submitting}
                  onClick={() => setConfirmBids(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-9 flex-1 bg-blue-600 text-white hover:bg-blue-500"
                  disabled={submitting}
                  onClick={() => {
                    void createBids(true);
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        : null}
      </div>
    </div>
  );
}
