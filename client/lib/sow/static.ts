import type {
  ContractFieldFilterSelection,
  ContractFilterFieldMeta,
  ContractFilterSection,
} from "@/lib/contracts/filterTypes";
import type { SowRecord } from "@/lib/sow/columns";

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

const STAGE_OPTIONS = [
  { value: "Sourcing Vendor", label: "Sourcing Vendor" },
  { value: "Vendor Awarded", label: "Vendor Awarded" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

const staticFieldFilters: ContractFilterFieldMeta[] = [
  picklistField("Stage", "Stage", STAGE_OPTIONS),
  picklistField("Pipeline", "Pipeline", [
    { value: "Scope of Work", label: "Scope of Work" },
  ]),
  picklistField("Contract_Term", "Contract Term", [
    { value: "New", label: "New" },
    { value: "Renewal", label: "Renewal" },
  ]),
];

const staticSystemViews: ContractFilterFieldMeta[] = [
  {
    apiName: "__custom_view__sow-all",
    label: "All SOWs",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "sow-all",
  },
  {
    apiName: "__custom_view__sow-in-progress",
    label: "In Progress",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "sow-in-progress",
  },
  {
    apiName: "__custom_view__sow-completed",
    label: "Completed",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "sow-completed",
  },
];

export const SOW_STATIC_ALL_VIEW_ID = "sow-all";

/** SOW subform filters: POs / Scope of Work only (no child fields). */
const staticSubformFilters: ContractFilterFieldMeta[] = [
  {
    apiName: "POs",
    label: "POs",
    dataType: "related_module",
    operators: [
      { id: "with", label: "with" },
      { id: "without", label: "without" },
    ],
    options: [],
    hasOptions: false,
    section: "subforms",
    lookupModule: "POs",
  },
  {
    apiName: "Scope_of_Work",
    label: "Scope of Work",
    dataType: "related_module",
    operators: [
      { id: "with", label: "with" },
      { id: "without", label: "without" },
    ],
    options: [],
    hasOptions: false,
    section: "subforms",
    lookupModule: "Scope_of_Work",
  },
];

export const SOW_STATIC_FILTER_SECTIONS: ContractFilterSection[] = [
  { id: "system_defined", title: "System Defined Filters", fields: staticSystemViews },
  { id: "fields", title: "Filter By Fields", fields: staticFieldFilters },
  { id: "subforms", title: "Filter By Subforms", fields: staticSubformFilters },
];

export const SOW_STATIC_FILTER_FIELDS: ContractFilterFieldMeta[] = [
  ...staticSystemViews,
  ...staticFieldFilters,
  ...staticSubformFilters,
];

export const SOW_STATIC_RECORDS: SowRecord[] = [
  {
    id: "static-sow-1001",
    fields: {
      Deal_Name: "SOW30073",
      Stage: "Sourcing Vendor",
      Pipeline: "Scope of Work",
      Account_Name: "Olio Group",
      Company_Name: "Downtown Plaza",
      Location_Name: "Minneapolis Site",
      Start_Date: "2025-10-01",
      End_Date: "2026-09-30",
      Owner: "Gabriel Brent",
    },
  },
  {
    id: "static-sow-1002",
    fields: {
      Deal_Name: "SOW30112",
      Stage: "In Progress",
      Pipeline: "Scope of Work",
      Account_Name: "Standard Solar",
      Company_Name: "Arlington HQ",
      Location_Name: "Arlington Roof",
      Start_Date: "2025-11-01",
      End_Date: "2026-10-31",
      Owner: "Olio Group",
    },
  },
  {
    id: "static-sow-1003",
    fields: {
      Deal_Name: "SOW30155",
      Stage: "Vendor Awarded",
      Pipeline: "Scope of Work",
      Account_Name: "Carvana",
      Company_Name: "Tempe Lot B",
      Location_Name: "Tempe Lot",
      Start_Date: "2026-01-01",
      End_Date: "2026-12-31",
      Owner: "Jake Bednar",
    },
  },
  {
    id: "static-sow-1004",
    fields: {
      Deal_Name: "SOW30201",
      Stage: "Completed",
      Pipeline: "Scope of Work",
      Account_Name: "A+ Plus Power Wash",
      Company_Name: "Scranton Yard",
      Location_Name: "Scranton Wash",
      Start_Date: "2024-10-01",
      End_Date: "2025-09-30",
      Owner: "Jim Bjorgaard",
    },
  },
  {
    id: "static-sow-1005",
    fields: {
      Deal_Name: "SOW30244",
      Stage: "In Progress",
      Pipeline: "Scope of Work",
      Account_Name: "Metro Grounds",
      Company_Name: "Philly Depot",
      Location_Name: "Philadelphia Grounds",
      Start_Date: "2025-12-01",
      End_Date: "2026-11-30",
      Owner: "Dan Nelson",
    },
  },
];

function matchesCustomView(record: SowRecord, customViewId: string | null) {
  if (!customViewId || customViewId === SOW_STATIC_ALL_VIEW_ID) return true;
  const stage = (record.fields.Stage ?? "").trim().toLowerCase();
  if (customViewId === "sow-completed") return stage === "completed";
  if (customViewId === "sow-in-progress") return stage === "in progress";
  return true;
}

function matchesFieldSelections(
  record: SowRecord,
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

export function filterStaticSowRecords(
  records: SowRecord[],
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

export function getSowOfflineFilterMeta() {
  return {
    sections: SOW_STATIC_FILTER_SECTIONS,
    fields: SOW_STATIC_FILTER_FIELDS,
    source: "offline-demo" as const,
  };
}

export function buildOfflineSowListResponse({
  page,
  perPage,
  visibleApiNames,
}: {
  page: number;
  perPage: number;
  visibleApiNames: string[];
}) {
  const staticRows = SOW_STATIC_RECORDS.map((r) => ({
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
