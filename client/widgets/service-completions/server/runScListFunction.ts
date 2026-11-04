/**
 * Runs Service Completions list-view Zoho custom buttons that invoke Deluge
 * functions (same buttons as CRM: Update Imported Records, Create Vendor Invoice,
 * Solar Client Sync).
 */

import { executeZohoCustomButton } from "@/lib/zoho";
import {
  SC_LIST_FUNCTION_ACTIONS,
  type RunScListFunctionPayload,
  type RunScListFunctionResult,
  type ScListFunctionActionId,
} from "@/widgets/service-completions/types";

const SERVICE_COMPLETIONS_MODULE = "ServiceCompletions";

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
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

function parseCreatorResponse(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  return asText(raw).trim();
}

function extractButtonResult(body: Record<string, unknown>) {
  const rows = body.execute_custom_button;
  const first =
    Array.isArray(rows) && rows.length > 0
      ? (rows[0] as Record<string, unknown>)
      : body;

  const details =
    first.details && typeof first.details === "object"
      ? (first.details as Record<string, unknown>)
      : undefined;
  const customFunction =
    details?.custom_function && typeof details.custom_function === "object"
      ? (details.custom_function as Record<string, unknown>)
      : undefined;

  const creatorResponse = parseCreatorResponse(
    customFunction?.creator_response ?? details?.output ?? first.message,
  );

  const code = String(first.code ?? body.code ?? "").toUpperCase();
  const status = String(first.status ?? body.status ?? "").toLowerCase();
  const message =
    creatorResponse ||
    (typeof first.message === "string" ? first.message.trim() : "") ||
    (typeof body.message === "string" ? body.message.trim() : "");

  return { code, status, message, creatorResponse, first };
}

function isKnownActionId(value: string): value is ScListFunctionActionId {
  return value in SC_LIST_FUNCTION_ACTIONS;
}

/**
 * Executes the matching Zoho Service Completions list custom button.
 */
export async function runScListFunction(
  payload: RunScListFunctionPayload,
): Promise<RunScListFunctionResult> {
  const actionId = String(payload.actionId || "").trim();
  if (!isKnownActionId(actionId)) {
    return { ok: false, message: "Unknown Service Completions list action." };
  }

  const action = SC_LIST_FUNCTION_ACTIONS[actionId];
  const moduleName =
    String(payload.module || SERVICE_COMPLETIONS_MODULE).trim() ||
    SERVICE_COMPLETIONS_MODULE;

  if (moduleName !== SERVICE_COMPLETIONS_MODULE) {
    return {
      ok: false,
      message: `${action.buttonLabel} is only available on Service Completions.`,
    };
  }

  const ids = uniqueIds(payload.selectedRecordIds ?? []);
  if (ids.length === 0) {
    return {
      ok: false,
      message: "Select at least one service completion.",
    };
  }

  const { res, body } = await executeZohoCustomButton(
    SERVICE_COMPLETIONS_MODULE,
    action.zohoButtonId,
    ids,
  );

  const parsed = extractButtonResult((body ?? {}) as Record<string, unknown>);
  const output = parsed.creatorResponse || body;

  if (
    !res.ok ||
    parsed.code === "FAILURE" ||
    parsed.status === "failure" ||
    parsed.code === "NO_PERMISSION" ||
    parsed.code === "DEPENDENT_FIELD_MISSING" ||
    parsed.code === "INVALID_DATA"
  ) {
    return {
      ok: false,
      message:
        parsed.message ||
        (parsed.code === "NO_PERMISSION"
          ? `Permission denied running Zoho button "${action.buttonLabel}".`
          : `Failed to run "${action.buttonLabel}".`),
      output,
    };
  }

  const buttonOk =
    parsed.code === "SUCCESS" ||
    parsed.code === "" ||
    parsed.status === "success";

  if (!buttonOk) {
    return {
      ok: false,
      message: parsed.message || `Failed to run "${action.buttonLabel}".`,
      output,
    };
  }

  const creator = parsed.creatorResponse;
  const creatorLooksFailed =
    Boolean(creator) &&
    /\bERROR:/i.test(creator) &&
    !/\bSUCCESS:/i.test(creator) &&
    !/^Media Synced/i.test(creator) &&
    !/^Already Synced/i.test(creator);

  if (creatorLooksFailed) {
    return {
      ok: false,
      message: creator,
      output,
    };
  }

  return {
    ok: true,
    message: creator || parsed.message || `${action.buttonLabel} completed.`,
    output,
  };
}
