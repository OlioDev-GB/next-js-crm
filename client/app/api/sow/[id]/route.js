import { NextResponse } from "next/server";
import {
  getSowFieldDisplayValue,
  ZOHO_SOW_MODULE,
} from "@/lib/sow/columns";
import {
  getStaticSowDetail,
  mapZohoSowDetail,
  SOW_DETAIL_FIELD_API_NAMES,
} from "@/lib/sow/recordDetail";
import { fetchZohoRecordById, mapZohoRecord } from "@/lib/zoho";

/**
 * GET /api/sow/[id]
 * Single SOW (Deals) record for the in-app detail canvas.
 */
export async function GET(_request, context) {
  const params = await context.params;
  const recordId = String(params?.id ?? "").trim();

  if (!recordId) {
    return NextResponse.json({ error: "Missing record id" }, { status: 400 });
  }

  const staticDetail = getStaticSowDetail(recordId);
  if (staticDetail) {
    return NextResponse.json({ record: staticDetail, offlineDemo: true });
  }

  try {
    const apiNames = [...SOW_DETAIL_FIELD_API_NAMES];
    const row = await fetchZohoRecordById(ZOHO_SOW_MODULE, recordId, apiNames);
    const mapped = mapZohoRecord(row, apiNames);
    const fields = {};
    for (const apiName of apiNames) {
      if (apiName === "Scope_of_Work") continue;
      fields[apiName] = getSowFieldDisplayValue(mapped.fields, apiName);
    }

    const record = mapZohoSowDetail(row, {
      id: mapped.id || recordId,
      fields,
      lookups: mapped.lookups,
    });

    return NextResponse.json({ record, offlineDemo: false });
  } catch (err) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 502;

    if (status === 404) {
      return NextResponse.json({ error: "SOW record not found" }, { status: 404 });
    }

    console.error("Zoho SOW detail failed:", err);
    return NextResponse.json(
      {
        error: "Failed to load SOW record",
        details: err?.details ?? (err instanceof Error ? err.message : null),
      },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
