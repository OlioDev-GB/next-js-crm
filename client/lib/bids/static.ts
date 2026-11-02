import type {
  ContractFieldFilterSelection,
  ContractFilterFieldMeta,
  ContractFilterSection,
} from "@/lib/contracts/filterTypes";
import type { BidRecord } from "@/lib/bids/columns";

function picklistField(
  apiName: string,
  label: string,
  options: { value: string; label: string }[],
): ContractFilterFieldMeta {
  return {
    apiName,
    label,
    dataType: "picklist",
    operators: [],
    options,
    hasOptions: true,
    section: "fields",
  };
}

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "Awarded", label: "Awarded" },
  { value: "Lost", label: "Lost" },
];

const staticFieldFilters: ContractFilterFieldMeta[] = [
  picklistField("Status", "Status", STATUS_OPTIONS),
];

const staticSystemViews: ContractFilterFieldMeta[] = [
  {
    apiName: "__custom_view__bids-all",
    label: "All Bids",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "bids-all",
  },
  {
    apiName: "__custom_view__bids-submitted",
    label: "Submitted",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "bids-submitted",
  },
  {
    apiName: "__custom_view__bids-awarded",
    label: "Awarded",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "bids-awarded",
  },
];

export const BIDS_STATIC_ALL_VIEW_ID = "bids-all";

export const BIDS_STATIC_FILTER_SECTIONS: ContractFilterSection[] = [
  { id: "system_defined", title: "System Defined Filters", fields: staticSystemViews },
  { id: "fields", title: "Filter By Fields", fields: staticFieldFilters },
];

export const BIDS_STATIC_FILTER_FIELDS: ContractFilterFieldMeta[] = [
  ...staticSystemViews,
  ...staticFieldFilters,
];

export const BIDS_STATIC_RECORDS: BidRecord[] = [
  {
    id: "static-bid-1001",
    fields: {
      Name: "BID-1001 Minneapolis",
      Status: "Submitted",
      Vendor: "Metro Grounds LLC",
      Contract: "CTR-2401",
      Account_Name: "Olio Group",
      Amount: "12500",
      Owner: "Gabriel Brent",
      Created_Time: "2025-10-01T12:00:00-05:00",
    },
  },
  {
    id: "static-bid-1002",
    fields: {
      Name: "BID-1002 Arlington",
      Status: "Awarded",
      Vendor: "Test-Standard Solar",
      Contract: "CTR-2402",
      Account_Name: "Standard Solar",
      Amount: "24800",
      Owner: "Olio Group",
      Created_Time: "2025-10-12T12:00:00-05:00",
    },
  },
  {
    id: "static-bid-1003",
    fields: {
      Name: "BID-1003 Tempe",
      Status: "Draft",
      Vendor: "Carvana Fleet Services",
      Contract: "CTR-2403",
      Account_Name: "Carvana",
      Amount: "8900",
      Owner: "Jake Bednar",
      Created_Time: "2025-11-01T12:00:00-05:00",
    },
  },
  {
    id: "static-bid-1004",
    fields: {
      Name: "BID-1004 Scranton",
      Status: "Lost",
      Vendor: "A+ Plus Power Wash Inc",
      Contract: "CTR-2404",
      Account_Name: "A+ Plus",
      Amount: "5200",
      Owner: "Jim Bjorgaard",
      Created_Time: "2025-09-15T12:00:00-05:00",
    },
  },
  {
    id: "static-bid-1005",
    fields: {
      Name: "BID-1005 Philly",
      Status: "Submitted",
      Vendor: "Metro Grounds LLC",
      Contract: "CTR-2405",
      Account_Name: "Metro Grounds",
      Amount: "16300",
      Owner: "Dan Nelson",
      Created_Time: "2025-11-20T12:00:00-05:00",
    },
  },
];

function matchesCustomView(record: BidRecord, customViewId: string | null) {
  if (!customViewId || customViewId === BIDS_STATIC_ALL_VIEW_ID) return true;
  const status = (record.fields.Status ?? "").trim().toLowerCase();
  if (customViewId === "bids-submitted") return status === "submitted";
  if (customViewId === "bids-awarded") return status === "awarded";
  return true;
}

function matchesFieldSelections(
  record: BidRecord,
  selections: ContractFieldFilterSelection[],
) {
  if (selections.length === 0) return true;
  for (const selection of selections) {
    const fieldValue = (record.fields[selection.apiName] ?? "").trim();
    const values = selection.values.map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) continue;
    const normalized = values.map((v) => v.toLowerCase());
    if (!normalized.includes(fieldValue.toLowerCase())) return false;
  }
  return true;
}

export function filterStaticBidRecords(
  records: BidRecord[],
  {
    fieldSelections = [],
    customViewId = null,
  }: {
    fieldSelections?: ContractFieldFilterSelection[];
    customViewId?: string | null;
  },
) {
  return records.filter(
    (record) =>
      matchesCustomView(record, customViewId) &&
      matchesFieldSelections(record, fieldSelections),
  );
}

export function getBidsOfflineFilterMeta() {
  return {
    sections: BIDS_STATIC_FILTER_SECTIONS,
    fields: BIDS_STATIC_FILTER_FIELDS,
    source: "offline-demo" as const,
  };
}

export function buildOfflineBidsListResponse({
  page,
  perPage,
  visibleApiNames,
}: {
  page: number;
  perPage: number;
  visibleApiNames: string[];
}) {
  const staticRows = BIDS_STATIC_RECORDS.map((r) => ({
    id: r.id,
    fields: Object.fromEntries(
      visibleApiNames.map((name) => [name, r.fields[name] ?? ""]),
    ),
    lookups: r.lookups,
  }));

  const start = (page - 1) * perPage;
  const slice = staticRows.slice(start, start + perPage);

  return {
    records: slice,
    totalCount: staticRows.length,
    loadedCount: slice.length,
    page,
    perPage,
    hasMore: start + perPage < staticRows.length,
    visibleFields: visibleApiNames,
    criteria: null,
    cvid: null,
    filtered: false,
    offlineDemo: true,
  };
}
