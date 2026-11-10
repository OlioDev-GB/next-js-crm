/**
 * API for Send SOW widget (Zoho HTML port of sow sourcing status).
 *
 * GET  ?action=record&module=&id=
 * POST ?action=upload   multipart: file, recordId?
 * POST ?action=function { name, arguments }
 */

import {
  executeSendSowFunction,
  loadRecord,
  uploadFileToZoho,
} from "@/widgets/send-sow/server/sendSow";

function actionOf(request: Request) {
  return new URL(request.url).searchParams.get("action")?.trim() || "";
}

export async function GET(request: Request) {
  const action = actionOf(request);
  const { searchParams } = new URL(request.url);

  try {
    if (action === "record") {
      const moduleName = searchParams.get("module")?.trim() || "Deals";
      const id = searchParams.get("id")?.trim() || "";
      if (!id) {
        return Response.json({ error: "Missing id" }, { status: 400 });
      }
      return Response.json(await loadRecord(moduleName, id));
    }

    return Response.json(
      { error: `Unknown GET action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/send-sow GET ${action}]`, error);
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
      if (!(file instanceof File)) {
        return Response.json({ error: "Missing file" }, { status: 400 });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      return Response.json(
        await uploadFileToZoho({
          name: file.name || "attachment",
          type: file.type || "application/octet-stream",
          bytes,
        }),
      );
    }

    if (action === "function") {
      const body = (await request.json().catch(() => ({}))) as {
        name?: string;
        arguments?: string | Record<string, unknown>;
      };
      return Response.json(
        await executeSendSowFunction(
          String(body.name || ""),
          body.arguments ?? "{}",
        ),
      );
    }

    return Response.json(
      { error: `Unknown POST action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/send-sow POST ${action}]`, error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
        message: error instanceof Error ? error.message : "Request failed",
        code: "ERROR",
      },
      { status: 500 },
    );
  }
}
