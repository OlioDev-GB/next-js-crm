/**
 * API for Approved by Ops widget.
 *
 * GET  ?action=me
 * GET  ?action=config
 * POST ?action=function
 * POST ?action=update
 */

import {
  executeApprovedByOpsFunction,
  getApprovedByOpsConfig,
  loadCurrentCrmUserWithProfile,
  updateVendorInvoiceRecord,
} from "@/widgets/approved-by-ops/server/approvedByOps";

function actionOf(request: Request) {
  return new URL(request.url).searchParams.get("action")?.trim() || "";
}

export async function GET(request: Request) {
  const action = actionOf(request);

  try {
    if (action === "me") {
      return Response.json(await loadCurrentCrmUserWithProfile());
    }

    if (action === "config") {
      return Response.json(getApprovedByOpsConfig());
    }

    return Response.json(
      { error: `Unknown GET action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/approved-by-ops GET ${action}]`, error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const action = actionOf(request);

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (action === "function") {
      return Response.json(
        await executeApprovedByOpsFunction({
          name: String(body.name ?? ""),
          arguments: body.arguments,
        }),
      );
    }

    if (action === "update") {
      return Response.json(
        await updateVendorInvoiceRecord({
          Entity: String(body.Entity ?? "Vendor_Invoices"),
          APIData: body.APIData as Record<string, unknown> | undefined,
        }),
      );
    }

    return Response.json(
      { error: `Unknown POST action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/approved-by-ops POST ${action}]`, error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 502 },
    );
  }
}
