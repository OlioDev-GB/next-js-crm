import { loadModuleFilterMeta } from "@/lib/contracts/filterMeta";
import { ZOHO_VENDOR_INVOICES_MODULE } from "@/lib/vendor-invoices/columns";
import { getVendorInvoicesOfflineFilterMeta } from "@/lib/vendor-invoices/static";
import { getZohoModuleFieldsUrl, getZohoRelatedListsUrl } from "@/lib/zoho";

export async function GET() {
  try {
    const { sections, fields, source } = await loadModuleFilterMeta(ZOHO_VENDOR_INVOICES_MODULE);

    return Response.json({
      sections,
      fields,
      source,
      zohoUrl: getZohoModuleFieldsUrl(ZOHO_VENDOR_INVOICES_MODULE),
      relatedModulesUrl: getZohoRelatedListsUrl(ZOHO_VENDOR_INVOICES_MODULE),
      filterableCount: fields.length,
      sectionCount: sections.length,
      offlineDemo: source === "offline-demo",
    });
  } catch (err) {
    console.error("Vendor invoice filters metadata failed:", err);
    const message = err instanceof Error ? err.message : "Failed to load filter metadata";
    const offline = getVendorInvoicesOfflineFilterMeta();
    return Response.json({
      error: message,
      sections: offline.sections,
      fields: offline.fields,
      source: offline.source,
      offlineDemo: true,
    });
  }
}
