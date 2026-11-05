import { NextResponse } from "next/server";
import { ZOHO_SOW_MODULE } from "@/lib/sow/columns";
import { getStaticSowDetail } from "@/lib/sow/recordDetail";
import {
  getStaticRelatedPayload,
  mapBidRelatedRows,
  mapContractRelatedRows,
  mapEmailRelatedRows,
  mapNoteRelatedRows,
  mapTimelineEntries,
} from "@/lib/sow/related";
import { fetchZohoJson, ZOHO_CRM_BASE, ZOHO_CRM_V8_BASE } from "@/lib/zoho";

const RELATED_PATHS = {
  bids: {
    list: "Bids",
    fields:
      "Name,Vendor,Selected_Bid,Bid_Summary,Bid_Notes,Olio_Ops_Owner,Last_Activity_Time,URL,Bid_Docs_URL,Supporting_Docs_URL,id",
  },
  contracts: {
    list: "SOW",
    fields: "Name,Status,Vendor,Account_Name,Start_Date,End_Date,id",
  },
  notes: {
    list: "Notes",
    fields: "Note_Title,Note_Content,Created_Time,Modified_Time,Created_By,Owner,id",
  },
  emails: {
    list: "Emails",
    fields: "Subject,Status,Sent_On,From,To,id",
  },
};

function extractRelatedRows(body, listApiName) {
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body[listApiName])) return body[listApiName];
  if (Array.isArray(body.Emails)) return body.Emails;
  if (Array.isArray(body.Notes)) return body.Notes;
  return [];
}

/**
 * GET /api/sow/[id]/related?kind=bids|contracts|notes|emails|timeline
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

  if (!["bids", "contracts", "notes", "emails", "timeline"].includes(kind)) {
    return NextResponse.json(
      { error: "Invalid kind. Use bids, contracts, notes, emails, or timeline." },
      { status: 400 },
    );
  }

  if (getStaticSowDetail(recordId)) {
    return NextResponse.json({
      kind,
      offlineDemo: true,
      ...getStaticRelatedPayload(kind, recordId),
    });
  }

  try {
    if (kind === "timeline") {
      const url =
        `${ZOHO_CRM_V8_BASE}/${encodeURIComponent(ZOHO_SOW_MODULE)}/` +
        `${encodeURIComponent(recordId)}/__timeline?per_page=50`;
      const { res, body } = await fetchZohoJson(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: "Failed to load timeline", details: body },
          { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
        );
      }
      const rows = Array.isArray(body.__timeline) ? body.__timeline : [];
      return NextResponse.json({
        kind,
        timeline: mapTimelineEntries(rows),
        offlineDemo: false,
      });
    }

    const config = RELATED_PATHS[kind];
    const url =
      `${ZOHO_CRM_BASE}/${encodeURIComponent(ZOHO_SOW_MODULE)}/` +
      `${encodeURIComponent(recordId)}/${encodeURIComponent(config.list)}` +
      `?fields=${encodeURIComponent(config.fields)}&per_page=100`;

    const { res, body } = await fetchZohoJson(url);

    if (res.status === 204) {
      return NextResponse.json({
        kind,
        offlineDemo: false,
        ...(kind === "bids" ? { bids: [] }
        : kind === "contracts" ? { contracts: [] }
        : kind === "notes" ? { notes: [] }
        : { emails: [] }),
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to load ${kind}`, details: body },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }

    const rows = extractRelatedRows(body, config.list);

    if (kind === "bids") {
      return NextResponse.json({
        kind,
        bids: mapBidRelatedRows(rows),
        offlineDemo: false,
      });
    }
    if (kind === "contracts") {
      return NextResponse.json({
        kind,
        contracts: mapContractRelatedRows(rows),
        offlineDemo: false,
      });
    }
    if (kind === "notes") {
      return NextResponse.json({
        kind,
        notes: mapNoteRelatedRows(rows),
        offlineDemo: false,
      });
    }
    return NextResponse.json({
      kind,
      emails: mapEmailRelatedRows(rows),
      offlineDemo: false,
    });
  } catch (err) {
    console.error(`Zoho SOW related (${kind}) failed:`, err);
    return NextResponse.json(
      {
        error: `Failed to load ${kind}`,
        details: err?.details ?? (err instanceof Error ? err.message : null),
      },
      { status: 502 },
    );
  }
}

/**
 * POST /api/sow/[id]/related?kind=notes
 * Create a note on the SOW record.
 */
export async function POST(request, context) {
  const params = await context.params;
  const recordId = String(params?.id ?? "").trim();
  const kind = String(new URL(request.url).searchParams.get("kind") ?? "")
    .trim()
    .toLowerCase();

  if (!recordId) {
    return NextResponse.json({ error: "Missing record id" }, { status: 400 });
  }
  if (kind !== "notes") {
    return NextResponse.json(
      { error: "Only notes creation is supported" },
      { status: 400 },
    );
  }
  if (getStaticSowDetail(recordId)) {
    return NextResponse.json(
      { error: "Cannot create notes on offline demo records" },
      { status: 400 },
    );
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const title = String(payload.title ?? "").trim();
  const content = String(payload.content ?? "").trim();
  if (!title && !content) {
    return NextResponse.json(
      { error: "Title or note content is required" },
      { status: 400 },
    );
  }

  try {
    const url = `${ZOHO_CRM_BASE}/Notes`;
    const { res, body } = await fetchZohoJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            Note_Title: title || undefined,
            Note_Content: content || title,
            Parent_Id: {
              id: recordId,
              module: { api_name: ZOHO_SOW_MODULE },
            },
            se_module: ZOHO_SOW_MODULE,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create note", details: body },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }

    return NextResponse.json({ ok: true, details: body });
  } catch (err) {
    console.error("Zoho SOW note create failed:", err);
    return NextResponse.json(
      {
        error: "Failed to create note",
        details: err?.details ?? (err instanceof Error ? err.message : null),
      },
      { status: 502 },
    );
  }
}
