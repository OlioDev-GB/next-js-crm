"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  Loader2,
  Paperclip,
  Pencil,
  RefreshCw,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  displayOrDash,
  formatSowDetailCurrency,
  type SowDetailRecord,
} from "@/lib/sow/recordDetail";
import {
  formatSowDateTime,
  type SowBidRow,
  type SowContractRow,
  type SowEmailRow,
  type SowNoteRow,
  type SowTimelineEntry,
} from "@/lib/sow/related";
import {
  getBidZohoRecordUrl,
  getContractZohoRecordUrl,
  getVendorZohoRecordUrl,
} from "@/lib/zoho/crmRecordUrls";

const OLIO_GREEN = "#1f6b3a";
const ACCENT_GOLD = "#c9922a";

function SectionCard({
  title,
  children,
  className,
  accent = "green",
  headerRight,
  bodyClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  accent?: "green" | "gold" | "none";
  headerRight?: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-crm-border bg-crm-panel shadow-sm",
        accent === "green" && "border-t-[3px]",
        accent === "gold" && "border-t-[3px]",
        className,
      )}
      style={
        accent === "green" ? { borderTopColor: OLIO_GREEN }
        : accent === "gold" ? { borderTopColor: ACCENT_GOLD }
        : undefined
      }
    >
      {(title || headerRight) && (
        <header className="flex items-center justify-between gap-3 border-b border-crm-border/70 px-3.5 py-2.5">
          {title ?
            <h2 className="text-sm font-semibold tracking-tight text-crm-text">
              {title}
            </h2>
          : <span />}
          {headerRight}
        </header>
      )}
      <div className={cn("px-3.5 py-3", bodyClassName)}>{children}</div>
    </section>
  );
}

function GhostButton({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "inline-flex h-7 items-center rounded-md border border-sky-300 bg-white px-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-500/40 dark:bg-transparent dark:text-sky-300 dark:hover:bg-sky-500/10";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function EmptyState({ label = "No records found" }: { label?: string }) {
  return (
    <div className="py-10 text-center text-sm text-crm-text-muted">{label}</div>
  );
}

function PanelLoader() {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-crm-text-muted">
      <Loader2 className="size-5 animate-spin" />
      Loading…
    </div>
  );
}

function useRelatedTab<T>(
  recordId: string,
  kind: string,
  pick: (data: Record<string, unknown>) => T,
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(
      `/api/sow/${encodeURIComponent(recordId)}/related?kind=${encodeURIComponent(kind)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) throw new Error(String(json.error || `Failed to load ${kind}`));
        setData(pick(json));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : `Failed to load ${kind}`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [recordId, kind, enabled, reloadKey, pick]);

  return { data, loading, error, reload };
}

/* ─── Proposal ─── */

export function ProposalTab({ record }: { record: SowDetailRecord }) {
  const f = record.fields;
  const metrics = [
    {
      label: "Proposal Margin %",
      value:
        f.Proposal_Margin?.trim() ?
          `${f.Proposal_Margin}${/%/.test(f.Proposal_Margin) ? "" : "%"}`
        : "-",
    },
    {
      label: "Proposal Client Total",
      value:
        f.Proposal_Client_Total?.trim() ?
          formatSowDetailCurrency(f.Proposal_Client_Total)
        : "-",
    },
    {
      label: "Proposal Margin Approval",
      value: displayOrDash(f.Proposal_Margin_Approval),
    },
    {
      label: "Proposal Revision",
      value: displayOrDash(f.Proposal_Revision),
    },
    {
      label: "Last Proposal Generated",
      value:
        f.Last_Proposal_Generated?.trim() ?
          formatSowDateTime(f.Last_Proposal_Generated)
        : "-",
    },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <SectionCard title="Client Proposal" accent="green">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {metrics.map((item) => (
            <div key={item.label} className="min-w-[140px]">
              <div className="text-xs text-crm-text-muted">{item.label}</div>
              <div
                className={cn(
                  "mt-0.5 text-sm font-medium text-crm-text",
                  item.value === "-" && "font-normal text-crm-text-muted",
                )}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SectionCard title="Suggested Client Addendum" accent="gold">
          <div className="min-h-[120px] whitespace-pre-wrap text-sm text-crm-text">
            {displayOrDash(f.Suggested_Client_Addendum)}
          </div>
        </SectionCard>
        <SectionCard title="Suggested Vendor Addendum" accent="gold">
          <div className="min-h-[120px] whitespace-pre-wrap text-sm text-crm-text">
            {displayOrDash(f.Suggested_Vendor_Addendum)}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ─── Bids & Contracts ─── */

export function BidsContractsTab({
  recordId,
  zohoUrl,
}: {
  recordId: string;
  zohoUrl: string;
}) {
  const pickBids = useCallback(
    (data: Record<string, unknown>) => (data.bids as SowBidRow[]) ?? [],
    [],
  );
  const pickContracts = useCallback(
    (data: Record<string, unknown>) => (data.contracts as SowContractRow[]) ?? [],
    [],
  );
  const bidsState = useRelatedTab(recordId, "bids", pickBids, true);
  const contractsState = useRelatedTab(recordId, "contracts", pickContracts, true);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <BidsSection
        zohoUrl={zohoUrl}
        loading={bidsState.loading}
        error={bidsState.error}
        bids={bidsState.data ?? []}
      />
      <ContractsSection
        zohoUrl={zohoUrl}
        loading={contractsState.loading}
        error={contractsState.error}
        contracts={contractsState.data ?? []}
      />
    </div>
  );
}

function BidsSection({
  zohoUrl,
  loading,
  error,
  bids,
}: {
  zohoUrl: string;
  loading: boolean;
  error: string | null;
  bids: SowBidRow[];
}) {
  return (
    <section
      className="rounded-xl border border-crm-border border-t-[3px] bg-crm-panel shadow-sm"
      style={{ borderTopColor: OLIO_GREEN }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-crm-border/70 px-3.5 py-2.5">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-crm-text">
          Bids
          {bids.length > 0 ?
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              {bids.length}
            </span>
          : null}
        </h2>
        <div className="flex gap-1.5">
          <GhostButton href={zohoUrl}>New</GhostButton>
          <GhostButton href={zohoUrl}>Edit</GhostButton>
        </div>
      </header>
      <div className="overflow-x-auto">
        {loading ? <PanelLoader />
        : error ?
          <div className="px-3.5 py-6 text-sm text-red-600">{error}</div>
        : bids.length === 0 ?
          <EmptyState />
        : <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
                <th className="px-3 py-2.5">Bid Number</th>
                <th className="px-3 py-2.5">Vendor</th>
                <th className="px-3 py-2.5">Selected Bid</th>
                <th className="px-3 py-2.5">Bid Summary</th>
                <th className="px-3 py-2.5">Bid Notes</th>
                <th className="px-3 py-2.5">Olio Ops Owner</th>
                <th className="px-3 py-2.5">Last Activity Time</th>
                <th className="px-3 py-2.5">Bid Docs URL</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((row) => (
                <tr key={row.id} className="border-b border-crm-border/80 align-top">
                  <td className="px-3 py-2.5">
                    <a
                      href={getBidZohoRecordUrl(row.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#1d6bb8] hover:underline"
                    >
                      {row.bidNumber}
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.vendorId ?
                      <a
                        href={getVendorZohoRecordUrl(row.vendorId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1d6bb8] hover:underline"
                      >
                        {row.vendor}
                      </a>
                    : row.vendor}
                  </td>
                  <td className="px-3 py-2.5 text-crm-text-muted">
                    {row.selectedBid || ""}
                  </td>
                  <td className="max-w-[240px] whitespace-pre-wrap px-3 py-2.5 text-crm-text">
                    {row.bidSummary || ""}
                  </td>
                  <td className="px-3 py-2.5 text-crm-text-muted">
                    {row.bidNotes || ""}
                  </td>
                  <td className="px-3 py-2.5">{row.olioOpsOwner}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {row.lastActivityTime}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.bidDocsUrl ?
                      <a
                        href={row.bidDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1d6bb8] hover:underline"
                      >
                        {row.bidDocsUrl}
                      </a>
                    : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </section>
  );
}

function ContractsSection({
  zohoUrl,
  loading,
  error,
  contracts,
}: {
  zohoUrl: string;
  loading: boolean;
  error: string | null;
  contracts: SowContractRow[];
}) {
  return (
    <section
      className="rounded-xl border border-crm-border border-t-[3px] bg-crm-panel shadow-sm"
      style={{ borderTopColor: OLIO_GREEN }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-crm-border/70 px-3.5 py-2.5">
        <h2 className="text-sm font-semibold text-crm-text">Contracts</h2>
        <div className="flex gap-1.5">
          <GhostButton href={zohoUrl}>New</GhostButton>
          <GhostButton href={zohoUrl}>Edit</GhostButton>
        </div>
      </header>
      <div>
        {loading ? <PanelLoader />
        : error ?
          <div className="px-3.5 py-6 text-sm text-red-600">{error}</div>
        : contracts.length === 0 ?
          <EmptyState />
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
                  <th className="px-3 py-2.5">Contract</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Vendor</th>
                  <th className="px-3 py-2.5">Account</th>
                  <th className="px-3 py-2.5">Start Date</th>
                  <th className="px-3 py-2.5">End Date</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((row) => (
                  <tr key={row.id} className="border-b border-crm-border/80">
                    <td className="px-3 py-2.5">
                      <a
                        href={getContractZohoRecordUrl(row.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#1d6bb8] hover:underline"
                      >
                        {row.name}
                      </a>
                    </td>
                    <td className="px-3 py-2.5">{row.status}</td>
                    <td className="px-3 py-2.5">{row.vendor}</td>
                    <td className="px-3 py-2.5">{row.accountName}</td>
                    <td className="px-3 py-2.5">{row.startDate}</td>
                    <td className="px-3 py-2.5">{row.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  );
}

/* ─── Notes ─── */

export function NotesTab({ recordId }: { recordId: string }) {
  const pickNotes = useCallback(
    (data: Record<string, unknown>) => (data.notes as SowNoteRow[]) ?? [],
    [],
  );
  const { data, loading, error, reload } = useRelatedTab(
    recordId,
    "notes",
    pickNotes,
    true,
  );
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const notes = useMemo(() => {
    const list = [...(data ?? [])];
    if (sort === "oldest") list.reverse();
    return list;
  }, [data, sort]);

  const saveNote = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/sow/${encodeURIComponent(recordId)}/related?kind=notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to save note");
      setTitle("");
      setContent("");
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <section className="rounded-xl border border-crm-border bg-crm-panel p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-crm-text">Notes</h2>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-crm-border bg-crm-canvas px-2.5 text-xs font-medium text-crm-text"
            onClick={() => setSort((s) => (s === "recent" ? "oldest" : "recent"))}
          >
            {sort === "recent" ? "Recent First" : "Oldest First"}
            <ChevronDown className="size-3.5 opacity-70" />
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1 rounded-xl border-2 border-indigo-200 bg-white p-3 dark:border-indigo-500/40 dark:bg-zinc-900">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="mb-1 w-full bg-transparent text-sm font-medium text-crm-text outline-none placeholder:text-crm-text-muted"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's this note about?"
              rows={3}
              className="w-full resize-y bg-transparent text-sm text-crm-text outline-none placeholder:text-crm-text-muted"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-crm-text-muted">
                <span className="inline-flex size-7 items-center justify-center rounded-md border border-crm-border text-xs font-bold">
                  T
                </span>
                <span className="inline-flex size-7 items-center justify-center rounded-md border border-crm-border">
                  <Paperclip className="size-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 rounded-md border border-crm-border bg-white px-3 text-xs font-medium text-crm-text hover:bg-crm-canvas dark:bg-transparent"
                  onClick={() => {
                    setTitle("");
                    setContent("");
                    setSaveError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || (!title.trim() && !content.trim())}
                  className="h-8 rounded-md bg-indigo-300 px-3 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 dark:bg-indigo-500"
                  onClick={() => void saveNote()}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            {saveError ?
              <p className="mt-2 text-xs text-red-600">{saveError}</p>
            : null}
          </div>
        </div>

        <div className="mt-6">
          {loading ? <PanelLoader />
          : error ?
            <div className="text-sm text-red-600">{error}</div>
          : notes.length === 0 ?
            <EmptyState label="No notes yet" />
          : <ul className="space-y-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-crm-border bg-crm-canvas/50 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-crm-text">
                        {note.title || "Untitled"}
                      </div>
                      {note.content ?
                        <p className="mt-1 whitespace-pre-wrap text-sm text-crm-text">
                          {note.content}
                        </p>
                      : null}
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-crm-text-muted">
                      <div>{note.createdBy}</div>
                      <div>{note.createdTime}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          }
        </div>
      </section>
    </div>
  );
}

/* ─── Emails ─── */

export function EmailsTab({ recordId }: { recordId: string }) {
  const [subTab, setSubTab] = useState<"mails" | "drafts" | "scheduled">("mails");
  const pickEmails = useCallback(
    (data: Record<string, unknown>) => (data.emails as SowEmailRow[]) ?? [],
    [],
  );
  const { data, loading, error, reload } = useRelatedTab(
    recordId,
    "emails",
    pickEmails,
    true,
  );

  const emails = data ?? [];

  return (
    <div className="mx-auto max-w-[1100px]">
      <section className="rounded-xl border border-crm-border bg-crm-panel shadow-sm">
        <header className="flex items-center gap-2 px-4 pt-4">
          <h2 className="text-base font-semibold text-crm-text">Emails</h2>
          <button
            type="button"
            aria-label="Refresh emails"
            className="inline-flex size-7 items-center justify-center rounded-full text-crm-text-muted hover:bg-crm-canvas hover:text-crm-text"
            onClick={reload}
          >
            <RefreshCw className="size-3.5" />
          </button>
        </header>

        <div className="mt-3 flex gap-4 border-b border-crm-border px-4">
          {(
            [
              ["mails", "Mails"],
              ["drafts", "Drafts"],
              ["scheduled", "Scheduled"],
            ] as const
          ).map(([id, label]) => {
            const active = subTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSubTab(id)}
                className={cn(
                  "relative pb-2.5 text-sm font-medium",
                  active ? "text-[#3b5bdb]" : "text-crm-text-muted hover:text-crm-text",
                )}
              >
                {label}
                {active ?
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#3b5bdb]" />
                : null}
              </button>
            );
          })}
        </div>

        <div className="min-h-[200px] px-4 py-2">
          {subTab !== "mails" ?
            <EmptyState />
          : loading ?
            <PanelLoader />
          : error ?
            <div className="py-6 text-sm text-red-600">{error}</div>
          : emails.length === 0 ?
            <EmptyState />
          : <ul className="divide-y divide-crm-border">
              {emails.map((email) => (
                <li key={email.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-crm-text">{email.subject}</div>
                    <div className="mt-0.5 text-xs text-crm-text-muted">
                      From {email.from} · To {email.to}
                    </div>
                  </div>
                  <div className="text-right text-xs text-crm-text-muted">
                    <div>{email.status}</div>
                    <div>{email.sentOn}</div>
                  </div>
                </li>
              ))}
            </ul>
          }
        </div>
      </section>
    </div>
  );
}

/* ─── Timeline ─── */

export function TimelineTab({ recordId }: { recordId: string }) {
  const pickTimeline = useCallback(
    (data: Record<string, unknown>) =>
      (data.timeline as SowTimelineEntry[]) ?? [],
    [],
  );
  const { data, loading, error, reload } = useRelatedTab(
    recordId,
    "timeline",
    pickTimeline,
    true,
  );

  const groups = useMemo(() => {
    const map = new Map<string, SowTimelineEntry[]>();
    for (const entry of data ?? []) {
      const list = map.get(entry.dateKey) ?? [];
      list.push(entry);
      map.set(entry.dateKey, list);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <div className="mx-auto max-w-[900px]">
      <section className="rounded-xl border border-crm-border bg-crm-panel p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-crm-text">Timeline</h2>
          <button
            type="button"
            aria-label="Refresh timeline"
            className="inline-flex size-8 items-center justify-center rounded-md border border-crm-border text-crm-text-muted hover:bg-crm-canvas"
            onClick={reload}
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-crm-text">Timeline History</h3>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-crm-border text-crm-text-muted hover:bg-crm-canvas"
            aria-label="Filter timeline"
          >
            <Filter className="size-3.5" />
          </button>
        </div>

        {loading ? <PanelLoader />
        : error ?
          <div className="text-sm text-red-600">{error}</div>
        : groups.length === 0 ?
          <EmptyState label="No timeline history" />
        : <div className="relative space-y-6 pl-2">
            {groups.map(([dateKey, entries]) => (
              <div key={dateKey}>
                <div className="mb-3 inline-flex rounded-md border border-crm-border bg-crm-canvas px-2.5 py-1 text-xs font-semibold text-crm-text">
                  {dateKey}
                </div>
                <ul className="relative space-y-4 border-l border-crm-border ml-3 pl-6">
                  {entries.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[31px] top-0.5 inline-flex size-6 items-center justify-center rounded-full border border-crm-border bg-crm-panel text-crm-text-muted">
                        {entry.icon === "edit" ?
                          <Pencil className="size-3" />
                        : <Wallet className="size-3" />}
                      </span>
                      <div className="text-xs font-medium text-crm-text-muted">
                        {entry.timeLabel}
                      </div>
                      <TimelineSummary text={entry.summary} />
                      {entry.source ?
                        <div className="mt-0.5 text-xs text-crm-text-muted">
                          {entry.source}
                        </div>
                      : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        }
      </section>
    </div>
  );
}

function TimelineSummary({ text }: { text: string }) {
  // Highlight "from X to Y" values with bold
  const parts = text.split(
    /(blank value|\b\d+(?:\.\d+)?\b|from | to )/gi,
  );
  return (
    <div className="mt-0.5 text-sm text-crm-text">
      {parts.map((part, index) => {
        const bold =
          part.toLowerCase() === "blank value" ||
          (/^\d/.test(part) && part !== "from " && part !== " to ");
        return bold ?
            <strong key={index}>{part}</strong>
          : <span key={index}>{part}</span>;
      })}
    </div>
  );
}

/* ─── All Fields ─── */

export function AllFieldsTab({ record }: { record: SowDetailRecord }) {
  const entries = useMemo(() => {
    return Object.entries(record.fields)
      .filter(([key]) => key !== "Scope_of_Work")
      .sort(([a], [b]) => a.localeCompare(b));
  }, [record.fields]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionCard title="All Fields" accent="green" bodyClassName="p-0">
        <div className="grid grid-cols-1 divide-y divide-crm-border sm:grid-cols-2 sm:divide-y-0">
          {entries.map(([apiName, value]) => (
            <div
              key={apiName}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 border-b border-crm-border px-3.5 py-2 text-sm"
            >
              <div className="text-crm-text-muted">{apiName.replace(/_/g, " ")}</div>
              <div
                className={cn(
                  "min-w-0 break-words font-medium text-crm-text",
                  !value?.trim() && "font-normal text-crm-text-muted",
                )}
              >
                {displayOrDash(value)}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
