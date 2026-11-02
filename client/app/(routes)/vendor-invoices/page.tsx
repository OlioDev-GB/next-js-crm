"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import SideBar from "@/components/layout/SideBar";
import VendorInvoiceTable from "@/components/vendor-invoices/VendorInvoiceTable";
import type { ContractFilterApplyPayload } from "@/lib/contracts/filterTypes";
import { VENDOR_INVOICES_STATIC_ALL_VIEW_ID } from "@/lib/vendor-invoices/static";
import {
  getVendorInvoiceFiltersServerSnapshot,
  getVendorInvoiceFiltersSnapshot,
  subscribeVendorInvoiceFilters,
  writeVendorInvoiceFilters,
} from "@/lib/vendor-invoices/filterPersistence";

export default function VendorInvoicesPage() {
  const filters = useSyncExternalStore(
    subscribeVendorInvoiceFilters,
    getVendorInvoiceFiltersSnapshot,
    getVendorInvoiceFiltersServerSnapshot,
  );
  const { searchCriteria, customViewId, fieldSelections } = filters;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [vendorInvoicesLoading, setVendorInvoicesLoading] = useState(false);
  const [offlineDemo, setOfflineDemo] = useState(false);
  const [customViewsRefreshKey, setCustomViewsRefreshKey] = useState(0);
  const [focusFilterField, setFocusFilterField] = useState<string | null>(null);

  const handleFilteredTotalChange = useCallback((total: number | null) => {
    setFilteredTotal(total);
  }, []);

  const handleVendorInvoicesLoadingChange = useCallback((loading: boolean) => {
    setVendorInvoicesLoading(loading);
  }, []);

  const handleOfflineDemoChange = useCallback((active: boolean) => {
    setOfflineDemo(active);
  }, []);

  const handleApplyFilters = useCallback((payload: ContractFilterApplyPayload) => {
    writeVendorInvoiceFilters({
      searchCriteria: payload.criteria,
      customViewId: payload.customViewId,
      fieldSelections: payload.fieldSelections ?? [],
    });
    if (!payload.criteria && !payload.customViewId && !(payload.fieldSelections?.length ?? 0)) {
      setFilteredTotal(null);
    }
  }, []);

  const listFiltersActive =
    fieldSelections.length > 0 ||
    (customViewId != null && customViewId !== VENDOR_INVOICES_STATIC_ALL_VIEW_ID);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-crm-canvas p-2 sm:p-3">
      <div className="relative flex h-full min-h-0 gap-2 sm:gap-3 md:flex-row">
        <SideBar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          filteredTotal={filteredTotal}
          applyLoading={vendorInvoicesLoading}
          onApplyFilters={handleApplyFilters}
          filtersApiUrl="/api/vendor-invoices/filters"
          zohoModule="Vendor_Invoices"
          filterPanelId="vendor-invoices-filters"
          filterAriaLabel="Vendor invoice filters"
          listFiltersActive={offlineDemo && listFiltersActive}
          onZohoCustomViewCreated={() => {
            setCustomViewsRefreshKey((k) => k + 1);
          }}
          focusFilterField={focusFilterField}
          onFocusFilterFieldHandled={() => setFocusFilterField(null)}
        />
        <VendorInvoiceTable
          filtersOpen={filtersOpen}
          onOpenFilters={() => setFiltersOpen(true)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          fieldSelections={fieldSelections}
          customViewsRefreshKey={customViewsRefreshKey}
          onClearSearchCriteria={() => {
            writeVendorInvoiceFilters({
              searchCriteria: null,
              customViewId: null,
              fieldSelections: [],
            });
            setFilteredTotal(null);
          }}
          onFilteredTotalChange={handleFilteredTotalChange}
          onVendorInvoicesLoadingChange={handleVendorInvoicesLoadingChange}
          onOfflineDemoChange={handleOfflineDemoChange}
          onApplyCustomView={handleApplyFilters}
          onFilterByColumn={(_apiName, label) => {
            setFiltersOpen(true);
            setFocusFilterField(label);
          }}
        />
      </div>
    </div>
  );
}
