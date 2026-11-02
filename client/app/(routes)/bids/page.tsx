"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import SideBar from "@/components/layout/SideBar";
import BidTable from "@/components/bids/BidTable";
import type { ContractFilterApplyPayload } from "@/lib/contracts/filterTypes";
import { BIDS_STATIC_ALL_VIEW_ID } from "@/lib/bids/static";
import {
  getBidFiltersServerSnapshot,
  getBidFiltersSnapshot,
  subscribeBidFilters,
  writeBidFilters,
} from "@/lib/bids/filterPersistence";

export default function BidsPage() {
  const filters = useSyncExternalStore(
    subscribeBidFilters,
    getBidFiltersSnapshot,
    getBidFiltersServerSnapshot,
  );
  const { searchCriteria, customViewId, fieldSelections } = filters;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [offlineDemo, setOfflineDemo] = useState(false);
  const [customViewsRefreshKey, setCustomViewsRefreshKey] = useState(0);
  const [focusFilterField, setFocusFilterField] = useState<string | null>(null);

  const handleFilteredTotalChange = useCallback((total: number | null) => {
    setFilteredTotal(total);
  }, []);

  const handleBidsLoadingChange = useCallback((loading: boolean) => {
    setBidsLoading(loading);
  }, []);

  const handleOfflineDemoChange = useCallback((active: boolean) => {
    setOfflineDemo(active);
  }, []);

  const handleApplyFilters = useCallback((payload: ContractFilterApplyPayload) => {
    writeBidFilters({
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
    (customViewId != null && customViewId !== BIDS_STATIC_ALL_VIEW_ID);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-crm-canvas p-2 sm:p-3">
      <div className="relative flex h-full min-h-0 gap-2 sm:gap-3 md:flex-row">
        <SideBar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          filteredTotal={filteredTotal}
          applyLoading={bidsLoading}
          onApplyFilters={handleApplyFilters}
          filtersApiUrl="/api/bids/filters"
          zohoModule="Bids"
          filterPanelId="bids-filters"
          filterAriaLabel="Bid filters"
          listFiltersActive={offlineDemo && listFiltersActive}
          onZohoCustomViewCreated={() => {
            setCustomViewsRefreshKey((k) => k + 1);
          }}
          focusFilterField={focusFilterField}
          onFocusFilterFieldHandled={() => setFocusFilterField(null)}
        />
        <BidTable
          filtersOpen={filtersOpen}
          onOpenFilters={() => setFiltersOpen(true)}
          searchCriteria={offlineDemo ? null : searchCriteria}
          customViewId={customViewId}
          fieldSelections={fieldSelections}
          customViewsRefreshKey={customViewsRefreshKey}
          onClearSearchCriteria={() => {
            writeBidFilters({
              searchCriteria: null,
              customViewId: null,
              fieldSelections: [],
            });
            setFilteredTotal(null);
          }}
          onFilteredTotalChange={handleFilteredTotalChange}
          onBidsLoadingChange={handleBidsLoadingChange}
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
