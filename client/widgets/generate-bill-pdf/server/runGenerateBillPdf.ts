/**
 * Runs Zoho Vendor Invoices list button “Generate Bill PDF”
 * (custom function via execute_custom_button).
 */

import { executeZohoCustomButton } from "@/lib/zoho";
import {
  GENERATE_BILL_PDF_BUTTON_LABEL,
  GENERATE_BILL_PDF_MODULE,
  GENERATE_BILL_PDF_ZOHO_BUTTON_ID,
  type GenerateBillPdfResult,
} from "@/widgets/generate-bill-pdf/types";

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

export async function runGenerateBillPdf(
  selectedRecordIds: string[],
): Promise<GenerateBillPdfResult> {
  const ids = uniqueIds(selectedRecordIds ?? []);
  if (ids.length === 0) {
    return {
      ok: false,
      message: "Select at least one vendor invoice.",
    };
  }

  const { res, body } = await executeZohoCustomButton(
    GENERATE_BILL_PDF_MODULE,
    GENERATE_BILL_PDF_ZOHO_BUTTON_ID,
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
          ? `Permission denied running Zoho button "${GENERATE_BILL_PDF_BUTTON_LABEL}".`
          : `Failed to run "${GENERATE_BILL_PDF_BUTTON_LABEL}".`),
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
      message:
        parsed.message || `Failed to run "${GENERATE_BILL_PDF_BUTTON_LABEL}".`,
      output,
    };
  }

  return {
    ok: true,
    message:
      parsed.creatorResponse ||
      parsed.message ||
      `${GENERATE_BILL_PDF_BUTTON_LABEL} completed.`,
    output,
  };
}
