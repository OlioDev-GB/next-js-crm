import { formatFieldValue } from "@/lib/zoho";
import { formatVendorDetailDate } from "@/lib/vendors/recordDetail";

export type VendorRelatedKind =
  | "contracts"
  | "bids"
  | "service-completions"
  | "sow"
  | "vendor-invoices";

export type VendorContractRow = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

export type VendorBidRow = {
  id: string;
  bidNumber: string;
  owner: string;
  createdBy: string;
  siteNumber: string;
};

export type VendorServiceCompletionRow = {
  id: string;
  name: string;
  status: string;
};

export type VendorSowRow = {
  id: string;
  name: string;
  stage: string;
  startDate: string;
  endDate: string;
};

export type VendorInvoiceRow = {
  id: string;
  name: string;
  status: string;
};

function lookupName(raw: unknown): string {
  return formatFieldValue(raw) || "";
}

export function mapVendorContractRows(rows: unknown[]): VendorContractRow[] {
  return rows.map((row, i) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `c-${i}`,
      name: lookupName(item.Name) || "-",
      status: lookupName(item.Status) || "-",
      startDate: formatVendorDetailDate(
        item.Start_Date != null ? String(item.Start_Date) : "",
      ),
      endDate: formatVendorDetailDate(
        item.End_Date != null ? String(item.End_Date) : "",
      ),
    };
  });
}

export function mapVendorBidRows(rows: unknown[]): VendorBidRow[] {
  return rows.map((row, i) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `b-${i}`,
      bidNumber: lookupName(item.Name) || "-",
      owner: lookupName(item.Owner) || "-",
      createdBy: lookupName(item.Created_By) || "-",
      siteNumber:
        lookupName(item.Site_Number) ||
        lookupName(item.Account_Name) ||
        lookupName(item.Location_Name) ||
        "-",
    };
  });
}

export function mapVendorServiceCompletionRows(
  rows: unknown[],
): VendorServiceCompletionRow[] {
  return rows.map((row, i) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `sc-${i}`,
      name: lookupName(item.Name) || "-",
      status: lookupName(item.Status) || "-",
    };
  });
}

export function mapVendorSowRows(rows: unknown[]): VendorSowRow[] {
  return rows.map((row, i) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `sow-${i}`,
      name: lookupName(item.Deal_Name) || lookupName(item.SOWID) || "-",
      stage: lookupName(item.Stage) || "-",
      startDate: formatVendorDetailDate(
        item.Start_Date != null ? String(item.Start_Date) : "",
      ),
      endDate: formatVendorDetailDate(
        item.End_Date != null ? String(item.End_Date) : "",
      ),
    };
  });
}

export function mapVendorInvoiceRows(rows: unknown[]): VendorInvoiceRow[] {
  return rows.map((row, i) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : `vi-${i}`,
      name: lookupName(item.Name) || "-",
      status: lookupName(item.Status) || "-",
    };
  });
}

export function getStaticVendorRelated(kind: VendorRelatedKind, recordId: string) {
  if (kind === "bids") {
    return {
      bids: [
        {
          id: `${recordId}-bid-1`,
          bidNumber: "7203",
          owner: "Dan Nelson",
          createdBy: "Dan Nelson",
          siteNumber: "PepsiCo Beve Sales-PBS553",
        } satisfies VendorBidRow,
      ],
    };
  }
  if (kind === "contracts") return { contracts: [] as VendorContractRow[] };
  if (kind === "service-completions") {
    return { serviceCompletions: [] as VendorServiceCompletionRow[] };
  }
  if (kind === "sow") return { sows: [] as VendorSowRow[] };
  return { vendorInvoices: [] as VendorInvoiceRow[] };
}
