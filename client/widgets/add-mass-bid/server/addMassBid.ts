/**
 * Port of Zoho “Add Mass Bid” / Mass Bid Creator widget for Deals (SOW) list.
 */

import {
  escapeZohoCriteriaValue,
  executeZohoCrmFunction,
  fetchZohoJson,
  fetchZohoRecordById,
  getZohoAccessToken,
  getZohoModuleSearchUrl,
  invalidateZohoAccessTokenCache,
  isZohoTokenExpiredResponse,
  ZOHO_CRM_BASE,
} from "@/lib/zoho";
import {
  ADD_MASS_BID_MAX_FILE_BYTES,
  ADD_MASS_BID_MAX_VENDORS,
  ADD_MASS_BID_SEARCH_MIN_CHARS,
  ALLOWED_VENDOR_STATUSES,
  SEASONAL_CONTRACT_BIDS_LAYOUT_ID,
  UPLOAD_BID_FILE_FUNCTION,
  type AddMassBidContextResult,
  type AddMassBidPayload,
  type AddMassBidResult,
  type AddMassBidUploadedFile,
  type MassBidLineItem,
  type MassBidSowContext,
  type SelectedBidConflict,
  type SelectedBidsResult,
  type VendorSearchResult,
  type VendorSuggestion,
} from "@/widgets/add-mass-bid/types";

type ZohoLookup = { id?: string; name?: string; Name?: string } | string | null | undefined;

const DEAL_FIELDS = [
  "Scope_of_Work",
  "Company_Name",
  "Site_Street",
  "Address",
  "Site_City",
  "Site_State",
  "Site_Zip",
  "Site_ZIP",
  "Location_Name",
  "Sales_Associate_New",
  "Operations_Associate_New",
] as const;

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
}

function asText(value: unknown) {
  if (value == null || value === "") return "";
  return String(value);
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lookupId(value: ZohoLookup): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value.id != null) {
    return String(value.id).trim();
  }
  return "";
}

function lookupName(value: ZohoLookup): string {
  if (value == null || typeof value !== "object") return "";
  return asText(value.name ?? value.Name);
}

function locationNameOf(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (value && typeof value === "object") {
    const obj = value as { name?: unknown; Name?: unknown };
    return asText(obj.name ?? obj.Name) || fallback;
  }
  return fallback;
}

function isSelectedBidTrue(value: unknown) {
  if (value === true) return true;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}

function parseLineItems(scope: unknown): MassBidLineItem[] {
  if (!Array.isArray(scope)) return [];
  return scope.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const service = item.OurServices as ZohoLookup;
    return {
      id: asText(item.id),
      serviceName: lookupName(service),
      serviceId: lookupId(service),
      startDate: asText(item.Start_Date),
      endDate: asText(item.End_Date),
      clientPrice: asNumber(item.Invoice_Price),
      vendorPrice: asNumber(item.Vendor_Price),
    };
  });
}

function vendorPriceTotalFromScope(scope: unknown): number | null {
  if (!Array.isArray(scope) || scope.length === 0) return null;
  const total = scope.reduce(
    (sum, item) =>
      sum + asNumber((item as Record<string, unknown>)?.Vendor_Price),
    0,
  );
  return total > 0 ? total : null;
}

function lineItemsMatch(sows: MassBidSowContext[]) {
  if (sows.length === 0) return false;
  const reference = sows[0].lineItems;
  for (let i = 1; i < sows.length; i += 1) {
    const items = sows[i].lineItems;
    if (items.length !== reference.length) return false;
    for (let j = 0; j < items.length; j += 1) {
      if (items[j].serviceId !== reference[j].serviceId) return false;
    }
  }
  return true;
}

function statusAllowed(status: string) {
  const normalized = status.trim().toLowerCase();
  return ALLOWED_VENDOR_STATUSES.some(
    (allowed) => allowed.toLowerCase() === normalized,
  );
}

async function fetchSiteAccount(siteId: string) {
  if (!siteId) return null;
  try {
    return await fetchZohoRecordById("Accounts", siteId, [
      "Parent_Account",
      "Location_Name",
      "Account_Name",
    ]);
  } catch (error) {
    console.warn("[add-mass-bid] site account fetch failed", siteId, error);
    return null;
  }
}

function mapDealToSowContext(
  sowId: string,
  record: Record<string, unknown>,
  parentAccountId?: string,
): MassBidSowContext {
  const company = record.Company_Name as ZohoLookup;
  const salesOwner = record.Sales_Associate_New as ZohoLookup;
  const opsOwner = record.Operations_Associate_New as ZohoLookup;
  const scope = record.Scope_of_Work;
  const lineItems = parseLineItems(scope);

  return {
    sowId,
    companyNameId: lookupId(company) || undefined,
    companyName: lookupName(company) || undefined,
    address: asText(record.Site_Street || record.Address),
    city: asText(record.Site_City),
    state: asText(record.Site_State),
    zip: asText(record.Site_Zip || record.Site_ZIP),
    locationName: locationNameOf(record.Location_Name),
    salesOwnerId: lookupId(salesOwner) || undefined,
    opsOwnerId: lookupId(opsOwner) || undefined,
    parentAccountId: parentAccountId || undefined,
    vendorPriceTotal: vendorPriceTotalFromScope(scope),
    lineItems,
  };
}

export async function loadMassBidContext(
  selectedRecordIds: string[],
): Promise<AddMassBidContextResult> {
  const ids = uniqueIds(selectedRecordIds);
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one SOW." };
  }

  try {
    const sows: MassBidSowContext[] = [];

    for (const sowId of ids) {
      const record = await fetchZohoRecordById("Deals", sowId, [...DEAL_FIELDS]);
      const companyId = lookupId(record.Company_Name as ZohoLookup);
      let parentAccountId = "";
      let siteLocation = "";

      if (companyId) {
        const site = await fetchSiteAccount(companyId);
        if (site) {
          parentAccountId = lookupId(site.Parent_Account as ZohoLookup);
          siteLocation = locationNameOf(site.Location_Name);
        }
      }

      const mapped = mapDealToSowContext(sowId, record, parentAccountId);
      if (!mapped.locationName && siteLocation) {
        mapped.locationName = siteLocation;
      }
      sows.push(mapped);
    }

    const match = lineItemsMatch(sows);
    if (!match) {
      return {
        ok: true,
        lineItemsMatch: false,
        sowCount: sows.length,
        sows,
        message: "line items don't match, can't submit mass bid",
      };
    }

    return {
      ok: true,
      lineItemsMatch: true,
      sowCount: sows.length,
      referenceLineItems: sows[0]?.lineItems ?? [],
      sows,
    };
  } catch (error) {
    console.error("[add-mass-bid] context", error);
    return {
      ok: false,
      message:
        error instanceof Error ?
          error.message
        : "Error fetching SOW or vendor data.",
    };
  }
}

export async function searchVendorsForMassBid(
  query: string,
): Promise<VendorSearchResult> {
  const q = String(query ?? "").trim();
  if (q.length < ADD_MASS_BID_SEARCH_MIN_CHARS) {
    return { ok: true, vendors: [] };
  }

  const criteria = `(Vendor_Name:starts_with:${escapeZohoCriteriaValue(q)})`;
  const url = getZohoModuleSearchUrl("Vendors", {
    criteria,
    fields: "Vendor_Name,Status",
    perPage: ADD_MASS_BID_MAX_VENDORS,
  });

  const { res, body } = await fetchZohoJson(url);
  if (!res.ok) {
    if (res.status === 204 || body?.code === "NO_DATA") {
      return { ok: true, vendors: [] };
    }
    const detail = body?.message || body?.code || `HTTP ${res.status}`;
    return { ok: false, message: String(detail), vendors: [] };
  }

  const rows = Array.isArray(body?.data) ? body.data : [];
  const mapped: VendorSuggestion[] = [];
  for (const row of rows) {
    const id = asText(row?.id);
    const name = asText(row?.Vendor_Name || row?.Name);
    if (!id || !name) continue;
    mapped.push({
      id,
      name,
      status: asText(row?.Status) || undefined,
    });
  }

  const filtered = mapped.filter((vendor) =>
    statusAllowed(vendor.status || ""),
  );
  const toUse = filtered.length > 0 ? filtered : mapped;

  return { ok: true, vendors: toUse.slice(0, ADD_MASS_BID_MAX_VENDORS) };
}

async function getBidsBySowId(sowId: string) {
  const fields = ["id", "Name", "Vendor", "Selected_Bid", "Deal"].join(",");
  const url =
    `${ZOHO_CRM_BASE}/Deals/${encodeURIComponent(sowId)}/Bids` +
    `?fields=${encodeURIComponent(fields)}&per_page=200`;

  const { res, body } = await fetchZohoJson(url);
  if (res.status === 204 || body?.code === "NO_DATA") return [];
  if (!res.ok) {
    console.warn("[add-mass-bid] Bids related list:", sowId, body);
    return [];
  }
  return Array.isArray(body?.data) ? body.data : [];
}

export async function loadSelectedBidsToUncheck(
  selectedRecordIds: string[],
): Promise<SelectedBidsResult> {
  const ids = uniqueIds(selectedRecordIds);
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one SOW.", bids: [] };
  }

  try {
    const context = await loadMassBidContext(ids);
    if (!context.ok) {
      return { ok: false, message: context.message, bids: [] };
    }

    const sowById = new Map(
      (context.sows ?? []).map((sow) => [sow.sowId, sow] as const),
    );
    const conflicts: SelectedBidConflict[] = [];

    for (const sowId of ids) {
      const bids = await getBidsBySowId(sowId);
      for (const bid of bids) {
        if (!isSelectedBidTrue(bid?.Selected_Bid ?? bid?.selected_bid)) {
          continue;
        }
        const sow = sowById.get(sowId);
        conflicts.push({
          id: asText(bid.id),
          name: asText(bid.Name) || asText(bid.id),
          vendorName: lookupName(bid.Vendor as ZohoLookup) || "—",
          vendorPrice: sow?.vendorPriceTotal ?? null,
          sowId,
        });
      }
    }

    return { ok: true, bids: conflicts };
  } catch (error) {
    console.error("[add-mass-bid] selected-bids", error);
    return {
      ok: false,
      message:
        error instanceof Error ?
          error.message
        : "Failed to load selected bids.",
      bids: [],
    };
  }
}

async function uploadFileToZoho(file: AddMassBidUploadedFile): Promise<string> {
  const url = `${ZOHO_CRM_BASE}/files`;

  async function post(token: string) {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Uint8Array.from(file.bytes)], {
        type: file.type || "application/octet-stream",
      }),
      file.name,
    );
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
  let result = await post(token);
  if (isZohoTokenExpiredResponse(result.res, result.body)) {
    invalidateZohoAccessTokenCache();
    token = await getZohoAccessToken({ force: true });
    result = await post(token);
  }

  const row = Array.isArray(result.body?.data) ? result.body.data[0] : null;
  const fileId = String(row?.details?.id ?? row?.id ?? "").trim();
  if (!result.res.ok || !fileId) {
    const detail =
      row?.message ||
      result.body?.message ||
      row?.code ||
      `HTTP ${result.res.status}`;
    throw new Error(`CRM upload failed: ${String(detail)}`);
  }
  return fileId;
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

async function uploadBidFileToWorkDrive(
  file: AddMassBidUploadedFile,
): Promise<string> {
  if (file.size > ADD_MASS_BID_MAX_FILE_BYTES) {
    throw new Error("Bid file must be under 5MB.");
  }

  const fileId = await uploadFileToZoho(file);
  const args = {
    fileName: file.name,
    fileContent: fileId,
    contentType: file.type || "",
    fileSize: file.size,
  };

  let { res, body } = await executeZohoCrmFunction(
    UPLOAD_BID_FILE_FUNCTION,
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
      UPLOAD_BID_FILE_FUNCTION,
      args,
      { authType: "oauth" },
    );
    res = fallback.res;
    body = fallback.body;
    code = String(body?.code ?? "").toUpperCase();
  }

  const output = parseFunctionOutput(body?.details?.output);
  const result =
    output && typeof output === "object" && "results" in output ?
      (output as { results?: Record<string, unknown> }).results
    : (output as Record<string, unknown> | null);

  if (
    result &&
    typeof result === "object" &&
    result.success === true &&
    typeof result.url === "string" &&
    result.url
  ) {
    return result.url;
  }

  const errMsg =
    (result && typeof result === "object" ?
      asText(result.error || result.message)
    : "") ||
    asText(body?.message) ||
    "WorkDrive upload failed.";
  throw new Error(errMsg);
}

async function uncheckSelectedBid(bidId: string) {
  const { res, body } = await fetchZohoJson(`${ZOHO_CRM_BASE}/Bids`, {
    method: "PUT",
    body: {
      data: [{ id: bidId, Selected_Bid: false }],
      trigger: ["workflow"],
    },
  });
  const row = Array.isArray(body?.data) ? body.data[0] : null;
  const code = String(row?.code ?? body?.code ?? "").toUpperCase();
  if (!res.ok || (code && code !== "SUCCESS")) {
    const detail =
      row?.message || body?.message || row?.code || body?.code || `HTTP ${res.status}`;
    console.warn("[add-mass-bid] uncheck bid failed", bidId, detail);
  }
}

function buildScopeOfWorkDetails(
  referenceItems: MassBidLineItem[],
  vendorPrices: number[],
) {
  return referenceItems.map((item, index) => ({
    OurServices: { id: item.serviceId },
    Start_Date: item.startDate || undefined,
    End_Date: item.endDate || undefined,
    Invoice_Price: item.clientPrice,
    Vendor_Price:
      typeof vendorPrices[index] === "number" && Number.isFinite(vendorPrices[index]) ?
        vendorPrices[index]
      : item.vendorPrice,
  }));
}

export async function createMassBids(
  payload: AddMassBidPayload,
  file?: AddMassBidUploadedFile,
): Promise<AddMassBidResult> {
  const ids = uniqueIds(payload.selectedRecordIds ?? []);
  const vendorId = String(payload.vendorId ?? "").trim();
  const selectedBid = Boolean(payload.selectedBid);
  const bidNotes = String(payload.bidNotes ?? "").trim();
  const vendorPrices = Array.isArray(payload.vendorPrices) ?
      payload.vendorPrices.map((value) => asNumber(value))
    : [];
  const confirmUncheck = Boolean(payload.confirmUncheck);
  let bidFileUrl = String(payload.bidFileUrl ?? "").trim();

  if (ids.length === 0) {
    return { ok: false, message: "Select at least one SOW." };
  }
  if (!vendorId) {
    return { ok: false, message: "Vendor is required." };
  }

  const context = await loadMassBidContext(ids);
  if (!context.ok) {
    return { ok: false, message: context.message || "Failed to load SOWs." };
  }
  if (!context.lineItemsMatch) {
    return {
      ok: false,
      message: "line items don't match, can't submit mass bid",
    };
  }

  const referenceItems = context.referenceLineItems ?? [];
  if (referenceItems.length === 0) {
    return { ok: false, message: "No Scope of Work line items found." };
  }

  if (file) {
    try {
      bidFileUrl = await uploadBidFileToWorkDrive(file);
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Bid file upload failed.",
      };
    }
  }

  if (selectedBid && !confirmUncheck) {
    const selected = await loadSelectedBidsToUncheck(ids);
    if (!selected.ok) {
      return { ok: false, message: selected.message || "Failed to check bids." };
    }
    if ((selected.bids?.length ?? 0) > 0) {
      return {
        ok: false,
        requiresConfirm: true,
        selectedBids: selected.bids,
        message:
          "Existing selected bids will be unchecked. Confirm to continue.",
      };
    }
  }

  if (selectedBid && confirmUncheck) {
    const selected = await loadSelectedBidsToUncheck(ids);
    for (const bid of selected.bids ?? []) {
      if (bid.id) await uncheckSelectedBid(bid.id);
    }
  }

  const scopeOfWorkDetails = buildScopeOfWorkDetails(
    referenceItems,
    vendorPrices,
  );
  const baseBidNumber = `MB${String(Date.now()).slice(-6)}`;
  const sows = context.sows ?? [];
  const errors: Array<{ sowId: string; message: string }> = [];
  let createdCount = 0;

  for (let i = 0; i < ids.length; i += 1) {
    const sowId = ids[i];
    const sow = sows.find((row) => row.sowId === sowId) ?? sows[i];

    let parentAccountId = sow?.parentAccountId || "";
    let locationName = sow?.locationName || "";

    if (sow?.companyNameId && !parentAccountId) {
      const site = await fetchSiteAccount(sow.companyNameId);
      if (site) {
        parentAccountId = lookupId(site.Parent_Account as ZohoLookup);
        if (!locationName) {
          locationName = locationNameOf(site.Location_Name);
        }
      }
    }

    const bidNumber =
      ids.length > 1 ? `${baseBidNumber}-${i + 1}` : baseBidNumber;

    const bidPayload: Record<string, unknown> = {
      Name: bidNumber,
      Vendor: { id: vendorId },
      Deal: { id: sowId },
      Scope_of_Work_Details: scopeOfWorkDetails,
      Selected_Bid: selectedBid,
      Bid_Notes: bidNotes,
    };

    if (bidFileUrl) bidPayload.URL = bidFileUrl;
    if (sow?.companyNameId) {
      bidPayload.Site_Number = { id: sow.companyNameId };
    }
    if (parentAccountId) {
      bidPayload.Company_Name_New = { id: parentAccountId };
    }
    if (locationName) bidPayload.Location_Name = locationName;
    if (sow?.opsOwnerId) bidPayload.Olio_Ops_Owner = { id: sow.opsOwnerId };
    if (sow?.salesOwnerId) {
      bidPayload.Olio_Sales_Owner = { id: sow.salesOwnerId };
    }
    if (sow?.address) bidPayload.Address = sow.address;
    if (sow?.city) bidPayload.City = sow.city;
    if (sow?.state) bidPayload.State = sow.state;
    if (sow?.zip) bidPayload.Zip = sow.zip;
    if (SEASONAL_CONTRACT_BIDS_LAYOUT_ID) {
      bidPayload.Layout = { id: SEASONAL_CONTRACT_BIDS_LAYOUT_ID };
    }

    const { res, body } = await fetchZohoJson(`${ZOHO_CRM_BASE}/Bids`, {
      method: "POST",
      body: {
        data: [bidPayload],
        trigger: ["workflow", "approval"],
      },
    });

    const row = Array.isArray(body?.data) ? body.data[0] : null;
    const code = String(row?.code ?? body?.code ?? "").toUpperCase();
    const createdId =
      row?.details?.id != null ? String(row.details.id)
      : row?.id != null ? String(row.id)
      : "";

    if (res.ok && code === "SUCCESS" && createdId) {
      createdCount += 1;
    } else {
      errors.push({
        sowId,
        message: String(
          row?.message || body?.message || code || `HTTP ${res.status}`,
        ),
      });
    }
  }

  if (createdCount === 0) {
    return {
      ok: false,
      message: errors[0]?.message || "Mass Bid creation failed.",
      createdCount: 0,
      errors,
    };
  }

  return {
    ok: true,
    createdCount,
    errors: errors.length > 0 ? errors : undefined,
    message:
      errors.length > 0 ?
        `Created ${createdCount} of ${ids.length} bid(s); some failed.`
      : `Successfully created ${createdCount} bid${createdCount === 1 ? "" : "s"}.`,
  };
}
