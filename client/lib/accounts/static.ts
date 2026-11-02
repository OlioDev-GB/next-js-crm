import type {
  ContractFieldFilterSelection,
  ContractFilterFieldMeta,
  ContractFilterSection,
} from "@/lib/contracts/filterTypes";
import type { AccountRecord } from "@/lib/accounts/columns";

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

const TYPE_OPTIONS = [
  { value: "Client", label: "Client" },
  { value: "Site", label: "Site" },
  { value: "Prospect", label: "Prospect" },
];

const staticFieldFilters: ContractFilterFieldMeta[] = [
  picklistField("Account_Type", "Account Type", TYPE_OPTIONS),
  picklistField("Billing_State", "Billing State", [
    { value: "MN", label: "MN" },
    { value: "VA", label: "VA" },
    { value: "AZ", label: "AZ" },
    { value: "PA", label: "PA" },
  ]),
];

const staticSystemViews: ContractFilterFieldMeta[] = [
  {
    apiName: "__custom_view__accounts-all",
    label: "All Client/Sites",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "accounts-all",
  },
  {
    apiName: "__custom_view__accounts-active",
    label: "Clients",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "accounts-active",
  },
  {
    apiName: "__custom_view__accounts-inactive",
    label: "Sites",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "accounts-inactive",
  },
];

export const ACCOUNTS_STATIC_ALL_VIEW_ID = "accounts-all";

export const ACCOUNTS_STATIC_FILTER_SECTIONS: ContractFilterSection[] = [
  { id: "system_defined", title: "System Defined Filters", fields: staticSystemViews },
  { id: "fields", title: "Filter By Fields", fields: staticFieldFilters },
];

export const ACCOUNTS_STATIC_FILTER_FIELDS: ContractFilterFieldMeta[] = [
  ...staticSystemViews,
  ...staticFieldFilters,
];

export const ACCOUNTS_STATIC_RECORDS: AccountRecord[] = [
  {
    id: "static-account-1001",
    fields: {
      Account_Name: "Downtown Plaza",
      Account_Type: "Site",
      Phone: "(612) 555-0142",
      Website: "https://downtownplaza.example",
      Billing_City: "Minneapolis",
      Billing_State: "MN",
      Owner: "Gabriel Brent",
      Created_Time: "2025-10-01T12:00:00-05:00",
    },
  },
  {
    id: "static-account-1002",
    fields: {
      Account_Name: "Standard Solar",
      Account_Type: "Client",
      Phone: "(703) 555-0198",
      Website: "https://standardsolar.example",
      Billing_City: "Arlington",
      Billing_State: "VA",
      Owner: "Olio Group",
      Created_Time: "2025-10-12T12:00:00-05:00",
    },
  },
  {
    id: "static-account-1003",
    fields: {
      Account_Name: "Tempe Lot B",
      Account_Type: "Site",
      Phone: "(480) 555-0100",
      Website: "",
      Billing_City: "Tempe",
      Billing_State: "AZ",
      Owner: "Jake Bednar",
      Created_Time: "2025-11-01T12:00:00-05:00",
    },
  },
  {
    id: "static-account-1004",
    fields: {
      Account_Name: "Carvana",
      Account_Type: "Client",
      Phone: "(480) 555-0111",
      Website: "https://carvana.example",
      Billing_City: "Tempe",
      Billing_State: "AZ",
      Owner: "Jim Bjorgaard",
      Created_Time: "2025-09-15T12:00:00-05:00",
    },
  },
  {
    id: "static-account-1005",
    fields: {
      Account_Name: "Philly Depot",
      Account_Type: "Site",
      Phone: "(215) 555-0188",
      Website: "",
      Billing_City: "Philadelphia",
      Billing_State: "PA",
      Owner: "Dan Nelson",
      Created_Time: "2025-11-20T12:00:00-05:00",
    },
  },
];

function matchesCustomView(record: AccountRecord, customViewId: string | null) {
  if (!customViewId || customViewId === ACCOUNTS_STATIC_ALL_VIEW_ID) return true;
  const type = (record.fields.Account_Type ?? "").trim().toLowerCase();
  if (customViewId === "accounts-active") return type === "client";
  if (customViewId === "accounts-inactive") return type === "site";
  return true;
}

function matchesFieldSelections(
  record: AccountRecord,
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

export function filterStaticAccountRecords(
  records: AccountRecord[],
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

export function getAccountsOfflineFilterMeta() {
  return {
    sections: ACCOUNTS_STATIC_FILTER_SECTIONS,
    fields: ACCOUNTS_STATIC_FILTER_FIELDS,
    source: "offline-demo" as const,
  };
}

export function buildOfflineAccountsListResponse({
  page,
  perPage,
  visibleApiNames,
}: {
  page: number;
  perPage: number;
  visibleApiNames: string[];
}) {
  const staticRows = ACCOUNTS_STATIC_RECORDS.map((r) => ({
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
