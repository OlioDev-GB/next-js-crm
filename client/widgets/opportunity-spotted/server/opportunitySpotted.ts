/**
 * Opportunity Spotted Stage — Zoho CRM helpers for the HTML widget shim.
 */

import { fetchZohoJson, ZOHO_CRM_BASE } from "@/lib/zoho";

function detailOf(
  row: Record<string, unknown> | null | undefined,
  body: Record<string, unknown>,
  status: number,
) {
  return String(
    row?.message ||
      body?.message ||
      row?.code ||
      body?.code ||
      `HTTP ${status}`,
  );
}

export async function loadDealRecord(recordId: string) {
  const id = String(recordId || "").trim();
  if (!id) throw new Error("Record id is required.");

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/Deals/${encodeURIComponent(id)}?fields=${encodeURIComponent("id,Deal_Name,SOWID,Stage")}`,
  );
  if (!res.ok) {
    throw new Error(detailOf(null, body as Record<string, unknown>, res.status));
  }
  return body;
}

export async function updateDealStage(args: {
  recordId: string;
  stage: string;
  trigger?: string[];
}) {
  const id = String(args.recordId || "").trim();
  const stage = String(args.stage || "").trim();
  if (!id) throw new Error("Record id is required.");
  if (!stage) throw new Error("Stage is required.");

  const payload: Record<string, unknown> = {
    data: [{ id, Stage: stage }],
  };
  if (Array.isArray(args.trigger)) {
    payload.trigger = args.trigger;
  }

  const { res, body } = await fetchZohoJson(`${ZOHO_CRM_BASE}/Deals`, {
    method: "PUT",
    body: payload,
  });

  const row = Array.isArray(body?.data) ? body.data[0] : null;
  if (!res.ok || (row && row.code && row.code !== "SUCCESS")) {
    throw new Error(
      detailOf(
        row as Record<string, unknown> | null,
        body as Record<string, unknown>,
        res.status,
      ),
    );
  }
  return body;
}
