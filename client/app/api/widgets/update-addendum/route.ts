import { updateSowAddendum } from "@/widgets/update-addendum/server/updateAddendum";
import type { UpdateAddendumPayload } from "@/widgets/update-addendum/types";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<
      UpdateAddendumPayload
    >;
    const payload: UpdateAddendumPayload = {
      selectedRecordIds: stringArray(body.selectedRecordIds),
      text: typeof body.text === "string" ? body.text : "",
      module: typeof body.module === "string" ? body.module : "Deals",
    };

    const result = await updateSowAddendum(payload);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[widgets/update-addendum]", error);
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
