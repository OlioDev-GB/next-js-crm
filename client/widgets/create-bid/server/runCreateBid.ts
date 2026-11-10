/**
 * Runs Zoho SOW detail button “Create Bid”
 * (custom function via execute_custom_button, with create_bid_from_sow fallback).
 */

import {
  executeZohoCrmFunction,
  executeZohoCustomButton,
} from "@/lib/zoho";
import {
  CREATE_BID_BUTTON_LABEL,
  CREATE_BID_FUNCTION_API_NAME,
  CREATE_BID_MODULE,
  CREATE_BID_ZOHO_BUTTON_ID,
  type CreateBidResult,
} from "@/widgets/create-bid/types";

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

  const creatorResponse = asText(
    customFunction?.creator_response ?? details?.output ?? first.message,
  ).trim();

  const code = String(first.code ?? body.code ?? "").toUpperCase();
  const status = String(first.status ?? body.status ?? "").toLowerCase();
  const message =
    creatorResponse ||
    (typeof first.message === "string" ? first.message.trim() : "") ||
    (typeof body.message === "string" ? body.message.trim() : "");

  return { code, status, message, creatorResponse };
}

function extractFunctionResult(body: Record<string, unknown>) {
  const details =
    body.details && typeof body.details === "object"
      ? (body.details as Record<string, unknown>)
      : undefined;

  const userMessage = Array.isArray(details?.userMessage)
    ? details.userMessage
    : [];
  const fromUserMessage = userMessage
    .map((item) => asText(item).trim())
    .filter(Boolean)
    .at(-1);

  const output = asText(details?.output ?? body.output).trim();
  const message =
    fromUserMessage ||
    output ||
    (typeof body.message === "string" ? body.message.trim() : "");

  const code = String(body.code ?? "").toUpperCase();
  const status = String(body.status ?? "").toLowerCase();

  const lower = message.toLowerCase();
  const looksCreated =
    lower.includes("record created") ||
    lower.includes("bid created") ||
    /"id"\s*:/.test(message);

  const looksError =
    lower.includes("not found") ||
    lower.includes("mandatory") ||
    lower.includes("error") ||
    code === "FAILURE" ||
    status === "failure" ||
    code === "ERROR";

  return {
    code,
    status,
    message,
    output: details?.output ?? body.output ?? body,
    looksCreated,
    looksError,
  };
}

async function runCreateBidFunction(recordId: string): Promise<CreateBidResult> {
  const args = { sow_id: recordId, sowid: recordId };

  let { res, body } = await executeZohoCrmFunction(
    CREATE_BID_FUNCTION_API_NAME,
    args,
    { authType: "apikey" },
  );
  let code = String((body as Record<string, unknown>)?.code ?? "").toUpperCase();

  if (
    !res.ok ||
    code === "NOT_ACTIVE" ||
    code === "AUTHENTICATION_FAILURE"
  ) {
    const fallback = await executeZohoCrmFunction(
      CREATE_BID_FUNCTION_API_NAME,
      args,
      { authType: "oauth" },
    );
    res = fallback.res;
    body = fallback.body;
  }

  const parsed = extractFunctionResult((body ?? {}) as Record<string, unknown>);

  if (!res.ok || parsed.looksError) {
    return {
      ok: false,
      message:
        parsed.message ||
        `Failed to run "${CREATE_BID_BUTTON_LABEL}".`,
      output: parsed.output,
    };
  }

  if (
    parsed.looksCreated ||
    parsed.code === "SUCCESS" ||
    parsed.status === "success"
  ) {
    return {
      ok: true,
      message: parsed.message || "Bid created successfully.",
      output: parsed.output,
    };
  }

  return {
    ok: false,
    message:
      parsed.message || `Failed to run "${CREATE_BID_BUTTON_LABEL}".`,
    output: parsed.output,
  };
}

export async function runCreateBid(
  selectedRecordIds: string[],
): Promise<CreateBidResult> {
  const ids = uniqueIds(selectedRecordIds ?? []);
  if (ids.length === 0) {
    return {
      ok: false,
      message: "Select a SOW record.",
    };
  }

  const recordId = ids[0]!;

  const { res, body } = await executeZohoCustomButton(
    CREATE_BID_MODULE,
    CREATE_BID_ZOHO_BUTTON_ID,
    [recordId],
  );

  const parsed = extractButtonResult((body ?? {}) as Record<string, unknown>);
  const output = parsed.creatorResponse || body;

  const buttonFailed =
    !res.ok ||
    parsed.code === "FAILURE" ||
    parsed.status === "failure" ||
    parsed.code === "NO_PERMISSION" ||
    parsed.code === "DEPENDENT_FIELD_MISSING" ||
    parsed.code === "INVALID_DATA" ||
    parsed.code === "INTERNAL_ERROR";

  if (!buttonFailed) {
    const buttonOk =
      parsed.code === "SUCCESS" ||
      parsed.code === "" ||
      parsed.status === "success";

    if (buttonOk) {
      return {
        ok: true,
        message:
          parsed.creatorResponse ||
          parsed.message ||
          `${CREATE_BID_BUTTON_LABEL} completed.`,
        output,
      };
    }
  }

  // Production button may reference a legacy function; fall back to the
  // Create Bid Test CRM function used by the Zoho widget.
  const fallback = await runCreateBidFunction(recordId);
  if (fallback.ok) return fallback;

  return {
    ok: false,
    message:
      parsed.message ||
      fallback.message ||
      (parsed.code === "NO_PERMISSION"
        ? `Permission denied running Zoho button "${CREATE_BID_BUTTON_LABEL}".`
        : `Failed to run "${CREATE_BID_BUTTON_LABEL}".`),
    output: fallback.output ?? output,
  };
}
