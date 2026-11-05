import { NextResponse } from "next/server";
import { ZOHO_VENDORS_MODULE } from "@/lib/vendors/columns";
import { getStaticVendorDetail } from "@/lib/vendors/recordDetail";
import {
  getStaticVendorRelated,
  mapVendorBidRows,
  mapVendorContractRows,
  mapVendorInvoiceRows,
  mapVendorServiceCompletionRows,
  mapVendorSowRows,
} from "@/lib/vendors/related";
import { fetchZohoJson, ZOHO_CRM_BASE } from "@/lib/zoho";

const RELATED_PATHS = {
  contracts: {
    list: "Contract",
    fields: "Name,Status,Start_Date,End_Date,id",
    key: "contracts",
    map: mapVendorContractRows,
  },
  bids: {
    list: "Bids",
    fields: "Name,Owner,Created_By,Site_Number,Account_Name,id",
    key: "bids",
    map: mapVendorBidRows,
  },
  "service-completions": {
    list: "Service_Completion",
    fields: "Name,Status,id",
    key: "serviceCompletions",
    map: mapVendorServiceCompletionRows,
  },
  sow: {
    list: "Sow",
    fields: "Deal_Name,SOWID,Stage,Start_Date,End_Date,id",
    key: "sows",
    map: mapVendorSowRows,
  },
  "vendor-invoices": {
    list: "Vendor_Invoice",
    fields: "Name,Status,id",
    key: "vendorInvoices",
    map: mapVendorInvoiceRows,
  },
};

function extractRows(body, listApiName) {
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body[listApiName])) return body[listApiName];
  return [];
}

/**
 * GET /api/vendors/[id]/related?kind=contracts|bids|service-completions|sow|vendor-invoices
 */
export async function GET(request, context) {
  const params = await context.params;
  const recordId = String(params?.id ?? "").trim();
  const kind = String(new URL(request.url).searchParams.get("kind") ?? "")
    .trim()
    .toLowerCase();

  if (!recordId) {
    return NextResponse.json({ error: "Missing record id" }, { status: 400 });
  }

  const config = RELATED_PATHS[kind];
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Invalid kind. Use contracts, bids, service-completions, sow, or vendor-invoices.",
      },
      { status: 400 },
    );
  }

  if (getStaticVendorDetail(recordId)) {
    return NextResponse.json({
      kind,
      offlineDemo: true,
      ...getStaticVendorRelated(kind, recordId),
    });
  }

  try {
    const url =
      `${ZOHO_CRM_BASE}/${encodeURIComponent(ZOHO_VENDORS_MODULE)}/` +
      `${encodeURIComponent(recordId)}/${encodeURIComponent(config.list)}` +
      `?fields=${encodeURIComponent(config.fields)}&per_page=100`;

    const { res, body } = await fetchZohoJson(url);

    if (res.status === 204) {
      return NextResponse.json({
        kind,
        offlineDemo: false,
        [config.key]: [],
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to load ${kind}`, details: body },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }

    const rows = extractRows(body, config.list);
    return NextResponse.json({
      kind,
      offlineDemo: false,
      [config.key]: config.map(rows),
    });
  } catch (err) {
    console.error(`Zoho Vendor related (${kind}) failed:`, err);
    return NextResponse.json(
      {
        error: `Failed to load ${kind}`,
        details: err?.details ?? (err instanceof Error ? err.message : null),
      },
      { status: 502 },
    );
  }
}
