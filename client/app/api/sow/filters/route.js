import { loadModuleFilterMeta } from "@/lib/contracts/filterMeta";
import { ZOHO_SOW_MODULE } from "@/lib/sow/columns";
import { getSowOfflineFilterMeta } from "@/lib/sow/static";
import { getZohoModuleFieldsUrl, getZohoRelatedListsUrl } from "@/lib/zoho";

export async function GET() {
  try {
    const { sections, fields, source } = await loadModuleFilterMeta(ZOHO_SOW_MODULE);

    return Response.json({
      sections,
      fields,
      source,
      zohoUrl: getZohoModuleFieldsUrl(ZOHO_SOW_MODULE),
      relatedModulesUrl: getZohoRelatedListsUrl(ZOHO_SOW_MODULE),
      filterableCount: fields.length,
      sectionCount: sections.length,
      offlineDemo: source === "offline-demo",
    });
  } catch (err) {
    console.error("SOW filters metadata failed:", err);
    const message = err instanceof Error ? err.message : "Failed to load filter metadata";
    const offline = getSowOfflineFilterMeta();
    return Response.json({
      error: message,
      sections: offline.sections,
      fields: offline.fields,
      source: offline.source,
      offlineDemo: true,
    });
  }
}
