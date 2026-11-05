import { NextResponse } from "next/server";
import {
  getVendorFieldDisplayValue,
  ZOHO_VENDORS_MODULE,
} from "@/lib/vendors/columns";
import {
  getStaticVendorDetail,
  mapZohoVendorDetail,
  VENDOR_DETAIL_FIELD_API_NAMES,
} from "@/lib/vendors/recordDetail";
import { fetchZohoRecordById, mapZohoRecord } from "@/lib/zoho";

/**
 * GET /api/vendors/[id]
 * Single Vendor record for the in-app Vendor Overview canvas.
 */
export async function GET(_request, context) {
  const params = await context.params;
  const recordId = String(params?.id ?? "").trim();

  if (!recordId) {
    return NextResponse.json({ error: "Missing record id" }, { status: 400 });
  }

  const staticDetail = getStaticVendorDetail(recordId);
  if (staticDetail) {
    return NextResponse.json({ record: staticDetail, offlineDemo: true });
  }

  try {
    const apiNames = [...VENDOR_DETAIL_FIELD_API_NAMES];
    const row = await fetchZohoRecordById(ZOHO_VENDORS_MODULE, recordId, apiNames);
    const mapped = mapZohoRecord(row, apiNames);
    const fields = {};
    for (const apiName of apiNames) {
      fields[apiName] = getVendorFieldDisplayValue(mapped.fields, apiName);
    }

    const record = mapZohoVendorDetail(row, {
      id: mapped.id || recordId,
      fields,
      lookups: mapped.lookups,
    });

    return NextResponse.json({ record, offlineDemo: false });
  } catch (err) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 502;

    if (status === 404) {
      return NextResponse.json({ error: "Vendor record not found" }, { status: 404 });
    }

    console.error("Zoho Vendor detail failed:", err);
    return NextResponse.json(
      {
        error: "Failed to load vendor record",
        details: err?.details ?? (err instanceof Error ? err.message : null),
      },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
