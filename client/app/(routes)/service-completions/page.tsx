"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import SideBar from "@/components/layout/SideBar";
import ServiceCompletionsTable from "@/components/service-completions/ServiceCompletionTable";
import type { ContractFilterApplyPayload } from "@/lib/contracts/filterTypes";
import { SERVICE_COMPLETIONS_STATIC_ALL_VIEW_ID } from "@/lib/service-completions/static";
import {
  getServiceCompletionFiltersServerSnapshot,
  getServiceCompletionFiltersSnapshot,
  subscribeServiceCompletionFilters,
  writeServiceCompletionFilters,
} from "@/lib/service-completions/filterPersistence";

export default function ServiceCompletionsPage() {
  const filters = useSyncExternalStore(
    subscribeServiceCompletionFilters,
    getServiceCompletionFiltersSnapshot,
    getServiceCompletionFiltersServerSnapshot,
  );
  const { searchCriteria, customViewId, fieldSelections } = filters;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [serviceCompletionsLoading, setServiceCompletionsLoading] = useState(false);
  const [offlineDemo, setOfflineDemo] = useState(false);
  const [customViewsRefreshKey, setCustomViewsRefreshKey] = useState(0);
  const [focusFilterField, setFocusFilterField] = useState<string | null>(null);

  const handleFilteredTotalChange = useCallback((total: number | null) => {
    setFilteredTotal(total);
  }, []);

  const handleServiceCompletionsLoadingChange = useCallback((loading: boolean) => {
    setServiceCompletionsLoading(loading);
  }, []);

  const handleOfflineDemoChange = useCallback((active: boolean) => {
    setOfflineDemo(active);
  }, []);

  const handleApplyFilters = useCallback((payload: ContractFilterApplyPayload) => {
    writeServiceCompletionFilters({
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
    (customViewId != null && customViewId !== SERVICE_COMPLETIONS_STATIC_ALL_VIEW_ID);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-crm-canvas p-2 sm:p-3">
      <div className="relative flex h-full min-h-0 gap-2 sm:gap-3 md:flex-row">
        <SideBar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          filteredTotal={filteredTotal}
          applyLoading={serviceCompletionsLoading}
          onApplyFilters={handleApplyFilters}
          filtersApiUrl="/api/service-completions/filters"
          zohoModule="ServiceCompletions"
          filterPanelId="service-completions-filters"
          filterAriaLabel="Service completion filters"
          listFiltersActive={offlineDemo && listFiltersActive}
          onZohoCustomViewCreated={() => {
            setCustomViewsRefreshKey((k) => k + 1);
          }}
          focusFilterField={focusFilterField}
          onFocusFilterFieldHandled={() => setFocusFilterField(null)}
        />
        <ServiceCompletionsTable
          filtersOpen={filtersOpen}
          onOpenFilters={() => setFiltersOpen(true)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          fieldSelections={fieldSelections}
          customViewsRefreshKey={customViewsRefreshKey}
          onClearSearchCriteria={() => {
            writeServiceCompletionFilters({
              searchCriteria: null,
              customViewId: null,
              fieldSelections: [],
            });
            setFilteredTotal(null);
          }}
          onFilteredTotalChange={handleFilteredTotalChange}
          onServiceCompletionsLoadingChange={handleServiceCompletionsLoadingChange}
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
