import {
  FALLBACK_FIELD_CATALOG,
  isExcludedAccountCatalogField,
  ZOHO_ACCOUNTS_MODULE,
} from "@/lib/accounts/columns";
import { getZohoModuleFieldsUrl, loadModuleFieldCatalog } from "@/lib/zoho";

function filterClientFields(fields) {
  return fields.filter((f) => !isExcludedAccountCatalogField(f));
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
  const zohoUrl = getZohoModuleFieldsUrl(ZOHO_ACCOUNTS_MODULE);

  try {
    const { fields, source } = await loadModuleFieldCatalog(ZOHO_ACCOUNTS_MODULE, {
      excludeField: isExcludedAccountCatalogField,
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
        "Could not load Accounts fields from Zoho. Showing a short fallback list.",
      ),
      zohoUrl,
    });
  } catch (err) {
    console.error("Zoho Accounts fields request failed:", err);
    const message = err instanceof Error ? err.message : "Failed to reach Zoho CRM";
    return Response.json(
      fallbackPayload(`Could not reach Zoho (${message}). Showing a short fallback list.`),
    );
  }
}
