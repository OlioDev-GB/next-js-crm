import { runScListFunction } from "@/widgets/service-completions/server/runScListFunction";
import type {
  RunScListFunctionPayload,
  ScListFunctionActionId,
} from "@/widgets/service-completions/types";
import { SC_LIST_FUNCTION_ACTIONS } from "@/widgets/service-completions/types";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function isActionId(value: string): value is ScListFunctionActionId {
  return value in SC_LIST_FUNCTION_ACTIONS;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<
      RunScListFunctionPayload
    >;
    const actionId = String(body.actionId || "").trim();
    if (!isActionId(actionId)) {
      return Response.json(
        { ok: false, message: "Unknown Service Completions list action." },
        { status: 400 },
      );
    }

    const payload: RunScListFunctionPayload = {
      actionId,
      selectedRecordIds: stringArray(body.selectedRecordIds),
      module:
        typeof body.module === "string" ? body.module : "ServiceCompletions",
    };

    const result = await runScListFunction(payload);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[widgets/service-completions-list-action]", error);
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
