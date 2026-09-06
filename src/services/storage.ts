import { Category, UserPreferences, BootstrapResponse } from "../types";
import { INITIAL_CATEGORIES } from "../constants";
import { DEFAULT_PREFS, DEFAULT_BACKGROUND } from "../constants/defaults";
import { apiClient } from "./apiClient";
import { handleApiError } from "../utils/errorHandler";
import { LS_KEYS, readLS } from "./queries";
import { subscribeNotifications, notify } from "./notifications";

type SyncStatusListener = (isSyncing: boolean) => void;
let _syncStatusListeners: SyncStatusListener[] = [];

export { DEFAULT_BACKGROUND } from "../constants/defaults";
const CURRENT_BACKUP_VERSION = 1;

interface BackupData {
  version: number;
  timestamp: number;
  categories: Category[];
  background?: string;
  prefs?: UserPreferences;
}

// --- Storage Service (slimmed down) ---
// The dirty-flag/debounce/sync state machine has moved into TanStack Query mutations
// in services/queries.ts. This module now only owns: auth wrappers, listener
// subscriptions for legacy components (Toast/SyncIndicator), and import/export.
export const storageService = {
  subscribeNotifications,
  notify,
  subscribeSyncStatus: (listener: SyncStatusListener) => {
    _syncStatusListeners.push(listener);
    return () => {
      _syncStatusListeners = _syncStatusListeners.filter((l) => l !== listener);
    };
  },
  notifySyncStatus: (isSyncing: boolean) => {
    _syncStatusListeners.forEach((l) => l(isSyncing));
  },

  // --- Auth ---
  login: async (code: string): Promise<boolean> => apiClient.login(code),
  logout: async () => apiClient.logout(),
  isAuthenticated: async (): Promise<boolean> => apiClient.isAuthenticated(),
  updateAccessCode: async (currentCode: string, newCode: string): Promise<boolean> => {
    try {
      await apiClient.request("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "update", currentCode, newCode }),
      });
      return true;
    } catch {
      return false;
    }
  },

  // --- Backup ---
  exportData: () => {
    const backup: BackupData = {
      version: CURRENT_BACKUP_VERSION,
      timestamp: Date.now(),
      categories: readLS<Category[]>(LS_KEYS.CATEGORIES, INITIAL_CATEGORIES),
      background: localStorage.getItem(LS_KEYS.BACKGROUND) || DEFAULT_BACKGROUND,
      prefs: readLS<UserPreferences>(LS_KEYS.PREFS, DEFAULT_PREFS),
    };
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = `modern-nav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  },

  importData: (file: File): Promise<Partial<BackupData>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          resolve(Array.isArray(parsed) ? { categories: parsed } : parsed);
        } catch {
          reject(new Error("Invalid backup file"));
        }
      };
      reader.readAsText(file);
    });
  },
};

// Re-export error handler for downstream callers that imported it from here.
export { handleApiError };
export type { BootstrapResponse };
