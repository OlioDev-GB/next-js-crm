/**
 * API for Create SOW Records — List widget.
 *
 * GET  ?action=me
 * GET  ?action=record&id=&module=
 * POST ?action=insert
 * POST ?action=update
 * POST ?action=search
 */

import {
  insertRecord,
  loadCurrentCrmUser,
  loadRecord,
  searchRecords,
  updateRecord,
} from "@/widgets/create-sow-record/server/createSowRecord";

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
      const id = searchParams.get("id")?.trim() || "";
      const moduleName = searchParams.get("module")?.trim() || "Accounts";
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
    console.error(`[widgets/create-sow-record GET ${action}]`, error);
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

    if (action === "insert") {
      return Response.json(
        await insertRecord({
          Entity: String(body.Entity ?? ""),
          APIData: body.APIData as Record<string, unknown> | undefined,
          Trigger: Array.isArray(body.Trigger)
            ? (body.Trigger as string[])
            : undefined,
        }),
      );
    }

    if (action === "update") {
      return Response.json(
        await updateRecord({
          Entity: String(body.Entity ?? ""),
          APIData: body.APIData as Record<string, unknown> | undefined,
        }),
      );
    }

    if (action === "search") {
      return Response.json(
        await searchRecords({
          Entity: String(body.Entity ?? ""),
          Type: String(body.Type ?? ""),
          Query: String(body.Query ?? ""),
        }),
      );
    }

    return Response.json(
      { error: `Unknown POST action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/create-sow-record POST ${action}]`, error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 502 },
    );
  }
}
