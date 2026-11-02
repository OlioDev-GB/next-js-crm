/**
 * Calls Zoho CRM standalone function `contract_list_bulk_update`.
 *
 * Endpoints (via executeZohoCrmFunction → ZOHO_CRM_BASE v7):
 * - apikey: /crm/v7/functions/contract_list_bulk_update/actions/execute?auth_type=apikey&zapikey=…
 * - oauth:  /crm/v7/functions/contract_list_bulk_update/actions/execute?auth_type=oauth
 */

import { executeZohoCrmFunction } from "@/lib/zoho";
import {
  CONTRACT_LIST_BULK_UPDATE_FUNCTION_NAME,
  type BulkUpdateModuleName,
  type ContractListBulkUpdatePayload,
  type ContractListBulkUpdateResult,
} from "@/widgets/contract-list-bulk-update/types";

const ALLOWED_MODULES = new Set<BulkUpdateModuleName>([
  "Contracts",
  "Vendors",
  "ServiceCompletions",
  "Deals",
  "Bids",
]);

function defaultEntityLabel(moduleName: BulkUpdateModuleName) {
  if (moduleName === "Vendors") return "vendor";
  if (moduleName === "ServiceCompletions") return "service completion";
  if (moduleName === "Deals") return "SOW";
  if (moduleName === "Bids") return "bid";
  return "contract";
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

function asText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function functionMessage(body: Record<string, unknown>, output: unknown) {
  const outputText = asText(output).trim();
  if (outputText) return outputText;
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }
  const details = body.details as Record<string, unknown> | undefined;
  if (typeof details?.message === "string" && details.message.trim()) {
    return details.message.trim();
  }
  return "Bulk update failed.";
}

function looksLikeDelugeError(output: unknown): boolean {
  const text = asText(output).trim();
  if (!text) return false;
  if (/^ERROR:/i.test(text)) return true;
  if (/"status"\s*:\s*"error"/i.test(text)) return true;
  if (/"code"\s*:\s*"INVALID_/i.test(text)) return true;
  return false;
}

/**
 * Invokes `contract_list_bulk_update` with comma-separated record IDs.
 * Prefers apikey (ZOHO_FUNCTIONS_API_KEY), falls back to oauth.
 * Used by Contracts, Vendors, Service Completions, SOW/Deals, and Bids (same Zoho function name).
 */
export async function runContractListBulkUpdate(
  payload: ContractListBulkUpdatePayload,
  options?: { entityLabel?: string },
): Promise<ContractListBulkUpdateResult> {
  const moduleName = String(payload.moduleName ?? "").trim() as BulkUpdateModuleName;
  const entityLabel =
    options?.entityLabel?.trim() || defaultEntityLabel(moduleName);
  const recordIds = [...new Set((payload.recordIds ?? []).map(String))]
    .map((id) => id.trim())
    .filter(Boolean);
  const fieldApiName = String(payload.fieldApiName ?? "").trim();
  const fieldValue = String(payload.fieldValue ?? "").trim();
  const fieldType = String(payload.fieldType ?? "text").trim() || "text";

  if (!ALLOWED_MODULES.has(moduleName)) {
    return {
      ok: false,
      message:
        'moduleName must be "Contracts", "Vendors", "ServiceCompletions", "Deals", or "Bids".',
    };
  }
  if (recordIds.length === 0) {
    return {
      ok: false,
      message: `Select at least one ${entityLabel} to update.`,
    };
  }
  if (!fieldApiName) {
    return { ok: false, message: "Field API name is required." };
  }

  // Must match Deluge params: moduleName, recordIdsJson, fieldApiName, fieldValue, fieldType
  const args = {
    moduleName,
    recordIdsJson: recordIds.join(","),
    fieldApiName,
    fieldValue,
    fieldType,
  };

  let { res, body } = await executeZohoCrmFunction(
    CONTRACT_LIST_BULK_UPDATE_FUNCTION_NAME,
    args,
    { authType: "apikey" },
  );

  let code = String(body?.code ?? "").toUpperCase();
  if (
    !res.ok ||
    code === "NOT_ACTIVE" ||
    code === "AUTHENTICATION_FAILURE"
  ) {
    const fallback = await executeZohoCrmFunction(
      CONTRACT_LIST_BULK_UPDATE_FUNCTION_NAME,
      args,
      { authType: "oauth" },
    );
    res = fallback.res;
    body = fallback.body;
    code = String(body?.code ?? "").toUpperCase();
  }

  const output = parseFunctionOutput(body?.details?.output);
  const status = String(body?.status ?? "").toLowerCase();
  const codeLower = String(body?.code ?? "").toLowerCase();

  if (codeLower === "failure" || status === "failure" || code === "FAILURE") {
    return {
      ok: false,
      message: functionMessage(body as Record<string, unknown>, output),
      output,
    };
  }

  if (looksLikeDelugeError(output)) {
    return {
      ok: false,
      message: functionMessage(body as Record<string, unknown>, output),
      output,
    };
  }

  const ok =
    res.ok &&
    (code === "SUCCESS" ||
      code === "" ||
      codeLower === "success" ||
      status === "success" ||
      body?.details?.output != null);

  if (!ok) {
    return {
      ok: false,
      message:
        code === "NOT_ACTIVE"
          ? `Zoho function "${CONTRACT_LIST_BULK_UPDATE_FUNCTION_NAME}" REST API is inactive.`
          : functionMessage(body as Record<string, unknown>, output) ||
            `HTTP ${res.status}`,
      output,
    };
  }

  return {
    ok: true,
    message: `Updated ${recordIds.length} ${entityLabel}${recordIds.length === 1 ? "" : "s"}.`,
    output,
  };
}
