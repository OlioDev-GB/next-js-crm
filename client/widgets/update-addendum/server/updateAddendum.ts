/**
 * Port of Zoho “Update Addendum” widget — calls Mass_Update_Addendum with
 * `[{ id, text }, …]` for selected Deals (SOW) records.
 */

import { executeZohoCrmFunction } from "@/lib/zoho";
import {
  UPDATE_ADDENDUM_FUNCTION_NAME,
  type UpdateAddendumPayload,
  type UpdateAddendumResult,
} from "@/widgets/update-addendum/types";

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

export async function updateSowAddendum(
  payload: UpdateAddendumPayload,
): Promise<UpdateAddendumResult> {
  const moduleName = String(payload.module || "Deals").trim() || "Deals";
  if (moduleName !== "Deals" && moduleName !== "SOW") {
    return {
      ok: false,
      message: "Update Addendum is only available on SOW (Deals).",
    };
  }

  const ids = uniqueIds(payload.selectedRecordIds ?? []);
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one SOW." };
  }

  const text = String(payload.text ?? "").trim();
  if (!text) {
    return { ok: false, message: "Enter addendum text." };
  }

  // Legacy widget: arguments.data = JSON.stringify([{ id, text }, …])
  const data = JSON.stringify(ids.map((id) => ({ id, text })));
  const args = { data };

  let { res, body } = await executeZohoCrmFunction(
    UPDATE_ADDENDUM_FUNCTION_NAME,
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
      UPDATE_ADDENDUM_FUNCTION_NAME,
      args,
      { authType: "oauth" },
    );
    res = fallback.res;
    body = fallback.body;
    code = String(body?.code ?? "").toUpperCase();
  }

  const output = parseFunctionOutput(body?.details?.output);
  const outputText = asText(output).trim();
  const status = String(body?.status ?? "").toLowerCase();
  const ok =
    res.ok &&
    (code === "SUCCESS" ||
      code === "" ||
      status === "success" ||
      /^success$/i.test(outputText));

  if (!ok) {
    return {
      ok: false,
      message:
        code === "NOT_ACTIVE"
          ? `Zoho function "${UPDATE_ADDENDUM_FUNCTION_NAME}" REST API is inactive.`
          : outputText ||
            (typeof body?.message === "string" ? body.message : null) ||
            `Failed to update addendum (HTTP ${res.status}).`,
      output,
    };
  }

  return {
    ok: true,
    message:
      outputText && !/^success$/i.test(outputText)
        ? outputText
        : `Addendum updated on ${ids.length} SOW${ids.length === 1 ? "" : "s"}.`,
    output,
  };
}
