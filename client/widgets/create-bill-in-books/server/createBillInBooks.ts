/**
 * Create Bill in Books — port of PushVendorInvoiceToBooks widget.html.
 * Calls Zoho CRM function `createbillfromvendorinvoice`.
 */

import { executeZohoCrmFunction } from "@/lib/zoho";
import type { CreateBillInBooksResult } from "@/widgets/create-bill-in-books/types";

export type { CreateBillInBooksResult };

export const CREATE_BILL_IN_BOOKS_FUNCTION_NAME =
  "createbillfromvendorinvoice" as const;

function parseFunctionOutput(raw: unknown): Record<string, unknown> {
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
      return { message: trimmed };
    }
  }
  return {};
}

export async function createBillsInBooks(
  recordIds: string[],
): Promise<CreateBillInBooksResult> {
  const ids = [...new Set((recordIds ?? []).map(String))]
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return { ok: false, message: "Select at least one vendor invoice." };
  }

  // Match Zoho widget: arguments.ids = EntityId (array of selected ids).
  const args = { ids };

  let { res, body } = await executeZohoCrmFunction(
    CREATE_BILL_IN_BOOKS_FUNCTION_NAME,
    args,
    { authType: "apikey" },
  );
  let code = String(body?.code ?? "").toLowerCase();

  if (
    !res.ok ||
    code === "not_active" ||
    code === "authentication_failure"
  ) {
    const fallback = await executeZohoCrmFunction(
      CREATE_BILL_IN_BOOKS_FUNCTION_NAME,
      args,
      { authType: "oauth" },
    );
    res = fallback.res;
    body = fallback.body;
    code = String(body?.code ?? "").toLowerCase();
  }

  const output = parseFunctionOutput(body?.details?.output);
  const message = String(
    output.message || body?.message || body?.code || "",
  ).trim();

  if (code === "success") {
    return {
      ok: true,
      message: message || "Bills processed.",
      total: (output.total as number | string | undefined) ?? ids.length,
      skipped: output.skipped as number | string | undefined,
      success: output.success as number | string | undefined,
      failed: output.failed as number | string | undefined,
      log: output.Log != null ? String(output.Log) : undefined,
      raw: body,
    };
  }

  return {
    ok: false,
    message:
      message ||
      "There was an error processing your request. Please try again later.",
    raw: body,
  };
}
