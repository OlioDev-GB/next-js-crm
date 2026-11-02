import type { ContractFieldFilterSelection } from "@/lib/contracts/filterTypes";

export const SERVICE_COMPLETIONS_FILTER_STATE_KEY = "crm-service-completions-filter-state-v1";
export const SERVICE_COMPLETIONS_FAVORITE_VIEWS_KEY = "crm-service-completions-favorite-views-v1";

/** Sentinel used when the user favorites the built-in "All Service Completions" option. */
export const SERVICE_COMPLETIONS_ALL_VIEW_FAVORITE_ID = "__all_service_completions__";

export type PersistedServiceCompletionFilterState = {
  searchCriteria: string | null;
  customViewId: string | null;
  fieldSelections: ContractFieldFilterSelection[];
};

const EMPTY_FIELD_SELECTIONS: ContractFieldFilterSelection[] = [];

export const EMPTY_SERVICE_COMPLETION_FILTER_STATE: PersistedServiceCompletionFilterState = {
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

export function loadPersistedServiceCompletionFilters(): PersistedServiceCompletionFilterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SERVICE_COMPLETIONS_FILTER_STATE_KEY);
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

export function savePersistedServiceCompletionFilters(state: PersistedServiceCompletionFilterState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SERVICE_COMPLETIONS_FILTER_STATE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — ignore
  }
}

export function loadFavoriteCustomViewIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SERVICE_COMPLETIONS_FAVORITE_VIEWS_KEY);
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
      SERVICE_COMPLETIONS_FAVORITE_VIEWS_KEY,
      JSON.stringify([...new Set(ids.filter(Boolean))]),
    );
  } catch {
    // ignore
  }
}

let filterMemory: PersistedServiceCompletionFilterState | null = null;
const filterListeners = new Set<() => void>();

function emitFilters() {
  for (const listener of filterListeners) listener();
}

export function subscribeServiceCompletionFilters(onStoreChange: () => void) {
  filterListeners.add(onStoreChange);
  return () => {
    filterListeners.delete(onStoreChange);
  };
}

export function getServiceCompletionFiltersSnapshot(): PersistedServiceCompletionFilterState {
  if (!filterMemory) {
    filterMemory = loadPersistedServiceCompletionFilters() ?? EMPTY_SERVICE_COMPLETION_FILTER_STATE;
  }
  return filterMemory;
}

export function getServiceCompletionFiltersServerSnapshot(): PersistedServiceCompletionFilterState {
  return EMPTY_SERVICE_COMPLETION_FILTER_STATE;
}

export function writeServiceCompletionFilters(state: PersistedServiceCompletionFilterState) {
  filterMemory = state;
  savePersistedServiceCompletionFilters(state);
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
