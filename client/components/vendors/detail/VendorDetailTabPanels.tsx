"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildVendorComplianceRows,
  displayOrDash,
  formatVendorDetailDate,
  formatVendorDetailDateTime,
  type VendorDetailRecord,
} from "@/lib/vendors/recordDetail";
import type {
  VendorBidRow,
  VendorContractRow,
  VendorInvoiceRow,
  VendorServiceCompletionRow,
  VendorSowRow,
} from "@/lib/vendors/related";
import {
  getBidZohoRecordUrl,
  getContractZohoRecordUrl,
  getServiceCompletionZohoRecordUrl,
  getSowZohoRecordUrl,
  getVendorInvoiceZohoRecordUrl,
} from "@/lib/zoho/crmRecordUrls";

const OLIO_GREEN = "#1f6b3a";

function SectionCard({
  title,
  children,
  className,
  headerRight,
  bodyClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-crm-border border-t-[3px] bg-crm-panel shadow-sm",
        className,
      )}
      style={{ borderTopColor: OLIO_GREEN }}
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
      <div className={cn("px-3.5 py-2.5", bodyClassName)}>{children}</div>
    </section>
  );
}

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
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-x-2 py-1 text-[13px] leading-snug">
      <dt className="text-crm-text-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words font-medium text-crm-text",
          link && !empty && "text-[#1d6bb8]",
          empty && "font-normal text-crm-text-muted",
        )}
      >
        {link && !empty && /^https?:\/\//i.test(value) ?
          <a href={value} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {value}
          </a>
        : value}
      </dd>
    </div>
  );
}

function KpiCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div
      className="rounded-lg border border-crm-border border-l-[3px] bg-crm-panel px-3 py-2.5 shadow-sm"
      style={{ borderLeftColor: OLIO_GREEN }}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-crm-text-muted">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-crm-text">
        {badge && value !== "-" ?
          <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-500/30 dark:bg-sky-500/20 dark:text-sky-200">
            {value}
          </span>
        : value}
      </div>
    </div>
  );
}

function EmptyState({ label = "No records found" }: { label?: string }) {
  return (
    <div className="py-8 text-center text-sm text-crm-text-muted">{label}</div>
  );
}

function PanelLoader() {
  return (
    <div className="flex h-28 items-center justify-center gap-2 text-crm-text-muted">
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </div>
  );
}

function useRelated<T>(
  recordId: string,
  kind: string,
  pick: (data: Record<string, unknown>) => T,
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(
      `/api/vendors/${encodeURIComponent(recordId)}/related?kind=${encodeURIComponent(kind)}`,
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
  }, [recordId, kind, enabled, pick]);

  return { data, loading, error };
}

function RelatedTableSection({
  title,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <SectionCard title={title} bodyClassName="p-0">
      {loading ? <PanelLoader />
      : error ?
        <div className="px-3.5 py-6 text-sm text-red-600">{error}</div>
      : empty ?
        <EmptyState />
      : children}
    </SectionCard>
  );
}

/* ─── Overview ─── */

export function VendorOverviewTab({
  record,
  recordId,
}: {
  record: VendorDetailRecord;
  recordId: string;
}) {
  const f = record.fields;

  const pickContracts = useCallback(
    (d: Record<string, unknown>) => (d.contracts as VendorContractRow[]) ?? [],
    [],
  );
  const pickBids = useCallback(
    (d: Record<string, unknown>) => (d.bids as VendorBidRow[]) ?? [],
    [],
  );
  const pickSc = useCallback(
    (d: Record<string, unknown>) =>
      (d.serviceCompletions as VendorServiceCompletionRow[]) ?? [],
    [],
  );
  const pickSow = useCallback(
    (d: Record<string, unknown>) => (d.sows as VendorSowRow[]) ?? [],
    [],
  );
  const pickInv = useCallback(
    (d: Record<string, unknown>) =>
      (d.vendorInvoices as VendorInvoiceRow[]) ?? [],
    [],
  );

  const contracts = useRelated(recordId, "contracts", pickContracts, true);
  const bids = useRelated(recordId, "bids", pickBids, true);
  const completions = useRelated(recordId, "service-completions", pickSc, true);
  const sows = useRelated(recordId, "sow", pickSow, true);
  const invoices = useRelated(recordId, "vendor-invoices", pickInv, true);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Status" value={displayOrDash(f.Status)} badge />
        <KpiCard label="Vendor Standing" value={displayOrDash(f.Vendor_Standing)} />
        <KpiCard
          label="COI Expiration"
          value={formatVendorDetailDate(f.COI_Expiration)}
        />
        <KpiCard
          label="Workers Compensation Expiration"
          value={formatVendorDetailDate(f.Workers_Compensation_Expiration)}
        />
        <KpiCard
          label="Auto Insurance Exp Date"
          value={formatVendorDetailDate(f.Auto_Insurance_Date)}
        />
        <KpiCard
          label="Late Invoice Count"
          value={displayOrDash(f.Late_Invoice_Count)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <SectionCard title="Progress Notes">
          <div className="min-h-[100px] whitespace-pre-wrap text-sm text-crm-text">
            {displayOrDash(f.Progress_Notes)}
          </div>
        </SectionCard>
        <SectionCard title="Services">
          <dl>
            <FieldRow
              label="Vendor Categories"
              value={displayOrDash(f.Vendor_Categories)}
            />
            <FieldRow
              label="Service Capabilities"
              value={displayOrDash(f.Service_Capabilities)}
            />
            <FieldRow label="States Served" value={displayOrDash(f.States_Served)} />
            <FieldRow
              label="Service Radius From Zip Code"
              value={displayOrDash(f.Service_Radius_From_Zip_Code)}
            />
            <FieldRow
              label="Avg Price/Acre"
              value={displayOrDash(f.Avg_Price_Acre)}
            />
          </dl>
        </SectionCard>
        <SectionCard title="Website Information">
          <dl>
            <FieldRow label="All Vendors Owner" value={displayOrDash(f.Owner)} />
            <FieldRow label="Ops Rep" value={displayOrDash(f.Ops_Rep)} />
            <FieldRow
              label="Last Login"
              value={
                f.Last_Login?.trim() ?
                  formatVendorDetailDateTime(f.Last_Login)
                : "-"
              }
            />
            <FieldRow label="App Version" value={displayOrDash(f.App_Version)} />
            <FieldRow label="Password" value={displayOrDash(f.password)} />
          </dl>
        </SectionCard>
      </div>

      <RelatedTableSection
        title="Contract"
        loading={contracts.loading}
        error={contracts.error}
        empty={(contracts.data?.length ?? 0) === 0}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
              <th className="px-3 py-2.5">Contract</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Start Date</th>
              <th className="px-3 py-2.5">End Date</th>
            </tr>
          </thead>
          <tbody>
            {(contracts.data ?? []).map((row) => (
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
                <td className="px-3 py-2.5">{row.startDate}</td>
                <td className="px-3 py-2.5">{row.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </RelatedTableSection>

      <RelatedTableSection
        title="Bids"
        loading={bids.loading}
        error={bids.error}
        empty={(bids.data?.length ?? 0) === 0}
      >
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
              <th className="px-3 py-2.5">Bid Number</th>
              <th className="px-3 py-2.5">Bids Owner</th>
              <th className="px-3 py-2.5">Created By</th>
              <th className="px-3 py-2.5">Site Number</th>
            </tr>
          </thead>
          <tbody>
            {(bids.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-crm-border/80">
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
                <td className="px-3 py-2.5">{row.owner}</td>
                <td className="px-3 py-2.5">{row.createdBy}</td>
                <td className="px-3 py-2.5">{row.siteNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </RelatedTableSection>

      <RelatedTableSection
        title="Service Completion"
        loading={completions.loading}
        error={completions.error}
        empty={(completions.data?.length ?? 0) === 0}
      >
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {(completions.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-crm-border/80">
                <td className="px-3 py-2.5">
                  <a
                    href={getServiceCompletionZohoRecordUrl(row.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1d6bb8] hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2.5">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </RelatedTableSection>

      <RelatedTableSection
        title="Sow"
        loading={sows.loading}
        error={sows.error}
        empty={(sows.data?.length ?? 0) === 0}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
              <th className="px-3 py-2.5">SOW</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Start Date</th>
              <th className="px-3 py-2.5">End Date</th>
            </tr>
          </thead>
          <tbody>
            {(sows.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-crm-border/80">
                <td className="px-3 py-2.5">
                  <a
                    href={getSowZohoRecordUrl(row.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1d6bb8] hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2.5">{row.stage}</td>
                <td className="px-3 py-2.5">{row.startDate}</td>
                <td className="px-3 py-2.5">{row.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </RelatedTableSection>

      <RelatedTableSection
        title="Vendor Invoice"
        loading={invoices.loading}
        error={invoices.error}
        empty={(invoices.data?.length ?? 0) === 0}
      >
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
              <th className="px-3 py-2.5">Invoice</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {(invoices.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-crm-border/80">
                <td className="px-3 py-2.5">
                  <a
                    href={getVendorInvoiceZohoRecordUrl(row.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1d6bb8] hover:underline"
                  >
                    {row.name}
                  </a>
                </td>
                <td className="px-3 py-2.5">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </RelatedTableSection>
    </div>
  );
}

/* ─── Compliance ─── */

export function VendorComplianceTab({
  record,
  zohoUrl,
}: {
  record: VendorDetailRecord;
  zohoUrl: string;
}) {
  const rows = useMemo(
    () => buildVendorComplianceRows(record.fields),
    [record.fields],
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionCard
        title="Compliance"
        headerRight={
          <a
            href={zohoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-white hover:brightness-110"
            style={{ backgroundColor: OLIO_GREEN }}
          >
            Process Compliance
          </a>
        }
        bodyClassName="p-0"
      >
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-crm-border bg-crm-table-head text-left text-xs font-semibold text-crm-text-muted">
              <th className="px-3 py-2.5">Document</th>
              <th className="px-3 py-2.5">Expires</th>
              <th className="px-3 py-2.5">File upload</th>
              <th className="px-3 py-2.5">File URL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-crm-border/80">
                <td className="px-3 py-2.5 font-medium text-crm-text">
                  {row.document}
                </td>
                <td className="px-3 py-2.5 text-crm-text-muted">
                  {row.expires === "-" ? "Not set" : row.expires}
                </td>
                <td className="px-3 py-2.5 text-crm-text-muted">{row.fileUpload}</td>
                <td className="px-3 py-2.5">
                  {row.fileUrl !== "-" && /^https?:\/\//i.test(row.fileUrl) ?
                    <a
                      href={row.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1d6bb8] hover:underline"
                    >
                      {row.fileUrl}
                    </a>
                  : <span className="text-crm-text-muted">
                      {row.fileUrl === "-" ? "Not set" : row.fileUrl}
                    </span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* ─── Financial ─── */

export function VendorFinancialTab({ record }: { record: VendorDetailRecord }) {
  const f = record.fields;
  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-3 lg:grid-cols-3">
      <SectionCard title="Bank">
        <dl>
          <FieldRow
            label="Type of Account (Financial)"
            value={displayOrDash(f.Type_of_Account_Financial)}
          />
          <FieldRow
            label="Vendor Bank Routing Number"
            value={displayOrDash(f.CF_Vendor_Bank_Routing_Number)}
          />
          <FieldRow
            label="Vendor Bank Account Number"
            value={displayOrDash(f.CF_Vendor_Bank_Account_Number)}
          />
          <FieldRow
            label="Vendor Bank Confirmed Account Number"
            value={displayOrDash(f.CF_Vendor_Bank_Confirmed_Account_Number)}
          />
          <FieldRow
            label="Bank ACH (Team Upload)"
            value={displayOrDash(f.Bank_ACH_Team_Upload)}
          />
          <FieldRow
            label="Check Payment Preferred"
            value={displayOrDash(f.Check_Payment_Preferred)}
          />
        </dl>
      </SectionCard>
      <SectionCard title="Payee and tax">
        <dl>
          <FieldRow label="Payee Name" value={displayOrDash(f.Payee_Name)} />
          <FieldRow label="Payee SSN/EIN" value={displayOrDash(f.Payee_SSN_EIN)} />
          <FieldRow label="Payee Address" value={displayOrDash(f.Payee_Address)} />
          <FieldRow label="Payee Email" value={displayOrDash(f.Payee_Email)} link />
          <FieldRow label="Payee Phone" value={displayOrDash(f.Payee_Phone)} />
          <FieldRow
            label="Remittance Email"
            value={displayOrDash(f.Remittance_Email)}
            link
          />
          <FieldRow label="Vendor EIN" value={displayOrDash(f.CF_Vendor_EIN)} />
        </dl>
      </SectionCard>
      <SectionCard title="Billing">
        <dl>
          <FieldRow
            label="Payment Terms"
            value={displayOrDash(f.Payment_Terms_Label || f.Payment_Terms)}
          />
          <FieldRow label="Exchange Rate" value={displayOrDash(f.Exchange_Rate)} />
          <FieldRow
            label="Address (Financial)"
            value={displayOrDash(f.Address_Financial)}
          />
          <FieldRow
            label="Phone (Financial)"
            value={displayOrDash(f.Phone_Financial)}
          />
        </dl>
      </SectionCard>
    </div>
  );
}

/* ─── All Fields ─── */

function TwoColFields({
  left,
  right,
}: {
  left: { label: string; value: string; link?: boolean }[];
  right: { label: string; value: string; link?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      <dl>
        {left.map((item) => (
          <FieldRow key={item.label} {...item} />
        ))}
      </dl>
      <dl>
        {right.map((item) => (
          <FieldRow key={item.label} {...item} />
        ))}
      </dl>
    </div>
  );
}

export function VendorAllFieldsTab({ record }: { record: VendorDetailRecord }) {
  const f = record.fields;
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-3">
      <SectionCard title="Basics">
        <TwoColFields
          left={[
            { label: "All Vendors Name", value: displayOrDash(f.Vendor_Name), link: true },
            { label: "States Served", value: displayOrDash(f.States_Served) },
            { label: "Late Invoice Count", value: displayOrDash(f.Late_Invoice_Count) },
            { label: "Progress Notes", value: displayOrDash(f.Progress_Notes) },
            { label: "App Version", value: displayOrDash(f.App_Version) },
            {
              label: "Last Login",
              value: f.Last_Login?.trim() ? formatVendorDetailDateTime(f.Last_Login) : "-",
            },
            { label: "Vendor Categories", value: displayOrDash(f.Vendor_Categories) },
            { label: "Avg Price/Acre", value: displayOrDash(f.Avg_Price_Acre) },
            { label: "Wizard", value: displayOrDash(f.Wizard) },
          ]}
          right={[
            { label: "Status", value: displayOrDash(f.Status) },
            { label: "First Name", value: displayOrDash(f.First_Name) },
            { label: "Last Name", value: displayOrDash(f.Last_Name) },
            { label: "Email", value: displayOrDash(f.Email), link: true },
            { label: "Phone", value: displayOrDash(f.Phone) },
            { label: "Secondary Phone", value: displayOrDash(f.Secondary_Phone) },
            { label: "Secondary Email", value: displayOrDash(f.Secondary_Email1) },
            { label: "CF Vendor ID Number", value: displayOrDash(f.CF_Vendor_ID_Number) },
            { label: "password", value: displayOrDash(f.password) },
            { label: "Org Id", value: displayOrDash(f.Org_ID) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Address Information">
        <TwoColFields
          left={[
            { label: "Street", value: displayOrDash(f.Street) },
            { label: "City", value: displayOrDash(f.City) },
            { label: "State", value: displayOrDash(f.State) },
            { label: "Zip Code", value: displayOrDash(f.Zip_Code) },
          ]}
          right={[
            { label: "Country", value: displayOrDash(f.Country) },
            { label: "Website", value: displayOrDash(f.Website), link: true },
            {
              label: "Payment Terms",
              value: displayOrDash(f.Payment_Terms_Label || f.Payment_Terms),
            },
            { label: "Vendor Standing", value: displayOrDash(f.Vendor_Standing) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Compliance">
        <TwoColFields
          left={[
            {
              label: "Workers Comp Exemption",
              value: displayOrDash(f.Workers_Comp_Exemption_Form),
            },
            { label: "W9(Team Upload)", value: displayOrDash(f.W9) },
            { label: "W9 URL", value: displayOrDash(f.W9_URL), link: true },
            { label: "MultiState WC Forms", value: displayOrDash(f.MultiState_WC_Forms) },
            { label: "MultiState WC Urls", value: displayOrDash(f.MultiState_WC_Urls) },
            { label: "Auto Insurance", value: displayOrDash(f.Auto_Insurance), link: true },
          ]}
          right={[
            {
              label: "Certificate of Insurance - Team upload",
              value: displayOrDash(f.Certificate_of_Insurance_Team_upload),
            },
            {
              label: "Certificate of Insurance",
              value: displayOrDash(f.Certificate_of_Insurance),
              link: true,
            },
            {
              label: "Workers Comp-Team Upload",
              value: displayOrDash(f.Workers_Comp_Team_Upload),
            },
            {
              label: "Workers Compensation",
              value: displayOrDash(f.Workers_Compensation),
              link: true,
            },
            {
              label: "Auto Insurance Upload",
              value: displayOrDash(f.Auto_Insurance_Upload),
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="Expirations">
        <TwoColFields
          left={[
            {
              label: "Workers Compensation Expiration",
              value: formatVendorDetailDate(f.Workers_Compensation_Expiration),
            },
            {
              label: "COI Expiration",
              value: formatVendorDetailDate(f.COI_Expiration),
            },
            {
              label: "Auto Insurance Exp Date",
              value: formatVendorDetailDate(f.Auto_Insurance_Date),
            },
          ]}
          right={[
            {
              label: "W9 Expiration",
              value: formatVendorDetailDate(f.W9_Expiration),
            },
            {
              label: "MultiState WC Expiration",
              value: formatVendorDetailDate(f.MultiState_WC_Expiration),
            },
            {
              label: "WC Exemption Expiration",
              value: formatVendorDetailDate(f.Workers_Comp_Exemption_Expiration),
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="Financial Information">
        <TwoColFields
          left={[
            {
              label: "Vendor Bank Routing Number",
              value: displayOrDash(f.CF_Vendor_Bank_Routing_Number),
            },
            {
              label: "Vendor Bank Confirmed Account Number",
              value: displayOrDash(f.CF_Vendor_Bank_Confirmed_Account_Number),
            },
            {
              label: "Check Payment Preferred",
              value: displayOrDash(f.Check_Payment_Preferred),
            },
            {
              label: "Type of Account (Financial)",
              value: displayOrDash(f.Type_of_Account_Financial),
            },
          ]}
          right={[
            {
              label: "Bank ACH(Team Upload)",
              value: displayOrDash(f.Bank_ACH_Team_Upload),
            },
            { label: "Remittance Email", value: displayOrDash(f.Remittance_Email) },
            {
              label: "Address (Financial)",
              value: displayOrDash(f.Address_Financial),
            },
            { label: "Phone (Financial)", value: displayOrDash(f.Phone_Financial) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Service Summary">
        <TwoColFields
          left={[
            {
              label: "Service Capabilities",
              value: displayOrDash(f.Service_Capabilities),
            },
          ]}
          right={[
            {
              label: "Service Radius From Zip Code",
              value: displayOrDash(f.Service_Radius_From_Zip_Code),
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="Admin">
        <TwoColFields
          left={[
            { label: "Exchange Rate", value: displayOrDash(f.Exchange_Rate) },
            { label: "Ops Rep", value: displayOrDash(f.Ops_Rep) },
            {
              label: "Catalyst Confirmed",
              value: displayOrDash(f.Catalyst_Confirmed),
            },
            { label: "Longitude", value: displayOrDash(f.Longitude) },
          ]}
          right={[
            { label: "All Vendors Owner", value: displayOrDash(f.Owner) },
            {
              label: "VendorID Auto-generator",
              value: displayOrDash(f.VendorID_Auto_generator),
            },
            {
              label: "Last Late Invoice Month",
              value: displayOrDash(f.Last_Late_Invoice_Month),
            },
            { label: "Latitude", value: displayOrDash(f.Latitude) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Payee Information">
        <TwoColFields
          left={[
            { label: "Payee Name", value: displayOrDash(f.Payee_Name) },
            { label: "Payee Email", value: displayOrDash(f.Payee_Email) },
            { label: "Payee SSN/EIN", value: displayOrDash(f.Payee_SSN_EIN) },
          ]}
          right={[
            { label: "Payee Address", value: displayOrDash(f.Payee_Address) },
            { label: "Payee Phone", value: displayOrDash(f.Payee_Phone) },
          ]}
        />
      </SectionCard>
    </div>
  );
}
