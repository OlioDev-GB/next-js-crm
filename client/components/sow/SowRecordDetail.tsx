"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Send,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  displayOrDash,
  formatDateRange,
  formatSowDetailCurrency,
  formatSowDetailDate,
  SOW_DETAIL_TABS,
  type SowDetailRecord,
  type SowDetailTabId,
} from "@/lib/sow/recordDetail";
import { getSowZohoRecordUrl } from "@/lib/zoho/crmRecordUrls";
import {
  AllFieldsTab,
  BidsContractsTab,
  EmailsTab,
  NotesTab,
  ProposalTab,
  TimelineTab,
} from "@/components/sow/detail/SowDetailTabPanels";

const OLIO_GREEN = "#1f6b3a";
const OLIO_GREEN_DARK = "#16522c";
const ACCENT_GOLD = "#c9922a";

type SowRecordDetailProps = {
  recordId: string;
};

function FieldRow({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  const empty = !value || value === "-";
  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-2 gap-y-0.5 py-1 text-[13px] leading-snug">
      <dt className="text-crm-text-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words font-medium",
          link && !empty ? "text-[#1d6bb8] hover:underline" : "text-crm-text",
          empty && "font-normal text-crm-text-muted",
        )}
      >
        {link && !empty && /^https?:\/\//i.test(value) ?
          <a href={value} target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        : value}
      </dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className,
  accent = "green",
  bodyClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: "green" | "gold" | "none";
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-crm-border bg-crm-panel shadow-sm",
        accent === "green" && "border-t-[3px]",
        accent === "gold" && "border-l-[3px]",
        className,
      )}
      style={
        accent === "green" ?
          { borderTopColor: OLIO_GREEN }
        : accent === "gold" ?
          { borderLeftColor: ACCENT_GOLD }
        : undefined
      }
    >
      {title ?
        <header className="border-b border-crm-border/70 px-3.5 py-2.5">
          <h2
            className="text-sm font-semibold tracking-tight"
            style={{ color: OLIO_GREEN }}
          >
            {title}
          </h2>
        </header>
      : null}
      <div className={cn("px-3.5 py-2.5", bodyClassName)}>{children}</div>
    </section>
  );
}

function KpiCard({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className="rounded-lg border border-crm-border border-l-[3px] bg-crm-panel px-3 py-2.5 shadow-sm"
      style={{ borderLeftColor: OLIO_GREEN }}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-crm-text-muted">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate text-sm font-semibold text-crm-text",
          emphasize && value !== "-" && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const label = stage.trim() || "—";
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 ring-1 ring-orange-500/30 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-400/40">
      {label}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  href,
  icon,
  danger,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  const className = cn(
    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-white shadow-sm transition-colors",
    danger ?
      "bg-red-700 hover:bg-red-800"
    : "hover:brightness-110",
  );
  const style = danger ? undefined : { backgroundColor: OLIO_GREEN };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {icon}
      {children}
    </button>
  );
}

function NotesBlock({
  title,
  value,
  tall,
}: {
  title: string;
  value: string;
  tall?: boolean;
}) {
  return (
    <SectionCard title={title} accent="gold" className="min-h-0">
      <div
        className={cn(
          "whitespace-pre-wrap text-sm text-crm-text",
          tall ? "min-h-[88px]" : "min-h-[56px]",
          (!value || value === "-") && "text-crm-text-muted",
        )}
      >
        {displayOrDash(value)}
      </div>
    </SectionCard>
  );
}

export default function SowRecordDetail({ recordId }: SowRecordDetailProps) {
  const [record, setRecord] = useState<SowDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SowDetailTabId>("overview");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sow/${encodeURIComponent(recordId)}`, {
        cache: "no-store",
        signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        record?: SowDetailRecord;
        error?: string;
      };
      if (!res.ok || !data.record) {
        throw new Error(data.error || "Failed to load SOW record");
      }
      setRecord(data.record);
    } catch (err) {
      if (signal?.aborted) return;
      setRecord(null);
      setError(err instanceof Error ? err.message : "Failed to load SOW record");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const zohoUrl = useMemo(() => getSowZohoRecordUrl(recordId), [recordId]);
  const fields = record?.fields ?? {};
  const title = displayOrDash(fields.SOWID || fields.Deal_Name);
  const stage = displayOrDash(fields.Stage);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ActionButton href={zohoUrl}>{stage === "-" ? "Stage" : `${stage} Stage`}</ActionButton>
      <ActionButton href={zohoUrl} icon={<FileText className="size-3.5" />}>
        create contract PDF
      </ActionButton>
      <ActionButton href={zohoUrl} icon={<Send className="size-3.5" />}>
        Send SOW
      </ActionButton>
      <ActionButton href={zohoUrl} icon={<MapPin className="size-3.5" />}>
        Map Tool
      </ActionButton>
      <ActionButton href={zohoUrl} icon={<Pencil className="size-3.5" />}>
        Edit
      </ActionButton>
      <ActionButton href={zohoUrl} icon={<Trash2 className="size-3.5" />} danger>
        <span className="sr-only">Delete</span>
      </ActionButton>
    </div>
  );

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-crm-canvas">
      <header className="shrink-0 border-b border-crm-border bg-crm-panel px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Link
              href="/sow"
              className="inline-flex size-8 items-center justify-center rounded-md border border-crm-border text-crm-text-muted transition-colors hover:bg-crm-canvas hover:text-crm-text"
              aria-label="Back to SOW list"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="truncate text-xl font-bold tracking-tight text-crm-text sm:text-2xl">
              {loading ? "Loading…" : title}
            </h1>
            {!loading && record ? <StageBadge stage={stage} /> : null}
            {record?.offlineDemo ?
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                Offline demo
              </span>
            : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!loading && record ? headerActions : null}
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

        <nav className="mt-3 flex gap-1 overflow-x-auto border-b border-transparent">
          {SOW_DETAIL_TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative shrink-0 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                  active ? "text-emerald-800 dark:text-emerald-300" : "text-crm-text-muted hover:text-crm-text",
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
            Loading SOW…
          </div>
        : error ?
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <p className="font-semibold">Could not open this SOW</p>
            <p className="mt-1 opacity-90">{error}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={() => void load()}>
                Retry
              </Button>
              <Link
                href="/sow"
                className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                Back to list
              </Link>
            </div>
          </div>
        : record && tab === "overview" ?
          <OverviewTab record={record} zohoUrl={zohoUrl} />
        : record && tab === "proposal" ?
          <ProposalTab record={record} />
        : record && tab === "bids" ?
          <BidsContractsTab recordId={record.id} zohoUrl={zohoUrl} />
        : record && tab === "notes" ?
          <NotesTab recordId={record.id} />
        : record && tab === "emails" ?
          <EmailsTab recordId={record.id} />
        : record && tab === "timeline" ?
          <TimelineTab recordId={record.id} />
        : record && tab === "all-fields" ?
          <AllFieldsTab record={record} />
        : null}
      </div>
    </div>
  );
}

function OverviewTab({
  record,
  zohoUrl,
}: {
  record: SowDetailRecord;
  zohoUrl: string;
}) {
  const f = record.fields;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Client bid due" value={formatSowDetailDate(f.Client_Bid_Due_Date)} />
        <KpiCard label="Vendor bid due" value={formatSowDetailDate(f.Vendor_Bid_Due_Date)} />
        <KpiCard
          label="Service term"
          value={formatDateRange(f.Start_Date, f.End_Date)}
        />
        <KpiCard
          label="Agreement"
          value={formatDateRange(f.Agreement_Start_Date, f.Agreement_End_Date)}
        />
        <KpiCard label="Selected vendor" value={displayOrDash(f.Vendor)} emphasize />
        <KpiCard
          label="Client total"
          value={
            f.Proposal_Client_Total?.trim() ?
              formatSowDetailCurrency(f.Proposal_Client_Total)
            : "-"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Site">
          <dl>
            <FieldRow label="Site" value={displayOrDash(f.Company_Name)} link />
            <FieldRow label="Site Street" value={displayOrDash(f.Site_Street)} />
            <FieldRow label="Site City" value={displayOrDash(f.Site_City)} />
            <FieldRow label="Site State" value={displayOrDash(f.Site_State)} />
            <FieldRow label="Site Zip" value={displayOrDash(f.Site_Zip)} />
            <FieldRow
              label="Region/District/Zone"
              value={displayOrDash(f.Region_District_Zone)}
            />
            <FieldRow
              label="Site Acreage (Site)"
              value={displayOrDash(f.Site_Acreage)}
            />
            <FieldRow label="Site Open Time" value={displayOrDash(f.Site_Open_Up_Time)} />
            <FieldRow label="Site Map" value={displayOrDash(f.Site_Map)} />
            <FieldRow label="Site Map URL" value={displayOrDash(f.SiteMap_URL)} link />
          </dl>
        </SectionCard>

        <SectionCard title="Dates">
          <dl>
            <FieldRow
              label="Client Bid Due Date"
              value={formatSowDetailDate(f.Client_Bid_Due_Date)}
            />
            <FieldRow
              label="Vendor Bid Due Date"
              value={formatSowDetailDate(f.Vendor_Bid_Due_Date)}
            />
            <FieldRow label="Start Date" value={formatSowDetailDate(f.Start_Date)} />
            <FieldRow label="End Date" value={formatSowDetailDate(f.End_Date)} />
            <FieldRow
              label="Agreement Start Date"
              value={formatSowDetailDate(f.Agreement_Start_Date)}
            />
            <FieldRow
              label="Agreement End Date"
              value={formatSowDetailDate(f.Agreement_End_Date)}
            />
            <FieldRow label="Schedule Service" value={displayOrDash(f.Schedule_Service)} />
            <FieldRow
              label="1st Service Due Date"
              value={formatSowDetailDate(f.st_Service_Scheduling_Deadline)}
            />
          </dl>
        </SectionCard>

        <SectionCard title="Vendor, PO and Files">
          <dl>
            <FieldRow label="Vendor" value={displayOrDash(f.Vendor)} link />
            <FieldRow
              label="Vendor Signed Status"
              value={displayOrDash(f.Vendor_Signed_Status)}
            />
            <FieldRow label="Client PO Number" value={displayOrDash(f.Client_PO_Number)} />
            <FieldRow label="Client PO URL" value={displayOrDash(f.Client_PO_URL)} link />
            <FieldRow
              label="Vendor Specific Attachments"
              value={displayOrDash(f.Vendor_Specific_Attachments)}
            />
            <FieldRow
              label="Vendor Specific Attachments URL"
              value={displayOrDash(f.Vendor_Specific_Attachments_URL)}
              link
            />
            <FieldRow
              label="Client Approved NTE"
              value={
                f.Client_Approved_NTE?.trim() ?
                  formatSowDetailCurrency(f.Client_Approved_NTE)
                : "-"
              }
            />
          </dl>
        </SectionCard>

        <SectionCard title="Olio Team">
          <dl>
            <FieldRow label="Sales Manager" value={displayOrDash(f.Sales_Owner)} />
            <FieldRow
              label="Sales Associate"
              value={displayOrDash(f.Sales_Associate_New)}
            />
            <FieldRow label="Ops Manager" value={displayOrDash(f.Ops_Owner)} />
            <FieldRow
              label="Operations Associate"
              value={displayOrDash(f.Operations_Associate_New)}
            />
            <FieldRow
              label="Site Visit Assignment"
              value={displayOrDash(f.Site_Visit_Assignment)}
            />
            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-2 py-1 text-[13px]">
              <dt className="text-crm-text-muted">Tag</dt>
              <dd>
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Tag className="size-3.5" />
                  {f.Tag?.trim() ? f.Tag : "Add Tags"}
                </span>
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <NotesBlock title="Sourcing Notes" value={f.Sourcing_Notes} tall />
        <NotesBlock
          title="Internal Notes for Olio Team"
          value={f.Internal_Notes_for_Olio_Team}
          tall
        />
      </div>

      <SectionCard accent="gold">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-crm-text-muted">Progress Notes</div>
            <div className="min-h-[48px] whitespace-pre-wrap text-sm text-crm-text">
              {displayOrDash(f.Progress_Notes)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-crm-text-muted">
              Past Progress Notes
            </div>
            <div className="min-h-[48px] whitespace-pre-wrap text-sm text-crm-text">
              {displayOrDash(f.Past_Progress_Notes)}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Scope of Work" className="overflow-hidden" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
                <th className="px-3 py-2.5">OurServices</th>
                <th className="px-3 py-2.5">Vendor Price($)</th>
                <th className="px-3 py-2.5">Client Price($)</th>
                <th className="px-3 py-2.5">Start Date</th>
                <th className="px-3 py-2.5">End Date</th>
                <th className="px-3 py-2.5">Target Client Price($)</th>
                <th className="px-3 py-2.5">Vendor Target Price</th>
              </tr>
            </thead>
            <tbody>
              {record.scopeOfWork.length === 0 ?
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-crm-text-muted">
                    No scope rows
                  </td>
                </tr>
              : record.scopeOfWork.map((row) => (
                  <tr key={row.id} className="border-b border-crm-border/80">
                    <td className="px-3 py-2.5 font-medium text-[#1d6bb8]">
                      {row.ourServices}
                    </td>
                    <td className="px-3 py-2.5">{row.vendorPrice}</td>
                    <td className="px-3 py-2.5">{row.clientPrice}</td>
                    <td className="px-3 py-2.5">{row.startDate}</td>
                    <td className="px-3 py-2.5">{row.endDate}</td>
                    <td className="px-3 py-2.5">{row.targetClientPrice}</td>
                    <td className="px-3 py-2.5">{row.vendorTargetPrice}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="border-t border-crm-border px-3 py-2">
            <a
              href={zohoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1d6bb8] hover:underline"
            >
              <Plus className="size-3.5" />
              Add row
            </a>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SectionCard title="Client Addendum">
          <div className="min-h-[64px] whitespace-pre-wrap text-sm text-crm-text">
            {displayOrDash(f.Client_Addendum_Rich)}
          </div>
        </SectionCard>
        <SectionCard title="Vendor Addendum">
          <div className="min-h-[64px] whitespace-pre-wrap text-sm text-crm-text">
            {displayOrDash(f.Vendor_Addendum_Rich)}
          </div>
        </SectionCard>
      </div>

      <div>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          style={{ backgroundColor: OLIO_GREEN_DARK }}
          onClick={() => window.open(zohoUrl, "_blank", "noopener,noreferrer")}
        >
          Create Task
        </button>
      </div>
    </div>
  );
}
