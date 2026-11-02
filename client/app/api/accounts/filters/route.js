import { loadModuleFilterMeta } from "@/lib/contracts/filterMeta";
import { ZOHO_ACCOUNTS_MODULE } from "@/lib/accounts/columns";
import { getAccountsOfflineFilterMeta } from "@/lib/accounts/static";
import { getZohoModuleFieldsUrl, getZohoRelatedListsUrl } from "@/lib/zoho";

export async function GET() {
  try {
    const { sections, fields, source } = await loadModuleFilterMeta(ZOHO_ACCOUNTS_MODULE);

    return Response.json({
      sections,
      fields,
      source,
      zohoUrl: getZohoModuleFieldsUrl(ZOHO_ACCOUNTS_MODULE),
      relatedModulesUrl: getZohoRelatedListsUrl(ZOHO_ACCOUNTS_MODULE),
      filterableCount: fields.length,
      sectionCount: sections.length,
      offlineDemo: source === "offline-demo",
    });
  } catch (err) {
    console.error("Client/Site filters metadata failed:", err);
    const message = err instanceof Error ? err.message : "Failed to load filter metadata";
    const offline = getAccountsOfflineFilterMeta();
    return Response.json({
      error: message,
      sections: offline.sections,
      fields: offline.fields,
      source: offline.source,
      offlineDemo: true,
    });
  }
}
