import type { ContractFieldFilterSelection } from "@/lib/contracts/filterTypes";

export const SOW_FILTER_STATE_KEY = "crm-sow-filter-state-v1";
export const SOW_FAVORITE_VIEWS_KEY = "crm-sow-favorite-views-v1";

/** Sentinel used when the user favorites the built-in "All SOW" option. */
export const SOW_ALL_VIEW_FAVORITE_ID = "__all_sow__";

export type PersistedSowFilterState = {
  searchCriteria: string | null;
  customViewId: string | null;
  fieldSelections: ContractFieldFilterSelection[];
};

const EMPTY_FIELD_SELECTIONS: ContractFieldFilterSelection[] = [];

export const EMPTY_SOW_FILTER_STATE: PersistedSowFilterState = {
  searchCriteria: null,
  customViewId: null,
  fieldSelections: EMPTY_FIELD_SELECTIONS,
};

const EMPTY_FAVORITE_VIEWS: string[] = [];

function isFieldSelection(value: unknown): value is ContractFieldFilterSelection {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.apiName === "string" &&
    typeof row.operator === "string" &&
    Array.isArray(row.values) &&
    row.values.every((v) => typeof v === "string")
  );
}

export function loadPersistedSowFilters(): PersistedSowFilterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SOW_FILTER_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as Record<string, unknown>;
    const searchCriteria =
      row.searchCriteria === null || typeof row.searchCriteria === "string" ?
        row.searchCriteria
      : null;
    const customViewId =
      row.customViewId === null || typeof row.customViewId === "string" ?
        row.customViewId
      : null;
    const fieldSelections =
      Array.isArray(row.fieldSelections) ?
        row.fieldSelections.filter(isFieldSelection)
      : [];
    return { searchCriteria, customViewId, fieldSelections };
  } catch {
    return null;
  }
}

export function savePersistedSowFilters(state: PersistedSowFilterState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOW_FILTER_STATE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — ignore
  }
}

export function loadFavoriteCustomViewIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SOW_FAVORITE_VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter((v): v is string => typeof v === "string" && v.trim() !== ""),
      ),
    ];
  } catch {
    return [];
  }
}

export function saveFavoriteCustomViewIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SOW_FAVORITE_VIEWS_KEY,
      JSON.stringify([...new Set(ids.filter(Boolean))]),
    );
  } catch {
    // ignore
  }
}

let filterMemory: PersistedSowFilterState | null = null;
const filterListeners = new Set<() => void>();

function emitFilters() {
  for (const listener of filterListeners) listener();
}

export function subscribeSowFilters(onStoreChange: () => void) {
  filterListeners.add(onStoreChange);
  return () => {
    filterListeners.delete(onStoreChange);
  };
}

export function getSowFiltersSnapshot(): PersistedSowFilterState {
  if (!filterMemory) {
    filterMemory = loadPersistedSowFilters() ?? EMPTY_SOW_FILTER_STATE;
  }
  return filterMemory;
}

export function getSowFiltersServerSnapshot(): PersistedSowFilterState {
  return EMPTY_SOW_FILTER_STATE;
}

export function writeSowFilters(state: PersistedSowFilterState) {
  filterMemory = state;
  savePersistedSowFilters(state);
  emitFilters();
}

let favoriteMemory: string[] | null = null;
const favoriteListeners = new Set<() => void>();

function emitFavorites() {
  for (const listener of favoriteListeners) listener();
}

export function subscribeFavoriteViews(onStoreChange: () => void) {
  favoriteListeners.add(onStoreChange);
  return () => {
    favoriteListeners.delete(onStoreChange);
  };
}

export function getFavoriteViewsSnapshot(): string[] {
  if (!favoriteMemory) {
    favoriteMemory = loadFavoriteCustomViewIds();
  }
  return favoriteMemory;
}

export function getFavoriteViewsServerSnapshot(): string[] {
  return EMPTY_FAVORITE_VIEWS;
}

export function writeFavoriteViews(ids: string[]) {
  favoriteMemory = [...new Set(ids.filter(Boolean))];
  saveFavoriteCustomViewIds(favoriteMemory);
  emitFavorites();
}
