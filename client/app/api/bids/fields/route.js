import {
  FALLBACK_FIELD_CATALOG,
  isExcludedBidCatalogField,
  ZOHO_BIDS_MODULE,
} from "@/lib/bids/columns";
import { getZohoModuleFieldsUrl, loadModuleFieldCatalog } from "@/lib/zoho";

function filterClientFields(fields) {
  return fields.filter((f) => !isExcludedBidCatalogField(f));
}

function fallbackPayload(warning) {
  const fields = FALLBACK_FIELD_CATALOG.map((f) => ({ ...f, visible: true }));
  return {
    fields,
    sections: null,
    droppedSectionFieldApiNames: [],
    sectionSource: "fallback",
    source: "fallback",
    warning,
    count: FALLBACK_FIELD_CATALOG.length,
  };
}

export async function GET() {
  const zohoUrl = getZohoModuleFieldsUrl(ZOHO_BIDS_MODULE);

  try {
    const { fields, source } = await loadModuleFieldCatalog(ZOHO_BIDS_MODULE, {
      excludeField: isExcludedBidCatalogField,
      fallbackFields: FALLBACK_FIELD_CATALOG,
    });
    const clientFields = filterClientFields(fields);

    if (source === "zoho") {
      return Response.json({
        fields: clientFields,
        sections: null,
        droppedSectionFieldApiNames: [],
        sectionSource: "zoho",
        source: "zoho",
        zohoUrl,
        count: clientFields.length,
      });
    }

    return Response.json({
      ...fallbackPayload(
        "Could not load Bids fields from Zoho. Showing a short fallback list.",
      ),
      zohoUrl,
    });
  } catch (err) {
    console.error("Zoho Bids fields request failed:", err);
    const message = err instanceof Error ? err.message : "Failed to reach Zoho CRM";
    return Response.json(
      fallbackPayload(`Could not reach Zoho (${message}). Showing a short fallback list.`),
    );
  }
}
