/**
 * API for Create Contract PDF widget (SOW / Deals CRM port).
 *
 * GET  ?action=me
 * GET  ?action=record&module=&id=
 * GET  ?action=related-list&module=&id=&related=&page=&per_page=
 * GET  ?action=contract&id=          (legacy Contracts host)
 * GET  ?action=related&module=&id=   (legacy)
 * POST ?action=upload
 * POST ?action=function              { name, arguments }
 * POST ?action=update                { Entity, APIData }
 * POST ?action=send-sign             (legacy)
 * PATCH ?action=status               (legacy)
 */

import {
  loadContractForPdf,
  loadCurrentCrmUser,
  loadRecord,
  loadRelatedList,
  loadRelatedRecord,
  sendZohoSignContract,
  updateContractSignStatus,
  updateCrmRecord,
  uploadPdfFileToZoho,
  type SendZohoSignPayload,
} from "@/widgets/create-contract-pdf/server/createContractPdf";

function actionOf(request: Request) {
  return new URL(request.url).searchParams.get("action")?.trim() || "";
}

function parseSignArgs(body: {
  arguments?: string | Record<string, unknown>;
  [key: string]: unknown;
}): SendZohoSignPayload {
  let args: Record<string, unknown> = body;
  if (body.arguments != null) {
    args =
      typeof body.arguments === "string" ?
        (JSON.parse(body.arguments) as Record<string, unknown>)
      : (body.arguments as Record<string, unknown>);
  }
  return {
    id: typeof args.id === "string" ? args.id : String(args.id ?? ""),
    file_id:
      typeof args.file_id === "string" ?
        args.file_id
      : String(args.file_id ?? ""),
    signature_fields: args.signature_fields ?? [],
    recipient_name:
      typeof args.recipient_name === "string" ? args.recipient_name : "",
    recipient_email:
      typeof args.recipient_email === "string" ? args.recipient_email : "",
    owner_email:
      typeof args.owner_email === "string" ? args.owner_email : "",
  };
}

export async function GET(request: Request) {
  const action = actionOf(request);
  const { searchParams } = new URL(request.url);

  try {
    if (action === "me") {
      return Response.json(await loadCurrentCrmUser());
    }

    if (action === "record") {
      const moduleName = searchParams.get("module")?.trim() || "Deals";
      const id = searchParams.get("id")?.trim() || "";
      if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
      }
      return Response.json(await loadRecord(moduleName, id));
    }

    if (action === "related-list") {
      const moduleName = searchParams.get("module")?.trim() || "Deals";
      const id = searchParams.get("id")?.trim() || "";
      const related = searchParams.get("related")?.trim() || "";
      if (!id || !related) {
        return Response.json(
          { error: "id and related are required" },
          { status: 400 },
        );
      }
      return Response.json(
        await loadRelatedList({
          moduleName,
          recordId: id,
          related,
          page: Number(searchParams.get("page") || 1),
          perPage: Number(searchParams.get("per_page") || 100),
        }),
      );
    }

    // Legacy Contracts host actions
    if (action === "contract") {
      const id = searchParams.get("id")?.trim() || "";
      if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
      }
      const record = await loadContractForPdf(id);
      return Response.json({ data: [record] });
    }

    if (action === "related") {
      const moduleName = searchParams.get("module")?.trim() || "";
      const id = searchParams.get("id")?.trim() || "";
      if (!moduleName || !id) {
        return Response.json(
          { error: "module and id are required" },
          { status: 400 },
        );
      }
      return Response.json(await loadRelatedRecord(moduleName, id));
    }

    return Response.json(
      { error: `Unknown GET action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/create-contract-pdf GET ${action}]`, error);
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
    if (action === "upload") {
      const form = await request.formData();
      const file = form.get("file");
      const recordId =
        String(form.get("recordId") ?? form.get("contractId") ?? "").trim();
      if (!(file instanceof File)) {
        return Response.json({ error: "Missing file" }, { status: 400 });
      }
      const buffer = new Uint8Array(await file.arrayBuffer());
      const fileId = await uploadPdfFileToZoho(
        {
          name: file.name || "contract.pdf",
          type: file.type || "application/pdf",
          bytes: buffer,
        },
        { contractId: recordId },
      );
      return Response.json({
        data: [{ details: { id: fileId }, code: "SUCCESS" }],
      });
    }

    if (action === "function" || action === "send-sign") {
      const body = (await request.json().catch(() => ({}))) as {
        name?: string;
        arguments?: string | Record<string, unknown>;
        [key: string]: unknown;
      };
      const payload = parseSignArgs(body);
      const result = await sendZohoSignContract(payload);
      if (!result.ok) {
        return Response.json(
          {
            code: "failure",
            status: "error",
            message: result.message,
            details: {
              output:
                typeof result.output === "string" ?
                  result.output
                : JSON.stringify(
                    result.output ?? {
                      status: "failed",
                      error: result.message,
                    },
                  ),
              message: result.message,
            },
          },
          { status: 400 },
        );
      }

      return Response.json({
        code: "success",
        status: "success",
        details: {
          output:
            typeof result.output === "string" ?
              result.output
            : JSON.stringify(result.output ?? {}),
        },
      });
    }

    if (action === "update") {
      const body = (await request.json().catch(() => ({}))) as {
        Entity?: string;
        APIData?: Record<string, unknown>;
      };
      return Response.json(
        await updateCrmRecord(
          String(body.Entity || "Deals"),
          body.APIData || {},
        ),
      );
    }

    return Response.json(
      { error: `Unknown POST action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/create-contract-pdf POST ${action}]`, error);
    return Response.json(
      {
        code: "failure",
        status: "error",
        error: error instanceof Error ? error.message : "Request failed",
        message: error instanceof Error ? error.message : "Request failed",
        data: [],
        details: {
          message: error instanceof Error ? error.message : "Request failed",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const action = actionOf(request);
  if (action && action !== "status") {
    return Response.json(
      { error: `Unknown PATCH action: ${action}` },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      contractType?: string;
      requestId?: string;
      Entity?: string;
      APIData?: Record<string, unknown>;
    };

    if (body.APIData?.id) {
      const api = body.APIData;
      const id = String(api.id);
      const isVendor =
        "Vendor_Signed_Status" in api || "Vendor_Sign_Req_Id" in api;
      const requestId = String(
        api.Vendor_Sign_Req_Id ??
          api.Client_Sign_Req_Id ??
          body.requestId ??
          "",
      );
      const result = await updateContractSignStatus({
        id,
        contractType: isVendor ? "Vendor" : "Client",
        requestId,
        moduleName: String(body.Entity || "Deals"),
      });
      return Response.json({ data: [{ code: "SUCCESS", details: result }] });
    }

    const id = String(body.id ?? "").trim();
    const requestId = String(body.requestId ?? "").trim();
    const contractType = body.contractType === "Vendor" ? "Vendor" : "Client";

    if (!id || !requestId) {
      return Response.json(
        { error: "id and requestId are required" },
        { status: 400 },
      );
    }

    const result = await updateContractSignStatus({
      id,
      contractType,
      requestId,
      moduleName: String(body.Entity || "Deals"),
    });
    return Response.json({ data: [{ code: "SUCCESS", details: result }] });
  } catch (error) {
    console.error("[widgets/create-contract-pdf PATCH status]", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Update failed",
      },
      { status: 502 },
    );
  }
}
