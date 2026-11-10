/**
 * Create Contract PDF — server helpers (Zoho CRM + Sign function).
 */

import {
  executeZohoCrmFunction,
  fetchZohoJson,
  fetchZohoRecordById,
  getZohoAccessToken,
  invalidateZohoAccessTokenCache,
  isZohoTokenExpiredResponse,
  ZOHO_ACCOUNTS_URL,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";

export const SEND_ZOHO_SIGN_FUNCTION_NAME = "sendzohosigncontracts" as const;
/** SOW Create Contract PDF widget calls this casing. */
export const SEND_ZOHO_SIGN_FUNCTION_NAME_ALT = "SendZohoSignContracts" as const;

const CONTRACT_PDF_FIELDS = [
  "Name",
  "Vendor",
  "Company_Name",
  "Site",
  "Site_Street",
  "Site_City",
  "Site_State",
  "Site_Zip",
  "Location_Name",
  "Contract_Start_Date",
  "Contract_End_Date",
  "Trigger_Point",
  "Salt_Billing_Frequency_and_Type",
  "Snow_Removal_Salt_Area_Inclusions",
  "Site_Open_Time",
  "Client_Addendum_Rich",
  "Vendor_Addendum_Rich",
  "Sales_Associate",
  "Account_Manager",
  "Our_Services_SubForm",
  "Layout",
  "Client_Signed_Status",
  "Client_Sign_Req_Id",
  "Vendor_Signed_Status",
  "Vendor_Sign_Req_Id",
] as const;

const RELATED_FIELD_MAP: Record<string, string[]> = {
  Accounts: ["Account_Name", "Email", "Name", "Site_Map_Attachment"],
  Vendors: [
    "Vendor_Name",
    "Email",
    "First_Name",
    "Last_Name",
    "Name",
  ],
  Products: [
    "Product_Name",
    "Description",
    "Product_Category",
    "Name",
  ],
};

const RELATED_LIST_FIELDS: Record<string, string> = {
  Products: "id,Product_Name,Description,Product_Category,Name",
};

const ALLOWED_RECORD_MODULES = new Set([
  "Deals",
  "Contracts",
  "Accounts",
  "Vendors",
  "Products",
  "users",
]);

export type SendZohoSignPayload = {
  id: string;
  file_id: string;
  signature_fields: unknown;
  recipient_name: string;
  recipient_email: string;
  owner_email: string;
};

export type SendZohoSignResult = {
  ok: boolean;
  message?: string;
  output?: unknown;
  raw?: unknown;
};

function asText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseFunctionOutput(raw: unknown): unknown {
  if (raw == null) return raw;
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

/** Load raw Zoho Contract row for the PDF widget. */
export async function loadContractForPdf(recordId: string) {
  const id = String(recordId ?? "").trim();
  if (!id) throw new Error("Contract id is required.");

  const row = await fetchZohoRecordById("Contracts", id, [...CONTRACT_PDF_FIELDS]);
  return row;
}

/** Full Deals/SOW record (SOW Create Contract PDF needs Scope_of_Work + many fields). */
export async function loadDealForPdf(recordId: string) {
  const id = String(recordId ?? "").trim();
  if (!id) throw new Error("SOW id is required.");

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/Deals/${encodeURIComponent(id)}`,
  );
  if (!res.ok) {
    const detail = body?.message || body?.code || `HTTP ${res.status}`;
    throw new Error(String(detail));
  }
  const row = Array.isArray(body?.data) ? body.data[0] : null;
  if (!row) throw new Error("SOW record not found.");
  return row as Record<string, unknown>;
}

/**
 * Load a CRM record in Zoho SDK shape `{ data: [row] }` or `{ users: [...] }`.
 */
export async function loadRecord(moduleName: string, recordId: string) {
  const mod = String(moduleName ?? "").trim();
  const id = String(recordId ?? "").trim();
  if (!mod || !id) throw new Error("module and id are required.");
  if (!ALLOWED_RECORD_MODULES.has(mod) && mod.toLowerCase() !== "users") {
    throw new Error(`Module not allowed: ${mod}`);
  }
  return loadRelatedRecord(mod, id);
}

/**
 * Load a related record in Zoho CRM SDK response shape.
 * - users → `{ users: [...] }`
 * - other modules → `{ data: [...] }`
 */
export async function loadRelatedRecord(moduleName: string, recordId: string) {
  const mod = String(moduleName ?? "").trim();
  const id = String(recordId ?? "").trim();
  if (!mod || !id) throw new Error("module and id are required.");

  if (mod.toLowerCase() === "users" || mod === "users") {
    const { res, body } = await fetchZohoJson(
      `${ZOHO_CRM_BASE}/users/${encodeURIComponent(id)}`,
    );
    if (!res.ok) {
      const detail = body?.message || body?.code || `HTTP ${res.status}`;
      throw new Error(String(detail));
    }
    // Zoho users-by-id returns `{ users: [user] }`
    if (Array.isArray(body?.users)) return body;
    if (body?.users) return { users: [body.users] };
    if (body?.id) return { users: [body] };
    // Some tenants return `{ data: [user] }` for users-by-id
    if (Array.isArray(body?.data)) return { users: body.data };
    return body;
  }

  if (mod === "Deals") {
    const row = await loadDealForPdf(id);
    return { data: [row] };
  }

  if (mod === "Contracts") {
    const row = await loadContractForPdf(id);
    return { data: [row] };
  }

  const fields = RELATED_FIELD_MAP[mod] ?? ["Name", "Email"];
  const row = await fetchZohoRecordById(mod, id, fields);
  return { data: [row] };
}

/** Related list (e.g. Deals → Products). Zoho requires `fields`. */
export async function loadRelatedList(args: {
  moduleName: string;
  recordId: string;
  related: string;
  page?: number;
  perPage?: number;
}) {
  const mod = String(args.moduleName || "").trim();
  const id = String(args.recordId || "").trim();
  const related = String(args.related || "").trim();
  if (!mod || !id || !related) {
    throw new Error("module, id, and related are required.");
  }
  if (mod !== "Deals" && mod !== "Contracts") {
    throw new Error(`Related list not allowed for module: ${mod}`);
  }

  const page = Math.max(1, Number(args.page) || 1);
  const perPage = Math.min(200, Math.max(1, Number(args.perPage) || 100));
  const fields = RELATED_LIST_FIELDS[related] || "id,Name";
  const url =
    `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}/${encodeURIComponent(id)}/` +
    `${encodeURIComponent(related)}?fields=${encodeURIComponent(fields)}` +
    `&page=${page}&per_page=${perPage}`;

  const { res, body } = await fetchZohoJson(url);
  if (res.status === 204) return { data: [] };
  if (!res.ok) {
    const detail = body?.message || body?.code || `HTTP ${res.status}`;
    throw new Error(String(detail));
  }
  if (!body || !Array.isArray(body.data)) return { data: [] };
  return body;
}

/** Generic update for Deals/Contracts (sign status fields, etc.). */
export async function updateCrmRecord(
  moduleName: string,
  apiData: Record<string, unknown>,
) {
  const mod = String(moduleName || "").trim() || "Deals";
  if (mod !== "Deals" && mod !== "Contracts") {
    throw new Error(`Update not allowed for module: ${mod}`);
  }
  if (!apiData?.id) throw new Error("APIData.id is required.");

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/${encodeURIComponent(mod)}`,
    { method: "PUT", body: { data: [apiData], trigger: [] } },
  );
  const result = Array.isArray(body?.data) ? body.data[0] : null;
  const code = String(result?.code ?? body?.code ?? "").toUpperCase();
  if (!res.ok || (code && code !== "SUCCESS")) {
    const detail =
      result?.message || body?.message || result?.code || body?.code || `HTTP ${res.status}`;
    throw new Error(String(detail));
  }
  return body;
}

/**
 * Current CRM user (for owner_email + edit permission).
 *
 * Prefer CRM `/users?type=CurrentUser`. If the token lacks users scope,
 * fall back to Zoho Accounts OAuth user info (email of the connected app).
 * Never returns a client-facing "warning" — Sign still works with empty owner.
 */
export async function loadCurrentCrmUser() {
  // 1) CRM CurrentUser (needs users scope)
  try {
    const { res, body } = await fetchZohoJson(
      `${ZOHO_CRM_BASE}/users?type=CurrentUser`,
    );
    if (res.ok) {
      const users = Array.isArray(body?.users) ? body.users : [];
      if (users.length > 0) {
        return { users };
      }
    } else {
      console.warn(
        "[create-contract-pdf/me] CRM users:",
        body?.message || body?.code || res.status,
      );
    }
  } catch (error) {
    console.warn("[create-contract-pdf/me] CRM users failed", error);
  }

  // 2) OAuth user info — works with standard Zoho OAuth token (no CRM users scope)
  try {
    const token = await getZohoAccessToken();
    const infoUrl = `${ZOHO_ACCOUNTS_URL}/oauth/user/info`;
    const res = await fetch(infoUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (res.ok) {
      const email = String(
        body.Email || body.email || body.Email_ID || "",
      ).trim();
      const id = String(body.ZUID || body.zuid || body.id || "").trim();
      const name = String(
        body.Display_Name || body.display_name || body.name || "",
      ).trim();
      if (email) {
        return {
          users: [
            {
              id: id || "oauth-user",
              email,
              full_name: name,
              first_name: name,
            },
          ],
        };
      }
    } else {
      console.warn(
        "[create-contract-pdf/me] oauth user/info:",
        body.message || body.error || res.status,
      );
    }
  } catch (error) {
    console.warn("[create-contract-pdf/me] oauth user/info failed", error);
  }

  // 3) Optional env override for Sign ownership
  const envEmail = String(process.env.ZOHO_SIGN_OWNER_EMAIL ?? "").trim();
  if (envEmail) {
    return {
      users: [{ id: "env-owner", email: envEmail }],
    };
  }

  // Sign still works — Deluge skips changeownership when owner_email is empty
  return { users: [{ id: "", email: "" }] };
}

export async function uploadPdfFileToZoho(
  file: {
    name: string;
    type: string;
    bytes: Uint8Array;
  },
  options?: { contractId?: string },
): Promise<string> {
  const detailOf = (row: Record<string, unknown> | null, body: Record<string, unknown>, status: number) =>
    String(
      row?.message ||
        body?.message ||
        row?.code ||
        body?.code ||
        `HTTP ${status}`,
    );

  const isScopeError = (text: string) =>
    /invalid oauth scope|oauth_scope_mismatch|no permission/i.test(text);

  async function postFiles(token: string) {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Uint8Array.from(file.bytes)], {
        type: file.type || "application/pdf",
      }),
      file.name || "contract.pdf",
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

  /** Fallback when token lacks ZohoCRM.files.* — use Contract Attachments. */
  async function postAttachment(token: string, contractId: string) {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Uint8Array.from(file.bytes)], {
        type: file.type || "application/pdf",
      }),
      file.name || "contract.pdf",
    );
    const url =
      `${ZOHO_CRM_BASE}/Contracts/${encodeURIComponent(contractId)}/Attachments`;
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
  let result = await postFiles(token);
  if (isZohoTokenExpiredResponse(result.res, result.body)) {
    invalidateZohoAccessTokenCache();
    token = await getZohoAccessToken({ force: true });
    result = await postFiles(token);
  }

  let row = Array.isArray(result.body?.data) ? result.body.data[0] : null;
  let fileId = String(row?.details?.id ?? row?.id ?? "").trim();
  if (result.res.ok && fileId) {
    return fileId;
  }

  const filesError = detailOf(
    row as Record<string, unknown> | null,
    result.body as Record<string, unknown>,
    result.res.status,
  );

  const contractId = String(options?.contractId ?? "").trim();
  if (contractId && isScopeError(filesError)) {
    console.warn(
      "[create-contract-pdf/upload] /files scope missing; trying Contract Attachments",
      filesError,
    );
    let att = await postAttachment(token, contractId);
    if (isZohoTokenExpiredResponse(att.res, att.body)) {
      invalidateZohoAccessTokenCache();
      token = await getZohoAccessToken({ force: true });
      att = await postAttachment(token, contractId);
    }
    row = Array.isArray(att.body?.data) ? att.body.data[0] : null;
    fileId = String(row?.details?.id ?? row?.id ?? "").trim();
    if (att.res.ok && fileId) {
      // Prefix so Deluge fetches from Attachments instead of /files
      return `attachment:${fileId}`;
    }
    const attError = detailOf(
      row as Record<string, unknown> | null,
      att.body as Record<string, unknown>,
      att.res.status,
    );
    throw new Error(
      `File upload failed (files: ${filesError}; attachments: ${attError}). ` +
        "Add OAuth scope ZohoCRM.files.CREATE (or ZohoCRM.modules.ALL) and regenerate ZOHO_REFRESH_TOKEN.",
    );
  }

  throw new Error(
    `File upload failed: ${filesError}. ` +
      (isScopeError(filesError)
        ? "Add OAuth scope ZohoCRM.files.CREATE and regenerate ZOHO_REFRESH_TOKEN."
        : ""),
  );
}

export async function sendZohoSignContract(
  payload: SendZohoSignPayload,
): Promise<SendZohoSignResult> {
  const id = String(payload.id ?? "").trim();
  const file_id = String(payload.file_id ?? "").trim();
  const recipient_email = String(payload.recipient_email ?? "").trim();
  const recipient_name = String(payload.recipient_name ?? "").trim();
  const owner_email = String(payload.owner_email ?? "").trim();

  if (!id) return { ok: false, message: "Contract id is required." };
  if (!file_id) return { ok: false, message: "file_id is required." };
  if (!recipient_email) {
    return { ok: false, message: "recipient_email is required." };
  }

  const args = {
    id,
    file_id,
    signature_fields: payload.signature_fields ?? [],
    recipient_name,
    recipient_email,
    owner_email,
  };

  async function runSign(functionName: string, authType: "apikey" | "oauth") {
    return executeZohoCrmFunction(functionName, args, { authType });
  }

  // CRM SOW widget uses SendZohoSignContracts; older Contracts port used sendzohosigncontracts.
  let functionName = SEND_ZOHO_SIGN_FUNCTION_NAME_ALT;
  let { res, body } = await runSign(functionName, "apikey");
  let code = String(body?.code ?? "").toUpperCase();

  if (
    !res.ok ||
    code === "NOT_ACTIVE" ||
    code === "AUTHENTICATION_FAILURE" ||
    code === "INVALID_FUNCTION" ||
    /invalid|not found|inactive/i.test(String(body?.message ?? ""))
  ) {
    functionName = SEND_ZOHO_SIGN_FUNCTION_NAME;
    const alt = await runSign(functionName, "apikey");
    res = alt.res;
    body = alt.body;
    code = String(body?.code ?? "").toUpperCase();
  }

  if (
    !res.ok ||
    code === "NOT_ACTIVE" ||
    code === "AUTHENTICATION_FAILURE"
  ) {
    const fallback = await runSign(functionName, "oauth");
    res = fallback.res;
    body = fallback.body;
    code = String(body?.code ?? "").toUpperCase();
  }

  const output = parseFunctionOutput(body?.details?.output);
  const status =
    typeof output === "object" && output && "status" in output ?
      String((output as { status?: unknown }).status ?? "").toLowerCase()
    : "";

  const codeLower = String(body?.code ?? "").toLowerCase();
  const ok =
    res.ok &&
    status !== "failed" &&
    (code === "SUCCESS" ||
      code === "" ||
      codeLower === "success" ||
      String(body?.status ?? "").toLowerCase() === "success" ||
      body?.details?.output != null);

  if (!ok) {
    return {
      ok: false,
      message:
        code === "NOT_ACTIVE"
          ? `Zoho function "${SEND_ZOHO_SIGN_FUNCTION_NAME}" REST API is inactive.`
          : asText(output) || asText(body?.message) || `HTTP ${res.status}`,
      output,
      raw: body,
    };
  }

  return { ok: true, message: "Zoho Sign request submitted.", output, raw: body };
}

export async function updateContractSignStatus(payload: {
  id: string;
  contractType: "Client" | "Vendor";
  requestId: string;
  moduleName?: string;
}) {
  const id = String(payload.id ?? "").trim();
  const requestId = String(payload.requestId ?? "").trim();
  const moduleName =
    String(payload.moduleName ?? "Deals").trim() === "Contracts" ?
      "Contracts"
    : "Deals";
  if (!id) throw new Error("Record id is required.");
  if (!requestId) throw new Error("requestId is required.");

  const fields =
    payload.contractType === "Vendor" ?
      {
        Vendor_Signed_Status: "Sent",
        Vendor_Sign_Req_Id: requestId,
      }
    : {
        Client_Signed_Status: "Sent",
        Client_Sign_Req_Id: requestId,
      };

  return updateCrmRecord(moduleName, { id, ...fields });
}
