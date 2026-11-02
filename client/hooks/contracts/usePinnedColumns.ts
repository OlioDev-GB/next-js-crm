"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_STORAGE_KEY = "crm-pinned-columns-contracts-v1";

function loadPinnedApiNames(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  } catch {
    return [];
  }
}

function savePinnedApiNames(storageKey: string, apiNames: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(apiNames));
}

export function usePinnedColumns(storageKey: string = DEFAULT_STORAGE_KEY) {
  const [pinnedApiNames, setPinnedApiNamesState] = useState<string[]>([]);

  useEffect(() => {
    setPinnedApiNamesState(loadPinnedApiNames(storageKey));
  }, [storageKey]);

  const setPinnedApiNames = useCallback(
    (apiNames: string[]) => {
      const unique = [...new Set(apiNames.filter(Boolean))];
      setPinnedApiNamesState(unique);
      savePinnedApiNames(storageKey, unique);
    },
    [storageKey],
  );

  const togglePinned = useCallback(
    (apiName: string) => {
      setPinnedApiNamesState((prev) => {
        const next =
          prev.includes(apiName) ? prev.filter((name) => name !== apiName) : [...prev, apiName];
        savePinnedApiNames(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const isPinned = useCallback(
    (apiName: string) => pinnedApiNames.includes(apiName),
    [pinnedApiNames],
  );

  return { pinnedApiNames, setPinnedApiNames, togglePinned, isPinned };
}
