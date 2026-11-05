import { formatFieldValue } from "@/lib/zoho";
import {
  displayOrDash,
  formatSowDetailDate,
} from "@/lib/sow/recordDetail";

export type SowRelatedKind =
  | "bids"
  | "contracts"
  | "notes"
  | "emails"
  | "timeline";

export type SowBidRow = {
  id: string;
  bidNumber: string;
  vendor: string;
  vendorId?: string;
  selectedBid: string;
  bidSummary: string;
  bidNotes: string;
  olioOpsOwner: string;
  lastActivityTime: string;
  bidDocsUrl: string;
};

export type SowContractRow = {
  id: string;
  name: string;
  status: string;
  vendor: string;
  accountName: string;
  startDate: string;
  endDate: string;
};

export type SowNoteRow = {
  id: string;
  title: string;
  content: string;
  createdTime: string;
  createdBy: string;
};

export type SowEmailRow = {
  id: string;
  subject: string;
  status: string;
  sentOn: string;
  from: string;
  to: string;
};

export type SowTimelineEntry = {
  id: string;
  auditedTime: string;
  dateKey: string;
  timeLabel: string;
  action: string;
  summary: string;
  source: string;
  icon: "edit" | "workflow" | "other";
};

function lookupName(raw: unknown): string {
  return formatFieldValue(raw) || "";
}

function lookupId(raw: unknown): string | undefined {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const id = (raw as { id?: unknown }).id;
    if (id != null) return String(id);
  }
  return undefined;
}

export function formatSowDateTime(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimelineClock(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimelineDateKey(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "Unknown";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function mapBidRelatedRows(rows: unknown[]): SowBidRow[] {
  return rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const selected =
      item.Selected_Bid === true || item.Selected_Bid === "true" ?
        "Yes"
      : item.Selected_Bid === false || item.Selected_Bid === "false" ?
        ""
      : displayOrDash(formatFieldValue(item.Selected_Bid));
    return {
      id: item.id != null ? String(item.id) : `bid-${index}`,
      bidNumber: lookupName(item.Name) || "-",
      vendor: lookupName(item.Vendor) || "-",
      vendorId: lookupId(item.Vendor),
      selectedBid: selected,
      bidSummary: String(item.Bid_Summary ?? "").trim(),
      bidNotes: String(item.Bid_Notes ?? "").trim(),
      olioOpsOwner: lookupName(item.Olio_Ops_Owner) || "-",
      lastActivityTime: formatSowDateTime(
        item.Last_Activity_Time != null ? String(item.Last_Activity_Time) : "",
      ),
      bidDocsUrl:
        lookupName(item.URL) ||
        lookupName(item.Bid_Docs_URL) ||
        lookupName(item.Supporting_Docs_URL) ||
        "",
    };
  });
}

export function mapContractRelatedRows(rows: unknown[]): SowContractRow[] {
  return rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `contract-${index}`,
      name: lookupName(item.Name) || "-",
      status: lookupName(item.Status) || "-",
      vendor: lookupName(item.Vendor) || "-",
      accountName: lookupName(item.Account_Name) || "-",
      startDate: formatSowDetailDate(
        item.Start_Date != null ? String(item.Start_Date) : "",
      ),
      endDate: formatSowDetailDate(
        item.End_Date != null ? String(item.End_Date) : "",
      ),
    };
  });
}

export function mapNoteRelatedRows(rows: unknown[]): SowNoteRow[] {
  return rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `note-${index}`,
      title: String(item.Note_Title ?? "").trim(),
      content: String(item.Note_Content ?? "").trim(),
      createdTime: formatSowDateTime(
        item.Created_Time != null ? String(item.Created_Time) : "",
      ),
      createdBy: lookupName(item.Created_By) || lookupName(item.Owner) || "-",
    };
  });
}

export function mapEmailRelatedRows(rows: unknown[]): SowEmailRow[] {
  return rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `email-${index}`,
      subject: String(item.Subject ?? "").trim() || "(No subject)",
      status: lookupName(item.Status) || "-",
      sentOn: formatSowDateTime(item.Sent_On != null ? String(item.Sent_On) : ""),
      from: lookupName(item.From) || "-",
      to: lookupName(item.To) || "-",
    };
  });
}

function formatTimelineValue(value: unknown): string {
  if (value == null || value === "") return "blank value";
  return String(value);
}

export function mapTimelineEntries(rows: unknown[]): SowTimelineEntry[] {
  return rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const auditedTime =
      item.audited_time != null ? String(item.audited_time) : "";
    const fieldHistory = Array.isArray(item.field_history) ?
        (item.field_history as Record<string, unknown>[])
      : [];
    const automation = item.automation_details as
      | { name?: string; type?: string }
      | undefined;
    const sourceParts: string[] = [];
    if (automation?.type === "functions" && automation.name) {
      sourceParts.push(`via Function ${automation.name}`);
    } else if (automation?.type === "workflow" && automation.name) {
      sourceParts.push(`via Workflow Rule ${automation.name}`);
    } else if (item.source) {
      sourceParts.push(`via ${String(item.source).replace(/_/g, " ")}`);
    }

    let summary = "";
    if (fieldHistory.length > 0) {
      summary = fieldHistory
        .map((fh) => {
          const api = String(fh.api_name ?? "Field");
          const label = api.replace(/_/g, " ");
          const values = (fh._value ?? {}) as { old?: unknown; new?: unknown };
          return `${label} was updated from ${formatTimelineValue(values.old)} to ${formatTimelineValue(values.new)}`;
        })
        .join("; ");
    } else if (automation?.name) {
      summary =
        automation.type === "functions" ?
          `Function ${automation.name} was called`
        : `${automation.name} ran`;
    } else {
      summary = `${String(item.action ?? "updated")} record`;
    }

    const icon: SowTimelineEntry["icon"] =
      fieldHistory.length > 0 ? "edit"
      : automation?.type === "workflow" ? "workflow"
      : "other";

    return {
      id: item.id != null ? String(item.id) : `timeline-${index}`,
      auditedTime,
      dateKey: formatTimelineDateKey(auditedTime),
      timeLabel: formatTimelineClock(auditedTime),
      action: String(item.action ?? ""),
      summary,
      source: sourceParts.join(" "),
      icon,
    };
  });
}

export function getStaticRelatedPayload(kind: SowRelatedKind, recordId: string) {
  if (kind === "bids") {
    return {
      bids: [
        {
          id: `${recordId}-bid-1`,
          bidNumber: "MB441617",
          vendor: "Demo Vendor LLC",
          selectedBid: "",
          bidSummary:
            "SOW Item Name | Vendor Price\n------------------------------------------\n                          | 88",
          bidNotes: "",
          olioOpsOwner: "Jake Bednar",
          lastActivityTime: formatSowDateTime(new Date().toISOString()),
          bidDocsUrl: "",
        } satisfies SowBidRow,
      ],
    };
  }
  if (kind === "contracts") return { contracts: [] as SowContractRow[] };
  if (kind === "notes") return { notes: [] as SowNoteRow[] };
  if (kind === "emails") return { emails: [] as SowEmailRow[] };
  return {
    timeline: [
      {
        id: `${recordId}-tl-1`,
        auditedTime: new Date().toISOString(),
        dateKey: formatTimelineDateKey(new Date().toISOString()),
        timeLabel: formatTimelineClock(new Date().toISOString()),
        action: "updated",
        summary: "Days was updated from 6 to 7",
        source: "via Function Update SOW History date",
        icon: "edit",
      } satisfies SowTimelineEntry,
    ],
  };
}
