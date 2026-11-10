import type {
  ContractFieldFilterSelection,
  ContractFilterFieldMeta,
  ContractFilterSection,
} from "@/lib/contracts/filterTypes";
import type { ServiceCompletionRecord } from "@/lib/service-completions/columns";

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
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const staticFieldFilters: ContractFilterFieldMeta[] = [
  picklistField("Status", "Status", STATUS_OPTIONS),
  picklistField("Location_State", "Location State", [
    { value: "MN", label: "MN" },
    { value: "VA", label: "VA" },
    { value: "AZ", label: "AZ" },
    { value: "PA", label: "PA" },
  ]),
];

const staticSystemViews: ContractFilterFieldMeta[] = [
  {
    apiName: "__custom_view__service-completions-all",
    label: "All service completions",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "service-completions-all",
  },
  {
    apiName: "__custom_view__service-completions-completed",
    label: "Completed",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "service-completions-completed",
  },
  {
    apiName: "__custom_view__service-completions-in-progress",
    label: "In Progress",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "service-completions-in-progress",
  },
];

export const SERVICE_COMPLETIONS_STATIC_ALL_VIEW_ID = "service-completions-all";

/** SC subform filters: Photos / Media only (no child fields). */
const staticSubformFilters: ContractFilterFieldMeta[] = [
  {
    apiName: "Media",
    label: "Media",
    dataType: "related_module",
    operators: [
      { id: "with", label: "with" },
      { id: "without", label: "without" },
    ],
    options: [],
    hasOptions: false,
    section: "subforms",
    lookupModule: "Media",
  },
  {
    apiName: "Photos",
    label: "Photos",
    dataType: "related_module",
    operators: [
      { id: "with", label: "with" },
      { id: "without", label: "without" },
    ],
    options: [],
    hasOptions: false,
    section: "subforms",
    lookupModule: "Photos",
  },
];

export const SERVICE_COMPLETIONS_STATIC_FILTER_SECTIONS: ContractFilterSection[] = [
  { id: "system_defined", title: "System Defined Filters", fields: staticSystemViews },
  { id: "fields", title: "Filter By Fields", fields: staticFieldFilters },
  { id: "subforms", title: "Filter By Subforms", fields: staticSubformFilters },
];

export const SERVICE_COMPLETIONS_STATIC_FILTER_FIELDS: ContractFilterFieldMeta[] = [
  ...staticSystemViews,
  ...staticFieldFilters,
  ...staticSubformFilters,
];

export const SERVICE_COMPLETIONS_STATIC_RECORDS: ServiceCompletionRecord[] = [
  {
    id: "static-sc-1001",
    fields: {
      Name: "SC-1001 Minneapolis Site",
      Status: "In Progress",
      Contract: "CTR-2401",
      Vendor: "Metro Grounds LLC",
      Site_Number: "SITE-MN-01",
      Location_Name: "Downtown Plaza",
      Location_City: "Minneapolis",
      Location_State: "MN",
      Owner: "Gabriel Brent",
    },
  },
  {
    id: "static-sc-1002",
    fields: {
      Name: "SC-1002 Arlington Roof",
      Status: "Completed",
      Contract: "CTR-2402",
      Vendor: "Test-Standard Solar",
      Site_Number: "SITE-VA-12",
      Location_Name: "Arlington HQ",
      Location_City: "Arlington",
      Location_State: "VA",
      Owner: "Olio Group",
    },
  },
  {
    id: "static-sc-1003",
    fields: {
      Name: "SC-1003 Tempe Lot",
      Status: "Draft",
      Contract: "CTR-2403",
      Vendor: "Carvana Fleet Services",
      Site_Number: "SITE-AZ-07",
      Location_Name: "Tempe Lot B",
      Location_City: "Tempe",
      Location_State: "AZ",
      Owner: "Jake Bednar",
    },
  },
  {
    id: "static-sc-1004",
    fields: {
      Name: "SC-1004 Scranton Wash",
      Status: "Cancelled",
      Contract: "CTR-2404",
      Vendor: "A+ Plus Power Wash Inc",
      Site_Number: "SITE-PA-03",
      Location_Name: "Scranton Yard",
      Location_City: "Scranton",
      Location_State: "PA",
      Owner: "Jim Bjorgaard",
    },
  },
  {
    id: "static-sc-1005",
    fields: {
      Name: "SC-1005 Philly Grounds",
      Status: "In Progress",
      Contract: "CTR-2405",
      Vendor: "Metro Grounds LLC",
      Site_Number: "SITE-PA-19",
      Location_Name: "Philly Depot",
      Location_City: "Philadelphia",
      Location_State: "PA",
      Owner: "Dan Nelson",
    },
  },
];

function matchesCustomView(record: ServiceCompletionRecord, customViewId: string | null) {
  if (!customViewId || customViewId === SERVICE_COMPLETIONS_STATIC_ALL_VIEW_ID) {
    return true;
  }
  const status = (record.fields.Status ?? "").trim().toLowerCase();
  if (customViewId === "service-completions-completed") return status === "completed";
  if (customViewId === "service-completions-in-progress") {
    return status === "in progress";
  }
  return true;
}

function matchesFieldSelections(
  record: ServiceCompletionRecord,
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

export function filterStaticServiceCompletionRecords(
  records: ServiceCompletionRecord[],
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

export function getServiceCompletionsOfflineFilterMeta() {
  return {
    sections: SERVICE_COMPLETIONS_STATIC_FILTER_SECTIONS,
    fields: SERVICE_COMPLETIONS_STATIC_FILTER_FIELDS,
    source: "offline-demo" as const,
  };
}

export function buildOfflineServiceCompletionsListResponse({
  page,
  perPage,
  visibleApiNames,
}: {
  page: number;
  perPage: number;
  visibleApiNames: string[];
}) {
  const staticRows = SERVICE_COMPLETIONS_STATIC_RECORDS.map((r) => ({
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
