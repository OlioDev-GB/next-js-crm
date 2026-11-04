import {
  createMassBids,
  loadMassBidContext,
  loadSelectedBidsToUncheck,
  searchVendorsForMassBid,
} from "@/widgets/add-mass-bid/server/addMassBid";
import type {
  AddMassBidPayload,
  AddMassBidUploadedFile,
} from "@/widgets/add-mass-bid/types";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function parseIdsParam(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function numberArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const n = typeof item === "number" ? item : parseFloat(String(item));
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * GET ?action=context&ids=id1,id2
 * GET ?action=vendors&q=...
 * GET ?action=selected-bids&ids=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = (searchParams.get("action") || "").trim().toLowerCase();
    const ids = parseIdsParam(
      searchParams.get("ids") || searchParams.get("selectedRecordIds"),
    );
    const q = searchParams.get("q")?.trim() || "";

    if (action === "vendors" || (!action && q)) {
      const result = await searchVendorsForMassBid(q);
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    if (action === "selected-bids") {
      const result = await loadSelectedBidsToUncheck(ids);
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    if (action === "context" || (!action && ids.length > 0)) {
      const result = await loadMassBidContext(ids);
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    return Response.json(
      {
        ok: false,
        message: "Provide action=context|vendors|selected-bids.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[widgets/add-mass-bid GET]", error);
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to load mass bid data",
      },
      { status: 502 },
    );
  }
}

/** POST — JSON or multipart (bidFile) to create mass bids. */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: AddMassBidPayload;
    let file: AddMassBidUploadedFile | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const idsEntry = formData.get("selectedRecordIds");
      let selectedRecordIds: string[] = [];
      if (typeof idsEntry === "string") {
        try {
          selectedRecordIds = stringArray(JSON.parse(idsEntry));
        } catch {
          selectedRecordIds = parseIdsParam(idsEntry);
        }
      }

      let vendorPrices: number[] = [];
      const pricesEntry = formData.get("vendorPrices");
      if (typeof pricesEntry === "string") {
        try {
          vendorPrices = numberArray(JSON.parse(pricesEntry));
        } catch {
          vendorPrices = [];
        }
      }

      payload = {
        selectedRecordIds,
        vendorId: String(formData.get("vendorId") ?? ""),
        selectedBid: String(formData.get("selectedBid") ?? "") === "true",
        bidNotes: String(formData.get("bidNotes") ?? ""),
        vendorPrices,
        confirmUncheck:
          String(formData.get("confirmUncheck") ?? "") === "true",
        bidFileUrl:
          typeof formData.get("bidFileUrl") === "string" ?
            String(formData.get("bidFileUrl"))
          : undefined,
      };

      const fileEntry = formData.get("bidFile");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        const bytes = new Uint8Array(await fileEntry.arrayBuffer());
        file = {
          name: fileEntry.name,
          type: fileEntry.type,
          bytes,
          size: fileEntry.size,
        };
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as Partial<
        AddMassBidPayload
      > & { action?: string };
      payload = {
        selectedRecordIds: stringArray(body.selectedRecordIds),
        vendorId: typeof body.vendorId === "string" ? body.vendorId : "",
        selectedBid: Boolean(body.selectedBid),
        bidNotes: typeof body.bidNotes === "string" ? body.bidNotes : "",
        vendorPrices: numberArray(body.vendorPrices),
        confirmUncheck: Boolean(body.confirmUncheck),
        bidFileUrl:
          typeof body.bidFileUrl === "string" ? body.bidFileUrl : undefined,
      };
    }

    const result = await createMassBids(payload, file);
    const status =
      result.ok ? 200
      : result.requiresConfirm ? 409
      : 400;
    return Response.json(result, { status });
  } catch (error) {
    console.error("[widgets/add-mass-bid POST]", error);
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
