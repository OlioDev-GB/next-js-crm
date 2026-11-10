/**
 * API for Opportunity Spotted Stage widget.
 *
 * GET  ?action=record&module=&id=
 * POST ?action=update  { Entity, APIData, Trigger? }
 */

import {
  loadDealRecord,
  updateDealStage,
} from "@/widgets/opportunity-spotted/server/opportunitySpotted";

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
      if (moduleName !== "Deals") {
        return Response.json(
          { error: `Module not allowed: ${moduleName}` },
          { status: 400 },
        );
      }
      return Response.json(await loadDealRecord(id));
    }

    return Response.json(
      { error: `Unknown GET action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/opportunity-spotted GET ${action}]`, error);
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
        APIData?: { id?: string; Stage?: string; [key: string]: unknown };
        Trigger?: string[];
      };
      const entity = String(body.Entity || "Deals").trim();
      if (entity !== "Deals") {
        return Response.json(
          { error: `Module not allowed: ${entity}` },
          { status: 400 },
        );
      }
      const api = body.APIData || {};
      return Response.json(
        await updateDealStage({
          recordId: String(api.id || ""),
          stage: String(api.Stage || ""),
          trigger: body.Trigger,
        }),
      );
    }

    return Response.json(
      { error: `Unknown POST action: ${action || "(none)"}` },
      { status: 400 },
    );
  } catch (error) {
    console.error(`[widgets/opportunity-spotted POST ${action}]`, error);
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
