/**
 * API for Generate Client Proposal widget (Zoho HTML port).
 *
 * GET  ?action=me
 * GET  ?action=record&module=&id=
 * GET  ?action=related&module=&id=&related=&page=&per_page=
 * GET  ?action=user&id=
 * POST ?action=update   { Entity, APIData, Trigger? }
 * POST ?action=insert   { Entity, APIData, Trigger? }
 * POST ?action=attach   multipart: module, recordId, file
 * POST ?action=function { name, arguments }
 */

import {
  attachFileToRecord,
  executeReadVendorProposal,
  insertCrmRecord,
  loadCrmUser,
  loadCurrentCrmUser,
  loadRecord,
  loadRelatedRecords,
  updateCrmRecord,
} from "@/widgets/generate-client-proposal/server/generateClientProposal";

function actionOf(request: Request) {
  return new URL(request.url).searchParams.get("action")?.trim() || "";
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

    if (action === "related") {
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
        await loadRelatedRecords({
          moduleName,
          recordId: id,
          related,
          page: Number(searchParams.get("page") || 1),
          perPage: Number(searchParams.get("per_page") || 50),
        }),
      );
    }

    if (action === "user") {
      const id = searchParams.get("id")?.trim() || "";
      if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
      }
      return Response.json(await loadCrmUser(id));
    }

    return Response.json(
      { error: `Unknown GET action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/generate-client-proposal GET ${action}]`, error);
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
    if (action === "update") {
      const body = (await request.json().catch(() => ({}))) as {
        Entity?: string;
        APIData?: Record<string, unknown>;
        Trigger?: string[];
      };
      return Response.json(
        await updateCrmRecord({
          moduleName: String(body.Entity || "Deals"),
          apiData: body.APIData || {},
          trigger: body.Trigger,
        }),
      );
    }

    if (action === "insert") {
      const body = (await request.json().catch(() => ({}))) as {
        Entity?: string;
        APIData?: Record<string, unknown>;
        Trigger?: string[];
      };
      return Response.json(
        await insertCrmRecord({
          moduleName: String(body.Entity || "Tasks"),
          apiData: body.APIData || {},
          trigger: body.Trigger,
        }),
      );
    }

    if (action === "attach") {
      const form = await request.formData();
      const file = form.get("file");
      const moduleName = String(form.get("module") ?? "Deals").trim() || "Deals";
      const recordId = String(form.get("recordId") ?? "").trim();
      if (!(file instanceof File)) {
        return Response.json({ error: "Missing file" }, { status: 400 });
      }
      if (!recordId) {
        return Response.json({ error: "Missing recordId" }, { status: 400 });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      return Response.json(
        await attachFileToRecord({
          moduleName,
          recordId,
          fileName: file.name || "proposal.pdf",
          bytes,
          contentType: file.type || "application/pdf",
        }),
      );
    }

    if (action === "function") {
      const body = (await request.json().catch(() => ({}))) as {
        name?: string;
        arguments?: string | Record<string, unknown>;
      };
      const name = String(body.name || "").trim();
      if (name !== "read_vendor_proposal") {
        return Response.json(
          { error: `Function not allowed: ${name || "(none)"}` },
          { status: 400 },
        );
      }
      return Response.json(
        await executeReadVendorProposal(body.arguments ?? "{}"),
      );
    }

    return Response.json(
      { error: `Unknown POST action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/generate-client-proposal POST ${action}]`, error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
        message: error instanceof Error ? error.message : "Request failed",
        data: [
          {
            code: "ERROR",
            message: error instanceof Error ? error.message : "Request failed",
          },
        ],
      },
      { status: 500 },
    );
  }
}
