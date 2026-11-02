import { loadModuleFilterMeta } from "@/lib/contracts/filterMeta";
import { ZOHO_SERVICE_COMPLETIONS_MODULE } from "@/lib/service-completions/columns";
import { getServiceCompletionsOfflineFilterMeta } from "@/lib/service-completions/static";
import { getZohoModuleFieldsUrl, getZohoRelatedListsUrl } from "@/lib/zoho";

export async function GET() {
  try {
    const { sections, fields, source } = await loadModuleFilterMeta(ZOHO_SERVICE_COMPLETIONS_MODULE);

    return Response.json({
      sections,
      fields,
      source,
      zohoUrl: getZohoModuleFieldsUrl(ZOHO_SERVICE_COMPLETIONS_MODULE),
      relatedModulesUrl: getZohoRelatedListsUrl(ZOHO_SERVICE_COMPLETIONS_MODULE),
      filterableCount: fields.length,
      sectionCount: sections.length,
      offlineDemo: source === "offline-demo",
    });
  } catch (err) {
    console.error("Service Completions filters metadata failed:", err);
    const message = err instanceof Error ? err.message : "Failed to load filter metadata";
    const offline = getServiceCompletionsOfflineFilterMeta();
    return Response.json({
      error: message,
      sections: offline.sections,
      fields: offline.fields,
      source: offline.source,
      offlineDemo: true,
    });
  }
}
