/**
 * Send SOW — Zoho CRM helpers for the HTML widget shim
 * (port of sow_sourcing_stage / "sow sourcing status").
 */

import {
  executeZohoCrmFunction,
  fetchZohoJson,
  getZohoAccessToken,
  invalidateZohoAccessTokenCache,
  isZohoTokenExpiredResponse,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";

const ALLOWED_MODULES = new Set(["Deals", "Accounts", "Vendors"]);
const ALLOWED_FUNCTIONS = new Set([
  "get_sow_details",
  "search_all_vendors",
  "sendSOWEmailToVendors",
]);

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

function assertModule(moduleName: string) {
  if (!ALLOWED_MODULES.has(moduleName)) {
    throw new Error(`Module not allowed: ${moduleName}`);
  }
}

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

export async function uploadFileToZoho(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}) {
  async function post(token: string) {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Uint8Array.from(file.bytes)], {
        type: file.type || "application/octet-stream",
      }),
      file.name || "attachment",
    );
    const res = await fetch(`${ZOHO_CRM_BASE}/files`, {
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
  const fileId = String(row?.details?.id ?? row?.id ?? "").trim();
  if (!result.res.ok || !fileId) {
    throw new Error(
      detailOf(
        row as Record<string, unknown> | null,
        result.body as Record<string, unknown>,
        result.res.status,
      ),
    );
  }

  // Match Zoho Embedded SDK uploadFile shape used by sow_widget.js
  return {
    data: [
      {
        code: "SUCCESS",
        details: { id: fileId, ...(row?.details || {}) },
        message: "File uploaded successfully",
        status: "success",
      },
    ],
  };
}

export async function executeSendSowFunction(
  functionName: string,
  argsJson: string | Record<string, unknown>,
) {
  const name = String(functionName || "").trim();
  if (!ALLOWED_FUNCTIONS.has(name)) {
    throw new Error(`Function not allowed: ${name || "(none)"}`);
  }

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

  const { res, body } = await executeZohoCrmFunction(name, parsed, {
    authType: "apikey",
  });

  if (!res.ok) {
    throw new Error(
      detailOf(null, body as Record<string, unknown>, res.status) ||
        `Function ${name} failed`,
    );
  }

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
