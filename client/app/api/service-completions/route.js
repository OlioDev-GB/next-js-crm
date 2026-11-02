import {
  FALLBACK_FIELD_CATALOG,
  getServiceCompletionFieldDisplayValue,
  parseServiceCompletionListFields,
  ZOHO_SERVICE_COMPLETIONS_MODULE,
} from "@/lib/service-completions/columns";
import { ZOHO_API_SORTABLE_FIELDS } from "@/lib/service-completions/columnSort";
import { buildOfflineServiceCompletionsListResponse } from "@/lib/service-completions/static";
import {
  buildZohoModuleListUrls,
  fetchZohoJson,
  mapZohoRecord,
  parseListSearchParam,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";

function mapListServiceCompletion(row, visibleApiNames) {
  const mapped = mapZohoRecord(row, visibleApiNames);
  const fields = {};
  for (const apiName of visibleApiNames) {
    fields[apiName] = getServiceCompletionFieldDisplayValue(mapped.fields, apiName);
  }
  return {
    id: row.id != null ? String(row.id) : "",
    fields,
    lookups: mapped.lookups,
  };
}

function sortMappedServiceCompletions(records, sortBy, sortOrder) {
  if (!sortBy || !Array.isArray(records)) return records;
  const factor = sortOrder === "desc" ? -1 : 1;
  return [...records].sort((a, b) => {
    const left = String(a?.fields?.[sortBy] ?? "");
    const right = String(b?.fields?.[sortBy] ?? "");
    return (
      factor *
      left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
    );
  });
}

const MAX_PER_PAGE = 200;

/**
 * GET /api/service-completions
 * List Service Completions from Zoho (page, fields, criteria, cvid, sort).
 * Falls back to offline demo rows when Zoho is unreachable.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawPerPage = Number.parseInt(searchParams.get("perPage") ?? "100", 10) || 100;
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, rawPerPage));

  const visibleApiNames = parseServiceCompletionListFields(searchParams);
  const zohoFields = ["id", ...visibleApiNames].join(",");
  const rawCriteria = searchParams.get("criteria")?.trim() || null;
  const { criteria, filters } = parseListSearchParam(rawCriteria);
  const cvid = searchParams.get("cvid")?.trim() || null;
  const sortBy = searchParams.get("sortBy")?.trim() || null;
  const sortOrderRaw = searchParams.get("sortOrder")?.trim()?.toLowerCase() || null;
  const sortOrder =
    sortOrderRaw === "desc" || sortOrderRaw === "asc" ? sortOrderRaw : null;
  const zohoSortBy =
    sortBy && ZOHO_API_SORTABLE_FIELDS.has(sortBy) ? sortBy : null;
  const pageSortBy = zohoSortBy ? null : sortBy;
  const filtered = Boolean(criteria || filters || cvid);

  const { listUrl, countUrl } = buildZohoModuleListUrls({
    module: ZOHO_SERVICE_COMPLETIONS_MODULE,
    base: ZOHO_CRM_BASE,
    fields: zohoFields,
    page,
    perPage,
    criteria,
    filters,
    cvid,
    sortBy: zohoSortBy,
    sortOrder: zohoSortBy ? sortOrder : null,
  });

  let listResult;
  let countResult;

  try {
    [listResult, countResult] = await Promise.all([
      fetchZohoJson(listUrl),
      fetchZohoJson(countUrl),
    ]);
  } catch (err) {
    console.error("Zoho Service Completions list failed:", err);
    const message = err instanceof Error ? err.message : "Failed to reach Zoho CRM";
    const offline = buildOfflineServiceCompletionsListResponse({
      page,
      perPage,
      visibleApiNames:
        visibleApiNames.length > 0
          ? visibleApiNames
          : FALLBACK_FIELD_CATALOG.map((f) => f.apiName),
    });
    return Response.json({
      ...offline,
      error: message,
      zohoUnreachable: true,
    });
  }

  const { res: zohoRes, body } = listResult;

  if (zohoRes.status === 204) {
    let totalCount = 0;
    if (countResult.res.ok && typeof countResult.body.count === "number") {
      totalCount = countResult.body.count;
    }
    return Response.json({
      records: [],
      totalCount,
      loadedCount: 0,
      page,
      perPage,
      hasMore: false,
      visibleFields: visibleApiNames,
      criteria: rawCriteria,
      cvid,
      filtered,
    });
  }

  if (!zohoRes.ok) {
    return Response.json(
      {
        error: "Zoho CRM error",
        status: zohoRes.status,
        details: body,
      },
      { status: zohoRes.status >= 400 && zohoRes.status < 600 ? zohoRes.status : 502 },
    );
  }

  const records = sortMappedServiceCompletions(
    (body.data ?? []).map((row) => mapListServiceCompletion(row, visibleApiNames)),
    pageSortBy,
    sortOrder,
  );

  let totalCount = records.length;
  if (countResult.res.ok && typeof countResult.body.count === "number") {
    totalCount = countResult.body.count;
  } else if (typeof body.info?.count === "number" && !body.info?.more_records) {
    totalCount = body.info.count;
  }

  return Response.json({
    records,
    totalCount,
    loadedCount: records.length,
    page,
    perPage,
    hasMore: Boolean(body.info?.more_records),
    visibleFields: visibleApiNames,
    criteria: rawCriteria,
    cvid,
    filtered,
  });
}
