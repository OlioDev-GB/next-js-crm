/**
 * POST { selectedRecordIds: string[] } → Zoho Generate Bill PDF custom button
 */

import { runGenerateBillPdf } from "@/widgets/generate-bill-pdf/server/runGenerateBillPdf";

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

    const result = await runGenerateBillPdf(selectedRecordIds);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[widgets/generate-bill-pdf]", error);
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to generate bill PDF.",
      },
      { status: 502 },
    );
  }
}
