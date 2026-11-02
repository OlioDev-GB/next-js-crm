import type {
  ContractFieldFilterSelection,
  ContractFilterFieldMeta,
  ContractFilterSection,
} from "@/lib/contracts/filterTypes";
import type { VendorInvoiceRecord } from "@/lib/vendor-invoices/columns";

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
  { value: "Open", label: "Open" },
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Cancelled", label: "Cancelled" },
];

const staticFieldFilters: ContractFilterFieldMeta[] = [
  picklistField("Status", "Status", STATUS_OPTIONS),
  picklistField("Month_of_Service", "Month of Service", [
    { value: "January", label: "January" },
    { value: "February", label: "February" },
    { value: "March", label: "March" },
  ]),
];

const staticSystemViews: ContractFilterFieldMeta[] = [
  {
    apiName: "__custom_view__vendor-invoices-all",
    label: "All Vendor Invoices",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "vendor-invoices-all",
  },
  {
    apiName: "__custom_view__vendor-invoices-open",
    label: "Open",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "vendor-invoices-open",
  },
  {
    apiName: "__custom_view__vendor-invoices-paid",
    label: "Paid",
    dataType: "custom_view",
    operators: [],
    options: [],
    hasOptions: true,
    section: "system_defined",
    customViewId: "vendor-invoices-paid",
  },
];

export const VENDOR_INVOICES_STATIC_ALL_VIEW_ID = "vendor-invoices-all";

export const VENDOR_INVOICES_STATIC_FILTER_SECTIONS: ContractFilterSection[] = [
  { id: "system_defined", title: "System Defined Filters", fields: staticSystemViews },
  { id: "fields", title: "Filter By Fields", fields: staticFieldFilters },
];

export const VENDOR_INVOICES_STATIC_FILTER_FIELDS: ContractFilterFieldMeta[] = [
  ...staticSystemViews,
  ...staticFieldFilters,
];

export const VENDOR_INVOICES_STATIC_RECORDS: VendorInvoiceRecord[] = [
  {
    id: "static-vendor-invoice-1001",
    fields: {
      Name: "INV-1001-2025-10",
      Status: "Open",
      Vendor: "Metro Grounds LLC",
      Vendor_Contract: "CTR-2401",
      Site: "Downtown Plaza",
      Month_of_Service: "October",
      Year_of_Service: "2025",
      Owner: "Gabriel Brent",
    },
  },
  {
    id: "static-vendor-invoice-1002",
    fields: {
      Name: "INV-1002-2025-10",
      Status: "Paid",
      Vendor: "Test-Standard Solar",
      Vendor_Contract: "CTR-2402",
      Site: "Arlington HQ",
      Month_of_Service: "October",
      Year_of_Service: "2025",
      Owner: "Olio Group",
    },
  },
  {
    id: "static-vendor-invoice-1003",
    fields: {
      Name: "INV-1003-2025-11",
      Status: "Pending",
      Vendor: "Carvana Fleet Services",
      Vendor_Contract: "CTR-2403",
      Site: "Tempe Lot B",
      Month_of_Service: "November",
      Year_of_Service: "2025",
      Owner: "Jake Bednar",
    },
  },
  {
    id: "static-vendor-invoice-1004",
    fields: {
      Name: "INV-1004-2025-09",
      Status: "Cancelled",
      Vendor: "A+ Plus Power Wash Inc",
      Vendor_Contract: "CTR-2404",
      Site: "Scranton Yard",
      Month_of_Service: "September",
      Year_of_Service: "2025",
      Owner: "Jim Bjorgaard",
    },
  },
  {
    id: "static-vendor-invoice-1005",
    fields: {
      Name: "INV-1005-2025-11",
      Status: "Open",
      Vendor: "Metro Grounds LLC",
      Vendor_Contract: "CTR-2405",
      Site: "Philly Depot",
      Month_of_Service: "November",
      Year_of_Service: "2025",
      Owner: "Dan Nelson",
    },
  },
];

function matchesCustomView(record: VendorInvoiceRecord, customViewId: string | null) {
  if (!customViewId || customViewId === VENDOR_INVOICES_STATIC_ALL_VIEW_ID) {
    return true;
  }
  const status = (record.fields.Status ?? "").trim().toLowerCase();
  if (customViewId === "vendor-invoices-open") return status === "open";
  if (customViewId === "vendor-invoices-paid") return status === "paid";
  return true;
}

function matchesFieldSelections(
  record: VendorInvoiceRecord,
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

export function filterStaticVendorInvoiceRecords(
  records: VendorInvoiceRecord[],
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

export function getVendorInvoicesOfflineFilterMeta() {
  return {
    sections: VENDOR_INVOICES_STATIC_FILTER_SECTIONS,
    fields: VENDOR_INVOICES_STATIC_FILTER_FIELDS,
    source: "offline-demo" as const,
  };
}

export function buildOfflineVendorInvoicesListResponse({
  page,
  perPage,
  visibleApiNames,
}: {
  page: number;
  perPage: number;
  visibleApiNames: string[];
}) {
  const staticRows = VENDOR_INVOICES_STATIC_RECORDS.map((r) => ({
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
