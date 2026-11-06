/**
 * Server helpers for Approved by Ops (Vendor Invoice Widget Ops).
 */

import {
  executeZohoCrmFunction,
  fetchZohoJson,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";
import { loadCurrentCrmUser } from "@/widgets/create-contract-pdf/server/createContractPdf";

/** Current user with profile (needed for Operations Rep COI gate). */
export async function loadCurrentCrmUserWithProfile() {
  const base = await loadCurrentCrmUser();
  const users = Array.isArray(base?.users) ? base.users : [];
  const first = users[0] as Record<string, unknown> | undefined;
  if (!first) return { users: [] };

  // CRM CurrentUser usually includes profile; OAuth fallback may not.
  if (first.profile) return { users };

  try {
    const { res, body } = await fetchZohoJson(
      `${ZOHO_CRM_BASE}/users?type=CurrentUser`,
    );
    if (res.ok && Array.isArray(body?.users) && body.users[0]) {
      return { users: body.users };
    }
  } catch {
    /* keep base user */
  }

  return { users };
}

const ALLOWED_FUNCTIONS = new Set([
  "vendor_invoices_and_contract",
  "save_addendum_contract_invoice",
  "approved_vendor_invoices",
  "ConvertURLToFIle",
]);

function parseArguments(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export async function executeApprovedByOpsFunction(payload: {
  name?: string;
  arguments?: unknown;
}) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Function name is required.");
  if (!ALLOWED_FUNCTIONS.has(name)) {
    throw new Error(`Function not allowed: ${name}`);
  }

  const args = parseArguments(payload.arguments);

  let { res, body } = await executeZohoCrmFunction(name, args, {
    authType: "apikey",
  });
  let code = String(body?.code ?? "").toUpperCase();

  if (
    !res.ok ||
    code === "NOT_ACTIVE" ||
    code === "AUTHENTICATION_FAILURE"
  ) {
    const fallback = await executeZohoCrmFunction(name, args, {
      authType: "oauth",
    });
    res = fallback.res;
    body = fallback.body;
  }

  // Return Zoho function response shape for the HTML widget.
  return body;
}

export async function updateVendorInvoiceRecord(payload: {
  Entity?: string;
  APIData?: Record<string, unknown>;
}) {
  const entity = String(payload.Entity || "Vendor_Invoices").trim();
  if (!payload.APIData || typeof payload.APIData !== "object") {
    throw new Error("APIData is required.");
  }

  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/${encodeURIComponent(entity)}`,
    {
      method: "PUT",
      body: { data: [payload.APIData], trigger: ["workflow"] },
    },
  );

  if (!res.ok && !Array.isArray(body?.data)) {
    throw new Error(
      String(body?.message || body?.code || `Failed to update ${entity}`),
    );
  }
  return body;
}

export function getApprovedByOpsConfig() {
  return {
    groqApiKey: String(process.env.GROQ_API_KEY ?? "").trim(),
  };
}
