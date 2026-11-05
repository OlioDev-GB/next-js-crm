import type { SowRecord } from "@/lib/sow/columns";
import { SOW_STATIC_RECORDS } from "@/lib/sow/static";

/** Fields fetched for the SOW Web v3 detail canvas. */
export const SOW_DETAIL_FIELD_API_NAMES = [
  "SOWID",
  "Deal_Name",
  "Stage",
  "Pipeline",
  "Client_Bid_Due_Date",
  "Vendor_Bid_Due_Date",
  "Start_Date",
  "End_Date",
  "Agreement_Start_Date",
  "Agreement_End_Date",
  "Vendor",
  "Proposal_Client_Total",
  "Proposal_Margin",
  "Proposal_Margin_Approval",
  "Proposal_Revision",
  "Last_Proposal_Generated",
  "Suggested_Client_Addendum",
  "Suggested_Vendor_Addendum",
  "Company_Name",
  "Site_Street",
  "Site_City",
  "Site_State",
  "Site_Zip",
  "Region_District_Zone",
  "Site_Acreage",
  "Site_Open_Up_Time",
  "Site_Map",
  "SiteMap_URL",
  "Schedule_Service",
  "st_Service_Scheduling_Deadline",
  "Vendor_Signed_Status",
  "Client_PO_Number",
  "Client_PO_URL",
  "Vendor_Specific_Attachments",
  "Vendor_Specific_Attachments_URL",
  "Client_Approved_NTE",
  "Sales_Owner",
  "Sales_Associate_New",
  "Ops_Owner",
  "Operations_Associate_New",
  "Site_Visit_Assignment",
  "Tag",
  "Sourcing_Notes",
  "Internal_Notes_for_Olio_Team",
  "Progress_Notes",
  "Past_Progress_Notes",
  "Client_Addendum_Rich",
  "Vendor_Addendum_Rich",
  "Scope_of_Work",
  "Account_Name",
  "Owner",
  "Location_Name",
  "SOW_Summary",
  "Modified_By",
  "Created_By",
  "Type",
  "Contract_Term",
  "Exchange_Rate",
  "Currency",
  "Created_Time",
  "Modified_Time",
  "Last_Activity_Time",
] as const;

export type SowDetailTabId =
  | "overview"
  | "proposal"
  | "bids"
  | "notes"
  | "emails"
  | "timeline"
  | "all-fields";

export const SOW_DETAIL_TABS: { id: SowDetailTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "proposal", label: "Proposal" },
  { id: "bids", label: "Bids & Contracts" },
  { id: "notes", label: "Notes" },
  { id: "emails", label: "Emails" },
  { id: "timeline", label: "Timeline" },
  { id: "all-fields", label: "All Fields" },
];

export type SowScopeRow = {
  id: string;
  ourServices: string;
  ourServicesId?: string;
  vendorPrice: string;
  clientPrice: string;
  startDate: string;
  endDate: string;
  targetClientPrice: string;
  vendorTargetPrice: string;
};

export type SowDetailRecord = {
  id: string;
  fields: Record<string, string>;
  lookups?: Record<string, string>;
  scopeOfWork: SowScopeRow[];
  offlineDemo?: boolean;
};

export function formatSowDetailDate(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw || raw === "-") return "-";
  const iso = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return raw;
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSowDetailCurrency(value: string | number | null | undefined): string {
  if (value == null || value === "") return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) {
    const text = String(value).trim();
    return text || "-";
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function displayOrDash(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return text || "-";
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const left = formatSowDetailDate(start);
  const right = formatSowDetailDate(end);
  if (left === "-" && right === "-") return "-";
  return `${left} to ${right}`;
}

function lookupName(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && !Array.isArray(raw) && raw !== null) {
    const name = (raw as { name?: unknown }).name;
    if (name != null && String(name).trim()) return String(name);
  }
  return String(raw);
}

function lookupId(raw: unknown): string | undefined {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const id = (raw as { id?: unknown }).id;
    if (id != null) return String(id);
  }
  return undefined;
}

export function mapScopeOfWorkRows(raw: unknown): SowScopeRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const service = item.OurServices;
    return {
      id: item.id != null ? String(item.id) : `scope-${index}`,
      ourServices: lookupName(service) || "-",
      ourServicesId: lookupId(service),
      vendorPrice: formatSowDetailCurrency(item.Vendor_Price as string | number | null),
      clientPrice: formatSowDetailCurrency(
        (item.Invoice_Price ?? item.Client_Price) as string | number | null,
      ),
      startDate: formatSowDetailDate(
        item.Start_Date != null ? String(item.Start_Date) : "",
      ),
      endDate: formatSowDetailDate(item.End_Date != null ? String(item.End_Date) : ""),
      targetClientPrice: formatSowDetailCurrency(
        item.Target_Client_Price as string | number | null,
      ),
      vendorTargetPrice: formatSowDetailCurrency(
        item.Vendor_Target_Price as string | number | null,
      ),
    };
  });
}

/** Build a detail payload from a Zoho Deals row (already merged). */
export function mapZohoSowDetail(
  row: Record<string, unknown>,
  mapped: SowRecord,
): SowDetailRecord {
  return {
    id: mapped.id,
    fields: mapped.fields,
    lookups: mapped.lookups,
    scopeOfWork: mapScopeOfWorkRows(row.Scope_of_Work),
  };
}

export function getStaticSowDetail(recordId: string): SowDetailRecord | null {
  const match = SOW_STATIC_RECORDS.find((row) => row.id === recordId);
  if (!match) return null;

  const start = match.fields.Start_Date ?? "";
  const end = match.fields.End_Date ?? "";

  return {
    id: match.id,
    fields: {
      ...match.fields,
      SOWID: match.fields.Deal_Name || match.fields.SOWID || match.id,
      Site_Street: "100 Main St",
      Site_City: "Minneapolis",
      Site_State: "MN",
      Site_Zip: "55401",
      Region_District_Zone: "Midwest",
      Site_Acreage: "12.5",
      Site_Open_Up_Time: "6:00 AM",
      Vendor: "Demo Vendor LLC",
      Vendor_Signed_Status: "Pending",
      Sales_Owner: "Jim Bjorgaard",
      Sales_Associate_New: match.fields.Owner || "Olio Group",
      Ops_Owner: "Jake Bednar",
      Operations_Associate_New: "Jake Bednar",
      Site_Visit_Assignment: "Operations",
      Sourcing_Notes: "",
      Internal_Notes_for_Olio_Team: "",
      Progress_Notes: "",
      Past_Progress_Notes: "",
      Client_Addendum_Rich: "",
      Vendor_Addendum_Rich: "",
      Proposal_Client_Total: "",
      Proposal_Margin: "",
      Proposal_Margin_Approval: "",
      Proposal_Revision: "",
      Last_Proposal_Generated: "",
      Suggested_Client_Addendum: "",
      Suggested_Vendor_Addendum: "",
      Location_Name: match.fields.Location_Name ?? "",
      SOW_Summary: "",
      Modified_By: match.fields.Owner || "",
      Created_By: match.fields.Owner || "",
      Type: "",
      Contract_Term: "New",
      Exchange_Rate: "1",
      Currency: "USD",
      Created_Time: "",
      Modified_Time: "",
      Last_Activity_Time: "",
    },
    scopeOfWork: [
      {
        id: `${match.id}-scope-1`,
        ourServices: "Test One Off",
        vendorPrice: "88.00",
        clientPrice: "77.00",
        startDate: formatSowDetailDate(start),
        endDate: formatSowDetailDate(end),
        targetClientPrice: "-",
        vendorTargetPrice: "0.00",
      },
    ],
    offlineDemo: true,
  };
}
