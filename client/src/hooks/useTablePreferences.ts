/**
 * useTablePreferences Hook
 * Manages table column preferences with localStorage persistence
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface TablePreferences {
  columnOrder: string[];
  columnWidths: Record<string, number>;
  version: number;
}

export interface UseTablePreferencesOptions {
  tableId: string;
  defaultColumnOrder: string[];
  defaultColumnWidths: Record<string, number>;
}

export interface UseTablePreferencesReturn {
  // State
  columnOrder: string[];
  columnWidths: Record<string, number>;

  // Actions
  setColumnOrder: (order: string[]) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  updateColumnWidths: (widths: Record<string, number>) => void;
  resetPreferences: () => void;

  // Status
  isLoaded: boolean;
}

const STORAGE_PREFIX = 'adv-table-';
const CURRENT_VERSION = 2;
const DEBOUNCE_MS = 300;

/**
 * Safe localStorage read with error handling
 */
function readFromStorage(key: string): TablePreferences | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item) as TablePreferences;

    // Validate structure
    if (
      !Array.isArray(parsed.columnOrder) ||
      typeof parsed.columnWidths !== 'object'
    ) {
      console.warn(`[useTablePreferences] Invalid data structure for ${key}`);
      return null;
    }

    // Version check — discard stale data when schema changes
    if (parsed.version !== CURRENT_VERSION) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(`[useTablePreferences] Failed to read from localStorage:`, error);
    return null;
  }
}

/**
 * Safe localStorage write with error handling
 */
function writeToStorage(key: string, data: TablePreferences): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    // Handle quota exceeded or private mode
    console.warn(`[useTablePreferences] Failed to write to localStorage:`, error);
    return false;
  }
}

export function useTablePreferences({
  tableId,
  defaultColumnOrder,
  defaultColumnWidths,
}: UseTablePreferencesOptions): UseTablePreferencesReturn {
  const storageKey = `${STORAGE_PREFIX}${tableId}`;

  // State
  const [columnOrder, setColumnOrderState] = useState<string[]>(defaultColumnOrder);
  const [columnWidths, setColumnWidthsState] = useState<Record<string, number>>(defaultColumnWidths);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debounce timer ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = readFromStorage(storageKey);

    if (stored) {
      // Merge with defaults to handle new columns
      const mergedOrder = mergeColumnOrder(stored.columnOrder, defaultColumnOrder);
      const mergedWidths = { ...defaultColumnWidths, ...stored.columnWidths };

      setColumnOrderState(mergedOrder);
      setColumnWidthsState(mergedWidths);
    }

    setIsLoaded(true);
  }, [storageKey, defaultColumnOrder, defaultColumnWidths]);

  // Debounced save function
  const debouncedSave = useCallback(
    (order: string[], widths: Record<string, number>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        writeToStorage(storageKey, {
          columnOrder: order,
          columnWidths: widths,
          version: CURRENT_VERSION,
        });
      }, DEBOUNCE_MS);
    },
    [storageKey]
  );

  // Set column order
  const setColumnOrder = useCallback(
    (order: string[]) => {
      setColumnOrderState(order);
      debouncedSave(order, columnWidths);
    },
    [columnWidths, debouncedSave]
  );

  // Set single column width
  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      setColumnWidthsState((prev) => {
        const updated = { ...prev, [columnId]: width };
        debouncedSave(columnOrder, updated);
        return updated;
      });
    },
    [columnOrder, debouncedSave]
  );

  // Update multiple column widths at once
  const updateColumnWidths = useCallback(
    (widths: Record<string, number>) => {
      setColumnWidthsState((prev) => {
        const updated = { ...prev, ...widths };
        debouncedSave(columnOrder, updated);
        return updated;
      });
    },
    [columnOrder, debouncedSave]
  );

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setColumnOrderState(defaultColumnOrder);
    setColumnWidthsState(defaultColumnWidths);

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore errors
    }
  }, [storageKey, defaultColumnOrder, defaultColumnWidths]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    columnOrder,
    columnWidths,
    setColumnOrder,
    setColumnWidth,
    updateColumnWidths,
    resetPreferences,
    isLoaded,
  };
}

/**
 * Merge stored column order with default order
 * - Preserves order of existing columns
 * - Appends new columns at the end
 * - Removes columns that no longer exist
 */
function mergeColumnOrder(stored: string[], defaults: string[]): string[] {
  const defaultSet = new Set(defaults);
  const result: string[] = [];

  // Add stored columns that still exist
  for (const col of stored) {
    if (defaultSet.has(col)) {
      result.push(col);
      defaultSet.delete(col);
    }
  }

  // Append new columns
  for (const col of defaultSet) {
    result.push(col);
  }

  return result;
}
