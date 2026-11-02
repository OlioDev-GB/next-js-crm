"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import SideBar from "@/components/layout/SideBar";
import SowTable from "@/components/sow/SowTable";
import type { ContractFilterApplyPayload } from "@/lib/contracts/filterTypes";
import { SOW_STATIC_ALL_VIEW_ID } from "@/lib/sow/static";
import {
  getSowFiltersServerSnapshot,
  getSowFiltersSnapshot,
  subscribeSowFilters,
  writeSowFilters,
} from "@/lib/sow/filterPersistence";

export default function SowPage() {
  const filters = useSyncExternalStore(
    subscribeSowFilters,
    getSowFiltersSnapshot,
    getSowFiltersServerSnapshot,
  );
  const { searchCriteria, customViewId, fieldSelections } = filters;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [sowLoading, setSowLoading] = useState(false);
  const [offlineDemo, setOfflineDemo] = useState(false);
  const [customViewsRefreshKey, setCustomViewsRefreshKey] = useState(0);
  const [focusFilterField, setFocusFilterField] = useState<string | null>(null);

  const handleFilteredTotalChange = useCallback((total: number | null) => {
    setFilteredTotal(total);
  }, []);

  const handleSowLoadingChange = useCallback((loading: boolean) => {
    setSowLoading(loading);
  }, []);

  const handleOfflineDemoChange = useCallback((active: boolean) => {
    setOfflineDemo(active);
  }, []);

  const handleApplyFilters = useCallback((payload: ContractFilterApplyPayload) => {
    writeSowFilters({
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
    (customViewId != null && customViewId !== SOW_STATIC_ALL_VIEW_ID);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-crm-canvas p-2 sm:p-3">
      <div className="relative flex h-full min-h-0 gap-2 sm:gap-3 md:flex-row">
        <SideBar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          filteredTotal={filteredTotal}
          applyLoading={sowLoading}
          onApplyFilters={handleApplyFilters}
          filtersApiUrl="/api/sow/filters"
          zohoModule="Deals"
          filterPanelId="sow-filters"
          filterAriaLabel="SOW filters"
          listFiltersActive={offlineDemo && listFiltersActive}
          onZohoCustomViewCreated={() => {
            setCustomViewsRefreshKey((k) => k + 1);
          }}
          focusFilterField={focusFilterField}
          onFocusFilterFieldHandled={() => setFocusFilterField(null)}
        />
        <SowTable
          filtersOpen={filtersOpen}
          onOpenFilters={() => setFiltersOpen(true)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          fieldSelections={fieldSelections}
          customViewsRefreshKey={customViewsRefreshKey}
          onClearSearchCriteria={() => {
            writeSowFilters({
              searchCriteria: null,
              customViewId: null,
              fieldSelections: [],
            });
            setFilteredTotal(null);
          }}
          onFilteredTotalChange={handleFilteredTotalChange}
          onSowLoadingChange={handleSowLoadingChange}
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
