/**
 * Server helpers for Create SOW Records — List widget.
 */

import {
  fetchZohoJson,
  getZohoModuleSearchUrl,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";
import { loadCurrentCrmUser } from "@/widgets/create-contract-pdf/server/createContractPdf";

const ACCOUNT_FIELDS = [
  "id",
  "Account_Name",
  "Name",
  "Layout",
  "Site_Acreage",
  "Parent_Account",
].join(",");

const DEAL_FIELDS = ["id", "SOWID", "Deal_Name"].join(",");

export { loadCurrentCrmUser };

export async function loadRecord(moduleName: string, recordId: string) {
  const module = String(moduleName || "").trim() || "Accounts";
  const id = String(recordId || "").trim();
  if (!id) throw new Error("Record id is required.");

  const fields =
    module === "Deals" ? DEAL_FIELDS
    : module === "Accounts" ? ACCOUNT_FIELDS
    : "id";

  const url =
    `${ZOHO_CRM_BASE}/${encodeURIComponent(module)}/${encodeURIComponent(id)}` +
    `?fields=${encodeURIComponent(fields)}`;
  const { res, body } = await fetchZohoJson(url);
  if (!res.ok) {
    throw new Error(
      String(body?.message || body?.code || `Failed to load ${module} ${id}`),
    );
  }
  return body;
}

export async function insertRecord(payload: {
  Entity?: string;
  APIData?: Record<string, unknown>;
  Trigger?: string[];
}) {
  const entity = String(payload.Entity || "").trim();
  if (!entity) throw new Error("Entity is required.");
  if (!payload.APIData || typeof payload.APIData !== "object") {
    throw new Error("APIData is required.");
  }

  const trigger = Array.isArray(payload.Trigger) ? payload.Trigger : ["workflow"];
  const { res, body } = await fetchZohoJson(
    `${ZOHO_CRM_BASE}/${encodeURIComponent(entity)}`,
    {
      method: "POST",
      body: { data: [payload.APIData], trigger },
    },
  );

  if (!res.ok && !Array.isArray(body?.data)) {
    throw new Error(
      String(body?.message || body?.code || `Failed to create ${entity}`),
    );
  }
  return body;
}

export async function updateRecord(payload: {
  Entity?: string;
  APIData?: Record<string, unknown>;
}) {
  const entity = String(payload.Entity || "").trim();
  if (!entity) throw new Error("Entity is required.");
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

export async function searchRecords(payload: {
  Entity?: string;
  Type?: string;
  Query?: string;
}) {
  const entity = String(payload.Entity || "").trim();
  const query = String(payload.Query || "").trim();
  if (!entity) throw new Error("Entity is required.");
  if (!query) return { data: [] };

  const fields =
    entity === "Products" ? "id,Product_Name"
    : entity === "Contacts" ? "id,Full_Name"
    : undefined;

  const url = getZohoModuleSearchUrl(entity, {
    criteria: query,
    fields,
    page: 1,
    perPage: 50,
  });
  let { res, body } = await fetchZohoJson(url);

  // Fallback: word search when criteria is rejected (e.g. unsupported operator).
  if (
    !res.ok &&
    res.status !== 204 &&
    body?.code !== "NO_DATA" &&
    entity === "Products"
  ) {
    const wordMatch = query.match(/Product_Name:(?:starts_with|contains):(.+)\)$/i);
    const word = (wordMatch?.[1] || query).replace(/\\([,()\\])/g, "$1").trim();
    if (word) {
      const wordUrl = getZohoModuleSearchUrl(entity, {
        word,
        fields,
        page: 1,
        perPage: 50,
      });
      const wordResult = await fetchZohoJson(wordUrl);
      res = wordResult.res;
      body = wordResult.body;
    }
  }

  if (!res.ok) {
    // Empty search often returns 204 / no data — treat as empty list.
    if (res.status === 204 || body?.code === "NO_DATA") {
      return { data: [] };
    }
    throw new Error(
      String(body?.message || body?.code || `Failed to search ${entity}`),
    );
  }
  return { data: Array.isArray(body?.data) ? body.data : [] };
}
