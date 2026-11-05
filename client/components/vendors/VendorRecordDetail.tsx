"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  displayOrDash,
  VENDOR_DETAIL_TABS,
  type VendorDetailRecord,
  type VendorDetailTabId,
} from "@/lib/vendors/recordDetail";
import { getVendorZohoRecordUrl } from "@/lib/zoho/crmRecordUrls";
import {
  VendorAllFieldsTab,
  VendorComplianceTab,
  VendorFinancialTab,
  VendorOverviewTab,
} from "@/components/vendors/detail/VendorDetailTabPanels";

const OLIO_GREEN = "#1f6b3a";

type VendorRecordDetailProps = {
  recordId: string;
};

export default function VendorRecordDetail({ recordId }: VendorRecordDetailProps) {
  const [record, setRecord] = useState<VendorDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<VendorDetailTabId>("overview");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vendors/${encodeURIComponent(recordId)}`, {
          cache: "no-store",
          signal,
        });
        const data = (await res.json().catch(() => ({}))) as {
          record?: VendorDetailRecord;
          error?: string;
        };
        if (!res.ok || !data.record) {
          throw new Error(data.error || "Failed to load vendor record");
        }
        setRecord(data.record);
      } catch (err) {
        if (signal?.aborted) return;
        setRecord(null);
        setError(err instanceof Error ? err.message : "Failed to load vendor record");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [recordId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const zohoUrl = useMemo(() => getVendorZohoRecordUrl(recordId), [recordId]);
  const fields = record?.fields ?? {};
  const title = displayOrDash(fields.Vendor_Name);
  const phone = fields.Phone?.trim() || "";
  const email = fields.Email?.trim() || "";
  const cityState = [fields.City?.trim(), fields.State?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-crm-canvas">
      <header className="shrink-0 border-b border-crm-border bg-crm-panel px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Link
              href="/vendors"
              className="inline-flex size-8 items-center justify-center rounded-md border border-crm-border text-crm-text-muted transition-colors hover:bg-crm-canvas hover:text-crm-text"
              aria-label="Back to vendors list"
            >
              <ArrowLeft className="size-4" />
            </Link>
            {loading ?
              <h1 className="text-xl font-bold text-crm-text">Loading…</h1>
            : <h1
                className="rounded-md border-2 px-3 py-1 text-lg font-bold tracking-tight text-crm-text sm:text-xl"
                style={{ borderColor: OLIO_GREEN }}
              >
                {title}
              </h1>
            }
            {record?.offlineDemo ?
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                Offline demo
              </span>
            : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!loading && record ?
              <>
                <a
                  href={zohoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-white hover:brightness-110"
                  style={{ backgroundColor: OLIO_GREEN }}
                >
                  Invite To Vendor Portal
                </a>
                <a
                  href={zohoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-white hover:brightness-110"
                  style={{ backgroundColor: OLIO_GREEN }}
                >
                  Process Compliance
                </a>
              </>
            : null}
            <a
              href={zohoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-crm-border px-2.5 text-xs font-medium text-crm-text-muted hover:bg-crm-canvas hover:text-crm-text"
            >
              <ExternalLink className="size-3.5" />
              Open in Zoho
            </a>
            <ThemeToggle />
          </div>
        </div>

        {!loading && record ?
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-emerald-700 dark:text-emerald-400">
            {phone ?
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {phone}
              </span>
            : null}
            {email ?
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Mail className="size-3.5" />
                {email}
              </a>
            : null}
            {cityState ?
              <span className="text-crm-text-muted">{cityState}</span>
            : null}
          </div>
        : null}

        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {VENDOR_DETAIL_TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative shrink-0 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                  active ?
                    "text-emerald-800 dark:text-emerald-300"
                  : "text-crm-text-muted hover:text-crm-text",
                )}
              >
                {item.label}
                {active ?
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                    style={{ backgroundColor: OLIO_GREEN }}
                  />
                : null}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {loading ?
          <div className="flex h-48 items-center justify-center gap-2 text-crm-text-muted">
            <Loader2 className="size-5 animate-spin" />
            Loading vendor…
          </div>
        : error ?
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <p className="font-semibold">Could not open this vendor</p>
            <p className="mt-1 opacity-90">{error}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={() => void load()}>
                Retry
              </Button>
              <Link
                href="/vendors"
                className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                Back to list
              </Link>
            </div>
          </div>
        : record && tab === "overview" ?
          <VendorOverviewTab record={record} recordId={record.id} />
        : record && tab === "compliance" ?
          <VendorComplianceTab record={record} zohoUrl={zohoUrl} />
        : record && tab === "financial" ?
          <VendorFinancialTab record={record} />
        : record && tab === "all-fields" ?
          <VendorAllFieldsTab record={record} />
        : null}
      </div>
    </div>
  );
}
