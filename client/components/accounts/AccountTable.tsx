"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ExternalLink, Menu, Settings2 } from "lucide-react";
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  AccountsCardsLoader,
  AccountsTableLoader,
} from "@/components/accounts/AccountsTableLoader";
import { ListTable } from "@/components/shared/ListTable";
import { InlineLoadingShimmer, PaginationLoadingShimmer } from "@/components/shared/LoadingShimmer";
import { AccountColumnsSettings } from "@/components/accounts/AccountColumnsSettings";
import {
  ColumnHeaderMenu,
  type ColumnHeaderMenuAction,
} from "@/components/shared/ColumnHeaderMenu";
import { ResizableTableHeadCell } from "@/components/shared/ResizableTableHeadCell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LookupCellEditor } from "@/components/contracts/LookupCellEditor";
import { useAccountVisibleColumns } from "@/hooks/accounts/useAccountVisibleColumns";
import {
  isFillableFieldType,
  useContractFillDown,
} from "@/hooks/contracts/useContractFillDown";
import { usePinnedColumns } from "@/hooks/contracts/usePinnedColumns";
import { useResizableColumnWidths } from "@/hooks/table/useResizableColumnWidths";
import { isLookupLikeDataType } from "@/lib/contracts/filterMeta";
import { cn } from "@/lib/utils";
import {
  buildFieldsQueryParam,
  type CrmFieldMeta,
  FALLBACK_FIELD_CATALOG,
  formatCellForDisplay,
  getAccountFieldDisplayValue,
  isDateLikeField,
  isStatusField,
  isUrlLikeField,
  looksLikeHttpUrl,
  normalizeVisibleApiNames,
  type AccountRecord,
} from "@/lib/accounts/columns";
import {
  canSortColumn,
  isZohoApiSortableField,
  sortAccountRecords,
  type ColumnSortState,
} from "@/lib/accounts/columnSort";
import type {
  ContractFieldFilterSelection,
  ContractFilterApplyPayload,
} from "@/lib/contracts/filterTypes";
import {
  ACCOUNTS_STATIC_ALL_VIEW_ID,
  ACCOUNTS_STATIC_RECORDS,
  filterStaticAccountRecords,
} from "@/lib/accounts/static";
import { CustomViewsDropdown } from "@/components/contracts/CustomViewsDropdown";
import { AccountListSelectionActions } from "@/components/accounts/AccountListSelectionActions";
import { getAccountZohoRecordUrl } from "@/lib/zoho/crmRecordUrls";

const SELECT_COL_WIDTH = 68;
const SELECT_COL = { apiName: "_select" } as const;
const PINNED_COLUMNS_KEY = "crm-pinned-columns-accounts-v1";
const COLUMN_WIDTHS_KEY = "crm-column-widths-accounts-v1";

function openAccountRecord(recordId: string) {
  window.open(getAccountZohoRecordUrl(recordId), "_blank", "noopener,noreferrer");
}

type AccountStatusTone = "active" | "closed";

function statusTone(value: string): AccountStatusTone {
  const normalized = value.trim().toLowerCase();
  return (
      normalized === "inactive" ||
      normalized === "closed" ||
      normalized === "prospect" ||
      normalized === "site"
    ) ?
      "closed"
    : "active";
}

function StatusBadge({ status }: { status: string }) {
  const label = status.trim() || "Client";
  const tone = statusTone(label);
  return (
    <span
      className={cn(
        "crm-status-badge",
        tone === "active" ? "crm-status-active" : "crm-status-closed",
      )}
      title={label}
    >
      {label}
    </span>
  );
}

function isLongTextColumn(apiName: string, dataType?: string) {
  if (
    apiName === "Account_Name" ||
    apiName === "Billing_Street" ||
    apiName === "Website" ||
    apiName === "Site_Link" ||
    apiName === "Phone" ||
    apiName === "Description"
  ) {
    return true;
  }
  return dataType === "textarea" || dataType === "website" || dataType === "email";
}

function ScrollableCell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="crm-cell-scroll" title={title}>
      {children}
    </div>
  );
}

function CellContent({
  apiName,
  value,
  dataType,
}: {
  apiName: string;
  value: string;
  dataType?: string;
}) {
  if (isStatusField(apiName)) {
    return (
      <ScrollableCell title={value || undefined}>
        <StatusBadge status={value || "Client"} />
      </ScrollableCell>
    );
  }

  if ((isUrlLikeField(apiName, dataType) || looksLikeHttpUrl(value)) && value) {
    const href = looksLikeHttpUrl(value) ? value.trim() : `https://${value.trim()}`;
    return (
      <ScrollableCell title={value}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words text-crm-link hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      </ScrollableCell>
    );
  }

  if (isLongTextColumn(apiName, dataType)) {
    return (
      <ScrollableCell title={value || undefined}>
        <span className="break-words text-crm-text">{value || "—"}</span>
      </ScrollableCell>
    );
  }

  return (
    <ScrollableCell title={value || undefined}>
      <span className={cn("text-crm-text", value && "tabular-nums")}>{value || "—"}</span>
    </ScrollableCell>
  );
}

function getColumnWidthPx(col: { apiName: string; dataType?: string }) {
  if (isStatusField(col.apiName)) return 128;
  if (isLongTextColumn(col.apiName, col.dataType)) return 220;
  if (isDateLikeField(col.apiName, col.dataType)) return 132;
  return 168;
}

function getColumnCellClass(
  col: { apiName: string },
  index: number,
  variant: "head" | "body",
  pinned = false,
) {
  void col;
  void index;

  if (variant === "head") {
    return cn("column-heading overflow-visible px-3", pinned && "crm-col-pinned");
  }

  return cn(
    "min-w-0 overflow-hidden px-3 py-1.5 align-middle text-crm-text",
    pinned && "crm-col-pinned",
  );
}

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 100;

type AccountTableProps = {
  filtersOpen?: boolean;
  onOpenFilters?: () => void;
  searchCriteria?: string | null;
  customViewId?: string | null;
  fieldSelections?: ContractFieldFilterSelection[];
  onClearSearchCriteria?: () => void;
  onFilteredTotalChange?: (total: number | null) => void;
  onAccountsLoadingChange?: (loading: boolean) => void;
  onOfflineDemoChange?: (active: boolean) => void;
  onApplyCustomView?: (payload: ContractFilterApplyPayload) => void;
  customViewsRefreshKey?: number;
  onFilterByColumn?: (apiName: string, label: string) => void;
};

function AccountCard({
  row,
  columns,
  selected,
  onSelectedChange,
}: {
  row: AccountRecord;
  columns: { apiName: string; label: string; dataType: string }[];
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const title =
    row.fields.Account_Name?.trim() ||
    row.fields.Billing_City?.trim() ||
    `Client/Site ${row.id}`;

  return (
    <article
      role="link"
      tabIndex={0}
      title={title}
      data-state={selected ? "selected" : undefined}
      onClick={() => openAccountRecord(row.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openAccountRecord(row.id);
        }
      }}
      className={cn(
        "crm-row-hover rounded-lg border border-crm-border bg-crm-panel p-3 transition hover:border-zinc-400 dark:hover:border-zinc-600",
        selected && "border-blue-500/40 bg-blue-500/5",
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${title}`}
          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-crm-border accent-blue-500"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onSelectedChange(e.target.checked)}
        />
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-pointer text-crm-link hover:text-blue-700 dark:hover:text-blue-300"
          aria-label={`Open ${title}`}
          title="Open client/site"
          onClick={(e) => {
            e.stopPropagation();
            openAccountRecord(row.id);
          }}
        >
          <ExternalLink className="size-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-crm-text">{title}</p>
      </div>
      <dl className="space-y-2.5 text-sm">
        {columns.map((col) => {
          const value = formatCellForDisplay(
            getAccountFieldDisplayValue(row.fields, col.apiName),
            col.dataType,
          );
          return (
            <div key={col.apiName}>
              <dt className="column-heading">{col.label}</dt>
              <dd className="mt-0.5">
                <CellContent apiName={col.apiName} value={value} dataType={col.dataType} />
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}

export default function AccountTable({
  filtersOpen = false,
  onOpenFilters,
  searchCriteria = null,
  customViewId = null,
  fieldSelections = [],
  onClearSearchCriteria,
  onFilteredTotalChange,
  onAccountsLoadingChange,
  onOfflineDemoChange,
  onApplyCustomView,
  customViewsRefreshKey = 0,
  onFilterByColumn,
}: AccountTableProps) {
  const { visibleApiNames, setVisibleApiNames } = useAccountVisibleColumns();
  const { pinnedApiNames, togglePinned, isPinned } = usePinnedColumns(PINNED_COLUMNS_KEY);
  const [fieldCatalog, setFieldCatalog] = useState<CrmFieldMeta[]>(FALLBACK_FIELD_CATALOG);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineDemo, setOfflineDemo] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [columnSort, setColumnSort] = useState<ColumnSortState | null>(null);
  const [listReloadKey, setListReloadKey] = useState(0);

  const {
    filling,
    fillMessage,
    fillError,
    pendingUpdate,
    confirmPendingUpdate,
    cancelPendingUpdate,
    draftValue,
    setDraftValue,
    selectLookupSuggestion,
    selectCell,
    startEditing,
    commitEditAndSave,
    cancelEdit,
    beginFillDrag,
    isCellInFillPreview,
    isActiveCell,
    isEditingCell,
    clearFillMessage,
  } = useContractFillDown({
    contracts: records,
    setContracts: setRecords,
    moduleName: "Accounts",
    entityLabel: "client/site",
  });

  const listQueryKey = useMemo(
    () =>
      JSON.stringify({
        searchCriteria: searchCriteria ?? null,
        customViewId: customViewId ?? null,
        fieldSelections,
        columnSort,
      }),
    [searchCriteria, customViewId, fieldSelections, columnSort],
  );
  const [pageQueryKey, setPageQueryKey] = useState(listQueryKey);
  if (pageQueryKey !== listQueryKey) {
    setPageQueryKey(listQueryKey);
    setPage(1);
  }

  const selectionScopeKey = `${listQueryKey}::${page}`;
  const [selectionScopeKeyState, setSelectionScopeKeyState] = useState(selectionScopeKey);
  if (selectionScopeKeyState !== selectionScopeKey) {
    setSelectionScopeKeyState(selectionScopeKey);
    setSelectedIds(new Set());
  }

  const handleFieldsLoaded = useCallback((fields: CrmFieldMeta[]) => {
    setFieldCatalog(fields);
  }, []);

  const columnsToShow = useMemo(() => normalizeVisibleApiNames(visibleApiNames), [visibleApiNames]);

  const columnMeta = useMemo(() => {
    const byApi = new Map<string, CrmFieldMeta>();
    for (const field of fieldCatalog) {
      byApi.set(field.apiName, field);
    }
    const base = columnsToShow.map((apiName: string) => {
      const meta = byApi.get(apiName);
      return {
        apiName,
        label: meta?.label ?? apiName.replace(/_/g, " "),
        dataType: meta?.dataType ?? "text",
      };
    });

    const pinnedSet = new Set(
      pinnedApiNames.filter((name) => base.some((col) => col.apiName === name)),
    );
    const pinnedCols = pinnedApiNames
      .map((name) => base.find((col) => col.apiName === name))
      .filter((col): col is (typeof base)[number] => Boolean(col));
    const rest = base.filter((col) => !pinnedSet.has(col.apiName));
    return [...pinnedCols, ...rest];
  }, [fieldCatalog, columnsToShow, pinnedApiNames]);

  const fieldsParam = useMemo(
    () => encodeURIComponent(buildFieldsQueryParam(columnsToShow)),
    [columnsToShow],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      setLoading(true);
      onAccountsLoadingChange?.(true);
      setError(null);

      try {
        const cvidPart =
          customViewId && !searchCriteria ? `&cvid=${encodeURIComponent(customViewId)}` : "";
        const criteriaPart =
          searchCriteria && !customViewId ? `&criteria=${encodeURIComponent(searchCriteria)}` : "";
        const sortPart =
          columnSort ?
            `&sortBy=${encodeURIComponent(columnSort.apiName)}&sortOrder=${columnSort.direction}`
          : "";
        const res = await fetch(
          `/api/accounts?page=${page}&perPage=${pageSize}&fields=${fieldsParam}${criteriaPart}${cvidPart}${sortPart}`,
        );
        const data = (await res.json()) as {
          records?: AccountRecord[];
          totalCount?: number;
          hasMore?: boolean;
          filtered?: boolean;
          offlineDemo?: boolean;
          zohoUnreachable?: boolean;
          error?: string;
        };

        const isOffline = Boolean(data.offlineDemo);
        if (!cancelled) {
          setOfflineDemo(isOffline);
          onOfflineDemoChange?.(isOffline);
        }

        if (!isOffline && !res.ok) {
          throw new Error(data.error ?? "Failed to load bids");
        }

        if (!cancelled) {
          if (isOffline) {
            const filtered = filterStaticAccountRecords(ACCOUNTS_STATIC_RECORDS, {
              fieldSelections,
              customViewId,
            });
            const rows: AccountRecord[] = filtered.map((r) => ({
              id: r.id,
              fields: Object.fromEntries(columnsToShow.map((name) => [name, r.fields[name] ?? ""])),
              lookups: r.lookups,
            }));
            const dataTypeByApi = new Map(
              fieldCatalog.map((field) => [field.apiName, field.dataType] as const),
            );
            const sorted = sortAccountRecords(rows, columnSort, dataTypeByApi);
            const start = (page - 1) * pageSize;
            const slice = sorted.slice(start, start + pageSize);
            setRecords(slice);
            const total = sorted.length;
            setTotalCount(total);
            const filteredActive =
              fieldSelections.length > 0 ||
              (customViewId != null && customViewId !== ACCOUNTS_STATIC_ALL_VIEW_ID);
            if (filteredActive && onFilteredTotalChange) {
              onFilteredTotalChange(total);
            } else if (!filteredActive && onFilteredTotalChange) {
              onFilteredTotalChange(null);
            }
            setHasMore(start + pageSize < sorted.length);
            if (data.zohoUnreachable && data.error) {
              setError(null);
            }
          } else {
            const liveRows = data.records ?? [];
            const dataTypeByApi = new Map(
              fieldCatalog.map((field) => [field.apiName, field.dataType] as const),
            );
            setRecords(
              columnSort && !isZohoApiSortableField(columnSort.apiName) ?
                sortAccountRecords(liveRows, columnSort, dataTypeByApi)
              : liveRows,
            );
            const total = typeof data.totalCount === "number" ? data.totalCount : liveRows.length;
            setTotalCount(total);
            if (data.filtered && onFilteredTotalChange) {
              onFilteredTotalChange(total);
            } else if (!searchCriteria && !customViewId && onFilteredTotalChange) {
              onFilteredTotalChange(null);
            }
            setHasMore(Boolean(data.hasMore));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bids");
          setRecords([]);
          setTotalCount(null);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          onAccountsLoadingChange?.(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    fieldsParam,
    searchCriteria,
    customViewId,
    fieldSelections,
    columnsToShow,
    fieldCatalog,
    columnSort,
    onFilteredTotalChange,
    onAccountsLoadingChange,
    onOfflineDemoChange,
    listReloadKey,
  ]);

  const applyColumns = useCallback(
    (apiNames: string[]) => {
      setVisibleApiNames(apiNames);
      setPage(1);
    },
    [setVisibleApiNames],
  );

  const hideColumn = useCallback(
    (apiName: string) => {
      if (columnsToShow.length <= 1) return;
      applyColumns(columnsToShow.filter((name) => name !== apiName));
      if (columnSort?.apiName === apiName) setColumnSort(null);
    },
    [applyColumns, columnsToShow, columnSort],
  );

  const handleColumnMenuAction = useCallback(
    (col: { apiName: string; label: string; dataType: string }, action: ColumnHeaderMenuAction) => {
      if (action === "asc") {
        setColumnSort({ apiName: col.apiName, direction: "asc" });
        setPage(1);
        return;
      }
      if (action === "desc") {
        setColumnSort({ apiName: col.apiName, direction: "desc" });
        setPage(1);
        return;
      }
      if (action === "pin") {
        togglePinned(col.apiName);
        return;
      }
      if (action === "hide") {
        hideColumn(col.apiName);
        return;
      }
      if (action === "filter") {
        onOpenFilters?.();
        onFilterByColumn?.(col.apiName, col.label);
      }
    },
    [hideColumn, onFilterByColumn, onOpenFilters, togglePinned],
  );

  const totalPages = totalCount != null ? Math.max(1, Math.ceil(totalCount / pageSize)) : null;
  const totalLabel =
    totalCount != null ? totalCount.toLocaleString("en-US")
    : loading ? "—"
    : "0";
  const totalSuffix =
    offlineDemo ?
      (
        fieldSelections.length > 0 ||
        (customViewId != null && customViewId !== ACCOUNTS_STATIC_ALL_VIEW_ID)
      ) ?
        " matching sample records"
      : " sample records"
    : searchCriteria || customViewId ? " matching records"
    : " total in CRM";

  const showFilteredBadge =
    offlineDemo ?
      fieldSelections.length > 0 ||
      (customViewId != null && customViewId !== ACCOUNTS_STATIC_ALL_VIEW_ID)
    : Boolean(searchCriteria || customViewId);

  const colCount = Math.max(1, columnMeta.length) + 1;
  const pageIds = useMemo(() => records.map((row) => row.id), [records]);
  const selectedCount = selectedIds.size;
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const toggleRowSelected = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageIds.length > 0 && pageIds.every((id) => next.has(id))) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [pageIds]);

  const { getWidthPx, columnSizeStyle, tableMinWidthPx, beginColumnResize } =
    useResizableColumnWidths(COLUMN_WIDTHS_KEY, columnMeta, getColumnWidthPx);

  const listColumns = useMemo(() => [SELECT_COL, ...columnMeta], [columnMeta]);
  const loaderColumns = useMemo(
    () => [{ apiName: SELECT_COL.apiName, label: "", dataType: "text" }, ...columnMeta],
    [columnMeta],
  );

  const pinnedLeftByApiName = useMemo(() => {
    const map = new Map<string, number>();
    let left = SELECT_COL_WIDTH;
    for (const col of columnMeta) {
      if (!isPinned(col.apiName)) break;
      map.set(col.apiName, left);
      left += getWidthPx(col);
    }
    return map;
  }, [columnMeta, getWidthPx, isPinned]);

  const listColumnSizeStyle = useCallback(
    (col: { apiName: string }): CSSProperties => {
      if (col.apiName === SELECT_COL.apiName) {
        return {
          width: SELECT_COL_WIDTH,
          minWidth: SELECT_COL_WIDTH,
          maxWidth: SELECT_COL_WIDTH,
          left: 0,
        };
      }
      const pinnedLeft = pinnedLeftByApiName.get(col.apiName);
      return {
        ...columnSizeStyle(col),
        ...(pinnedLeft != null ? { left: pinnedLeft } : null),
      };
    },
    [columnSizeStyle, pinnedLeftByApiName],
  );

  const tableWidthStyle = useMemo(
    (): CSSProperties => ({
      width: tableMinWidthPx + SELECT_COL_WIDTH,
      minWidth: tableMinWidthPx + SELECT_COL_WIDTH,
    }),
    [tableMinWidthPx],
  );

  function renderTableHeadRow() {
    return (
      <TableRow className="border-crm-border hover:bg-transparent">
        <TableHead
          className="crm-col-select-sticky h-10 px-3 py-0"
          style={{
            left: 0,
            width: SELECT_COL_WIDTH,
            minWidth: SELECT_COL_WIDTH,
            maxWidth: SELECT_COL_WIDTH,
          }}
        >
          <input
            type="checkbox"
            checked={allPageSelected}
            ref={(el) => {
              if (el) el.indeterminate = somePageSelected;
            }}
            aria-label="Select all client/sites on this page"
            className="size-4 cursor-pointer rounded border-crm-border accent-blue-500 disabled:cursor-not-allowed"
            disabled={loading || pageIds.length === 0}
            onChange={toggleSelectAllOnPage}
          />
        </TableHead>
        {columnMeta.map((col: { apiName: string; label: string; dataType: string }, i: number) => {
          const pinned = isPinned(col.apiName);
          const pinnedLeft = pinnedLeftByApiName.get(col.apiName);
          return (
            <ResizableTableHeadCell
              key={col.apiName}
              className={getColumnCellClass(col, i, "head", pinned)}
              style={{
                ...columnSizeStyle(col),
                ...(pinnedLeft != null ? { left: pinnedLeft } : null),
              }}
              label={
                <ColumnHeaderMenu
                  columnLabel={col.label}
                  pinned={pinned}
                  sortDirection={columnSort?.apiName === col.apiName ? columnSort.direction : null}
                  canSort={canSortColumn(col.apiName, col.dataType)}
                  canHide={columnsToShow.length > 1}
                  canFilter={Boolean(onFilterByColumn || onOpenFilters)}
                  onAction={(action) => handleColumnMenuAction(col, action)}
                />
              }
              showDivider={i < columnMeta.length - 1}
              onResizeStart={(clientX) => beginColumnResize(col.apiName, clientX, col)}
            />
          );
        })}
      </TableRow>
    );
  }

  return (
    <>
      <AccountColumnsSettings
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        visibleApiNames={visibleApiNames}
        onApply={applyColumns}
        onFieldsLoaded={handleFieldsLoaded}
      />

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-crm-border bg-crm-panel">
        <div className="relative z-20 shrink-0 border-b border-crm-border bg-crm-panel px-3 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            {onOpenFilters ?
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="crm-toolbar-btn inline-flex size-10 max-md:inline-flex md:hidden"
                onClick={onOpenFilters}
                aria-controls="accounts-filters"
                aria-expanded={filtersOpen}
                aria-label="Open filters menu"
              >
                <Menu className="size-5" />
              </Button>
            : null}
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">
              <h1 className="page-heading truncate text-base sm:text-lg">Client/Sites</h1>
              {selectedCount > 0 ?
                <AccountListSelectionActions
                  selectedRecordIds={Array.from(selectedIds)}
                />
              : null}
              {onApplyCustomView ?
                <CustomViewsDropdown
                  zohoModule="Accounts"
                  selectedCustomViewId={customViewId}
                  refreshKey={customViewsRefreshKey}
                  onSelect={(nextId) => {
                    setPage(1);
                    onApplyCustomView({
                      criteria: null,
                      customViewId: nextId,
                      fieldSelections: [],
                    });
                  }}
                  className="max-w-[min(16rem,55vw)] sm:max-w-[18rem]"
                />
              : null}
              {showFilteredBadge && onClearSearchCriteria ?
                <button
                  type="button"
                  onClick={() => {
                    onClearSearchCriteria();
                    setPage(1);
                  }}
                  className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
                >
                  Filtered · Clear
                </button>
              : null}
              <span className="text-sm text-crm-text-muted">
                {loading ?
                  <InlineLoadingShimmer />
                : <>
                    <span className="font-medium tabular-nums text-crm-text">{totalLabel}</span>
                    {totalSuffix}
                    {selectedCount > 0 ?
                      <>
                        {" · "}
                        <span className="font-medium tabular-nums text-crm-text">
                          {selectedCount.toLocaleString("en-US")}
                        </span>
                        {" selected"}
                      </>
                    : null}
                  </>
                }
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-crm-text-muted">
              <span className="hidden sm:inline">Rows</span>
              <select
                value={pageSize}
                disabled={loading}
                aria-label="Rows per page"
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="crm-toolbar-btn h-10 min-w-[4.5rem] cursor-pointer rounded-md border border-crm-border bg-crm-panel px-2 text-sm text-crm-text outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <ThemeToggle className="crm-toolbar-btn size-10" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="crm-toolbar-btn size-10"
              onClick={() => setColumnsOpen(true)}
              aria-label="Manage table columns"
            >
              <Settings2 className="size-5" />
            </Button>
          </div>
        </div>
        {offlineDemo ?
          <div className="border-b border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:px-6 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Zoho CRM is unreachable. Showing sample client/sites and demo filters. Reconnect to load
            live data.
          </div>
        : null}
        {error ?
          <div className="border-b border-red-900/50 bg-red-950/40 px-3 py-3 text-sm text-red-300 sm:px-6">
            {error}
          </div>
        : null}
        {fillError ?
          <div className="flex items-start justify-between gap-3 border-b border-red-900/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-300 sm:px-6">
            <span className="min-w-0 break-words">{fillError}</span>
            <button
              type="button"
              className="shrink-0 text-xs underline opacity-80 hover:opacity-100"
              onClick={clearFillMessage}
            >
              Dismiss
            </button>
          </div>
        : null}
        {fillMessage && !fillError ?
          <div className="flex items-start justify-between gap-3 border-b border-crm-border bg-crm-panel-muted px-3 py-2.5 text-sm text-crm-text sm:px-6">
            <span className="min-w-0 break-words">
              {filling ?
                <InlineLoadingShimmer className="mr-2 inline-block align-middle" />
              : null}
              {fillMessage}
            </span>
            {!filling ?
              <button
                type="button"
                className="shrink-0 text-xs text-crm-text-muted underline hover:text-crm-text"
                onClick={clearFillMessage}
              >
                Dismiss
              </button>
            : null}
          </div>
        : null}
        {pendingUpdate ?
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={cancelPendingUpdate}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-fill-confirm-title"
              className="w-full max-w-md rounded-lg border border-crm-border bg-crm-panel p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelPendingUpdate();
                }
              }}
            >
              <h2
                id="account-fill-confirm-title"
                className="text-base font-semibold text-crm-text"
              >
                Confirm update
              </h2>
              <p className="mt-2 text-sm text-crm-text">
                Update{" "}
                <span className="font-medium tabular-nums">
                  {pendingUpdate.recordIds.length}
                </span>{" "}
                Bids{pendingUpdate.recordIds.length === 1 ? "" : "s"}?
              </p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-crm-text-muted">Field</dt>
                  <dd className="min-w-0 break-words text-crm-text">
                    {pendingUpdate.fieldApiName.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-crm-text-muted">Value</dt>
                  <dd className="min-w-0 break-words text-crm-text">
                    {pendingUpdate.displayValue || "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="crm-toolbar-btn cursor-pointer"
                  onClick={cancelPendingUpdate}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer bg-blue-600 text-white hover:bg-blue-500"
                  onClick={() => {
                    void confirmPendingUpdate();
                  }}
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        : null}
        <div className="relative z-0 flex min-h-0 flex-1 flex-col">
          {loading ?
            <>
              <AccountsCardsLoader />
              <div className="hidden min-h-0 flex-1 flex-col md:flex">
                <ListTable
                  tableWidthStyle={tableWidthStyle}
                  columns={listColumns}
                  columnSizeStyle={listColumnSizeStyle}
                  headerRow={renderTableHeadRow()}
                >
                  <AccountsTableLoader
                    columns={loaderColumns}
                    getCellClassName={(col, i) =>
                      col.apiName === SELECT_COL.apiName ?
                        "crm-col-select-sticky px-3 py-1.5"
                      : getColumnCellClass(col, i - 1, "body", isPinned(col.apiName))
                    }
                    getCellStyle={(col) => listColumnSizeStyle(col)}
                  />
                </ListTable>
              </div>
            </>
          : <>
              <div className="space-y-3 overflow-auto p-3 md:hidden">
                {records.length === 0 ?
                  <p className="py-12 text-center text-sm text-crm-text-muted">
                    No client/sites found.
                  </p>
                : records.map((row) => (
                    <AccountCard
                      key={row.id}
                      row={row}
                      columns={columnMeta}
                      selected={selectedIds.has(row.id)}
                      onSelectedChange={(selected) => toggleRowSelected(row.id, selected)}
                    />
                  ))
                }
              </div>
              <div className="hidden min-h-0 flex-1 flex-col md:flex">
                <ListTable
                  tableWidthStyle={tableWidthStyle}
                  columns={listColumns}
                  columnSizeStyle={listColumnSizeStyle}
                  headerRow={renderTableHeadRow()}
                >
                  <TableBody>
                    {records.length === 0 ?
                      <TableRow className="border-crm-border hover:bg-transparent">
                        <TableCell
                          colSpan={colCount}
                          className="px-6 py-12 text-center text-sm text-crm-text-muted"
                        >
                          No client/sites found.
                        </TableCell>
                      </TableRow>
                    : records.map((row, rowIndex) => {
                        const isSelected = selectedIds.has(row.id);
                        const rowTitle =
                          row.fields.Account_Name?.trim() ||
                          row.fields.Billing_City?.trim() ||
                          `Client/Site ${row.id}`;
                        return (
                          <TableRow
                            key={row.id}
                            role="link"
                            tabIndex={0}
                            data-state={isSelected ? "selected" : undefined}
                            title="Click a cell to select. Double-click the cell to edit, then drag the corner handle to fill down. Alt+double-click row to open in Zoho."
                            className="crm-row-hover border-crm-border text-crm-text"
                            onDoubleClick={(e) => {
                              if (e.altKey) openAccountRecord(row.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.altKey) {
                                e.preventDefault();
                                openAccountRecord(row.id);
                              }
                            }}
                          >
                            <TableCell
                              className="crm-col-select-sticky px-2 py-1.5"
                              style={listColumnSizeStyle(SELECT_COL)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  aria-label={`Select ${rowTitle}`}
                                  className="size-4 shrink-0 cursor-pointer rounded border-crm-border accent-blue-500"
                                  onChange={(e) => toggleRowSelected(row.id, e.target.checked)}
                                />
                                <button
                                  type="button"
                                  className="shrink-0 cursor-pointer text-crm-link hover:text-blue-700 dark:hover:text-blue-300"
                                  aria-label={`Open ${rowTitle}`}
                                  title="Open client/site"
                                  onClick={() => openAccountRecord(row.id)}
                                >
                                  <ExternalLink className="size-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            {columnMeta.map(
                              (
                                col: { apiName: string; label: string; dataType: string },
                                i: number,
                              ) => {
                                const raw = getAccountFieldDisplayValue(row.fields, col.apiName);
                                const value = formatCellForDisplay(raw, col.dataType);
                                const pinned = isPinned(col.apiName);
                                const cellClass = getColumnCellClass(col, i, "body", pinned);
                                const pinnedLeft = pinnedLeftByApiName.get(col.apiName);
                                const fillable = isFillableFieldType(
                                  col.dataType,
                                  col.apiName,
                                );
                                const active = isActiveCell(row.id, col.apiName);
                                const editingThis = isEditingCell(row.id, col.apiName);
                                const inPreview = isCellInFillPreview(rowIndex, col.apiName);
                                const cellRef = {
                                  rowId: row.id,
                                  rowIndex,
                                  apiName: col.apiName,
                                  dataType: col.dataType,
                                };
                                return (
                                  <TableCell
                                    key={col.apiName}
                                    data-fill-row={fillable ? rowIndex : undefined}
                                    data-fill-col={fillable ? col.apiName : undefined}
                                    className={cn(
                                      cellClass,
                                      "relative",
                                      fillable && "cursor-cell",
                                      active && "ring-2 ring-inset ring-blue-500",
                                      inPreview && !active && "bg-blue-500/10",
                                      filling && "pointer-events-none opacity-80",
                                      editingThis && "z-40 overflow-visible",
                                    )}
                                    style={{
                                      ...columnSizeStyle(col),
                                      ...(pinnedLeft != null ? { left: pinnedLeft } : null),
                                    }}
                                    onClick={(e) => {
                                      if (!fillable || editingThis) return;
                                      e.stopPropagation();
                                      selectCell(cellRef);
                                    }}
                                    onDoubleClick={(e) => {
                                      if (!fillable) return;
                                      e.stopPropagation();
                                      e.preventDefault();
                                      startEditing(cellRef);
                                    }}
                                  >
                                    {editingThis ?
                                      isLookupLikeDataType(col.dataType) ?
                                        <LookupCellEditor
                                          apiName={col.apiName}
                                          label={col.label}
                                          dataType={col.dataType}
                                          draftValue={draftValue}
                                          onDraftChange={setDraftValue}
                                          onSelectSuggestion={selectLookupSuggestion}
                                          onCommit={() => {
                                            void commitEditAndSave();
                                          }}
                                          onCancel={cancelEdit}
                                          module="Accounts"
                                        />
                                      : <input
                                          autoFocus
                                          value={draftValue}
                                          aria-label={`Edit ${col.label}`}
                                          className="h-8 w-full min-w-0 rounded border border-blue-500 bg-crm-panel px-1.5 text-sm text-crm-text outline-none"
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => setDraftValue(e.target.value)}
                                          onBlur={() => {
                                            void commitEditAndSave();
                                          }}
                                          onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              void commitEditAndSave();
                                            } else if (e.key === "Escape") {
                                              e.preventDefault();
                                              cancelEdit();
                                            }
                                          }}
                                        />
                                    : <CellContent
                                        apiName={col.apiName}
                                        value={value}
                                        dataType={col.dataType}
                                      />
                                    }
                                    {fillable && active && !editingThis ?
                                      <span
                                        role="presentation"
                                        aria-hidden
                                        title="Drag to fill adjacent rows with this value"
                                        className="absolute bottom-0 right-0 z-20 size-3 cursor-crosshair border border-white bg-blue-600 shadow-sm dark:border-zinc-900"
                                        onPointerDown={(e) => beginFillDrag(cellRef, e)}
                                      />
                                    : null}
                                  </TableCell>
                                );
                              },
                            )}
                          </TableRow>
                        );
                      })
                    }
                  </TableBody>
                </ListTable>
              </div>
            </>
          }
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-crm-border bg-crm-panel px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="crm-toolbar-btn w-full disabled:cursor-not-allowed sm:w-auto"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-center text-xs text-crm-text-muted sm:text-left">
            {loading ?
              <PaginationLoadingShimmer />
            : totalPages != null ?
              <>
                Page <span className="tabular-nums text-crm-text">{page}</span> /{" "}
                <span className="tabular-nums text-crm-text">
                  {totalPages.toLocaleString("en-US")}
                </span>
              </>
            : null}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="crm-toolbar-btn w-full disabled:cursor-not-allowed sm:w-auto"
            disabled={loading || !hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
