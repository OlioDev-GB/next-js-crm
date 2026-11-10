/**
 * Generate Client Proposal — Zoho CRM helpers for the HTML widget shim.
 */

import {
  executeZohoCrmFunction,
  fetchZohoJson,
  getZohoAccessToken,
  invalidateZohoAccessTokenCache,
  isZohoTokenExpiredResponse,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";

const ALLOWED_MODULES = new Set(["Deals", "Bids", "Tasks"]);
const ALLOWED_RELATED = new Set(["Bids"]);
const ALLOWED_FUNCTIONS = new Set(["read_vendor_proposal"]);

/** Zoho related-list GET requires `fields`. Enough for the bid picker; full bid is loaded separately. */
const RELATED_FIELDS: Record<string, string> = {
  Bids: "id,Name,Bid_ID,Vendor,Selected_Bid",
};

function assertModule(moduleName: string) {
  if (!ALLOWED_MODULES.has(moduleName)) {
    throw new Error(`Module not allowed: ${moduleName}`);
  }
}

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

/** Full record in Zoho SDK shape `{ data: [row] }`. */
export async function loadRecord(moduleName: string, recordId: string) {
  const mod = String(moduleName || "").trim();
  const id = String(recordId || "").trim();
  assertModule(mod);
  if (!id) throw new Error("Record id is required.");

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}/${encodeURIComponent(id)}`,
  );
  if (!res.ok) {
    throw new Error(detailOf(null, body as Record<string, unknown>, res.status));
  }
  return body;
}

export async function loadRelatedRecords(args: {
  moduleName: string;
  recordId: string;
  related: string;
  page?: number;
  perPage?: number;
}) {
  const mod = String(args.moduleName || "").trim();
  const id = String(args.recordId || "").trim();
  const related = String(args.related || "").trim();
  assertModule(mod);
  if (!id) throw new Error("Record id is required.");
  if (!ALLOWED_RELATED.has(related)) {
    throw new Error(`Related list not allowed: ${related}`);
  }

  const page = Math.max(1, Number(args.page) || 1);
  const perPage = Math.min(200, Math.max(1, Number(args.perPage) || 50));
  const fields = RELATED_FIELDS[related] || "id,Name";
  const url =
    `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}/${encodeURIComponent(id)}/` +
    `${encodeURIComponent(related)}?fields=${encodeURIComponent(fields)}` +
    `&page=${page}&per_page=${perPage}`;

  const { res, body } = await fetchZohoJson(url);
  // Empty related list often returns 204 with no body.
  if (res.status === 204) return { data: [] };
  if (!res.ok) {
    throw new Error(detailOf(null, body as Record<string, unknown>, res.status));
  }
  if (!body || !Array.isArray(body.data)) {
    return { data: [] };
  }
  return body;
}

export async function loadCurrentCrmUser() {
  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/users?type=CurrentUser`,
  );
  if (!res.ok) {
    throw new Error(detailOf(null, body as Record<string, unknown>, res.status));
  }
  return body;
}

export async function loadCrmUser(userId: string) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("User id is required.");
  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/users/${encodeURIComponent(id)}`,
  );
  if (!res.ok) {
    throw new Error(detailOf(null, body as Record<string, unknown>, res.status));
  }
  return body;
}

export async function updateCrmRecord(args: {
  moduleName: string;
  apiData: Record<string, unknown>;
  trigger?: string[];
}) {
  const mod = String(args.moduleName || "").trim();
  assertModule(mod);
  const apiData = args.apiData;
  if (!apiData || typeof apiData !== "object" || !apiData.id) {
    throw new Error("APIData.id is required.");
  }

  const payload: Record<string, unknown> = { data: [apiData] };
  if (Array.isArray(args.trigger)) {
    payload.trigger = args.trigger;
  }

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}`,
    { method: "PUT", body: payload },
  );
  if (!res.ok) {
    const row = Array.isArray(body?.data) ? body.data[0] : null;
    throw new Error(
      detailOf(row as Record<string, unknown> | null, body as Record<string, unknown>, res.status),
    );
  }
  return body;
}

export async function insertCrmRecord(args: {
  moduleName: string;
  apiData: Record<string, unknown>;
  trigger?: string[];
}) {
  const mod = String(args.moduleName || "").trim();
  assertModule(mod);
  if (!args.apiData || typeof args.apiData !== "object") {
    throw new Error("APIData is required.");
  }

  const payload: Record<string, unknown> = { data: [args.apiData] };
  if (Array.isArray(args.trigger)) {
    payload.trigger = args.trigger;
  }

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}`,
    { method: "POST", body: payload },
  );
  if (!res.ok) {
    const row = Array.isArray(body?.data) ? body.data[0] : null;
    throw new Error(
      detailOf(row as Record<string, unknown> | null, body as Record<string, unknown>, res.status),
    );
  }
  return body;
}

export async function attachFileToRecord(args: {
  moduleName: string;
  recordId: string;
  fileName: string;
  bytes: Uint8Array;
  contentType?: string;
}) {
  const mod = String(args.moduleName || "").trim();
  const id = String(args.recordId || "").trim();
  assertModule(mod);
  if (!id) throw new Error("Record id is required.");

  async function post(token: string) {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Uint8Array.from(args.bytes)], {
        type: args.contentType || "application/pdf",
      }),
      args.fileName || "proposal.pdf",
    );
    const url =
      `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}/${encodeURIComponent(id)}/Attachments`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      cache: "no-store",
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }

  let token = await getZohoAccessToken();
  let result = await post(token);
  if (isZohoTokenExpiredResponse(result.res, result.body)) {
    invalidateZohoAccessTokenCache();
    token = await getZohoAccessToken({ force: true });
    result = await post(token);
  }

  const row = Array.isArray(result.body?.data) ? result.body.data[0] : null;
  if (!result.res.ok || (row && row.code && row.code !== "SUCCESS")) {
    throw new Error(
      detailOf(
        row as Record<string, unknown> | null,
        result.body as Record<string, unknown>,
        result.res.status,
      ),
    );
  }
  return result.body;
}

export async function executeReadVendorProposal(argsJson: string | Record<string, unknown>) {
  let parsed: Record<string, unknown> = {};
  if (typeof argsJson === "string") {
    try {
      parsed = JSON.parse(argsJson) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid function arguments JSON.");
    }
  } else if (argsJson && typeof argsJson === "object") {
    parsed = argsJson;
  }

  const name = "read_vendor_proposal";
  if (!ALLOWED_FUNCTIONS.has(name)) {
    throw new Error(`Function not allowed: ${name}`);
  }

  const { res, body } = await executeZohoCrmFunction(name, parsed, {
    authType: "apikey",
  });

  if (!res.ok) {
    throw new Error(
      detailOf(null, body as Record<string, unknown>, res.status) ||
        `Function ${name} failed`,
    );
  }

  // Match Zoho Embedded SDK FUNCTIONS.execute response shape.
  return {
    code: body?.code ?? "success",
    status: body?.status ?? "success",
    message: body?.message,
    details: body?.details ?? {
      output:
        typeof body?.output === "string" ?
          body.output
        : JSON.stringify(body?.output ?? body ?? {}),
    },
  };
}
