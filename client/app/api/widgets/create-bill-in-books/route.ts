/**
 * POST { recordIds: string[] } → createbillfromvendorinvoice
 */

import { createBillsInBooks } from "@/widgets/create-bill-in-books/server/createBillInBooks";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      recordIds?: string[];
      ids?: string[];
    };
    const recordIds = Array.isArray(body.recordIds)
      ? body.recordIds
      : Array.isArray(body.ids)
        ? body.ids
        : [];

    const result = await createBillsInBooks(recordIds);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[widgets/create-bill-in-books]", error);
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to create bills.",
      },
      { status: 502 },
    );
  }
}
