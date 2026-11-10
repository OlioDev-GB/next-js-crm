/**
 * POST { selectedRecordIds: string[] } → Zoho Create Bid custom button
 */

import { runCreateBid } from "@/widgets/create-bid/server/runCreateBid";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      selectedRecordIds?: unknown;
      recordIds?: unknown;
      ids?: unknown;
    };

    const selectedRecordIds = stringArray(
      body.selectedRecordIds ?? body.recordIds ?? body.ids,
    );

    const result = await runCreateBid(selectedRecordIds);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[widgets/create-bid]", error);
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to create bid.",
      },
      { status: 502 },
    );
  }
}
