import { Category, ThemeMode } from "../types";
import { INITIAL_CATEGORIES } from "../constants";

// --- AUTH STATE ---
let _accessToken: string | null = null;
let _isRefreshing = false;
let _refreshSubscribers: ((token: string) => void)[] = [];
const AUTH_KEYS = {
  ACCESS_TOKEN: "modernNav_token",
  TOKEN_EXPIRY: "modernNav_tokenExpiry",
  USER_LOGGED_OUT: "modernNav_userLoggedOut",
};

// --- EVENT LISTENERS ---
type NotifyType = "success" | "error" | "info";
type NotifyListener = (type: NotifyType, message: string) => void;
let _notifyListeners: NotifyListener[] = [];

type SyncStatusListener = (isSyncing: boolean) => void;
let _syncStatusListeners: SyncStatusListener[] = [];

// --- CONSTANTS ---
const LS_KEYS = {
  CATEGORIES: "modernNav_categories",
  BACKGROUND: "modernNav_bg",
  PREFS: "modernNav_prefs",
};

export const DEFAULT_BACKGROUND =
  "radial-gradient(circle at 50% -20%, #334155, #0f172a, #020617)";
const CURRENT_BACKUP_VERSION = 1;

export interface UserPreferences {
  cardOpacity: number;
  themeColor?: string;
  themeMode: ThemeMode;
}

const DEFAULT_PREFS: UserPreferences = {
  cardOpacity: 0.1,
  themeColor: "#6366f1",
  themeMode: ThemeMode.Dark,
};

// Backup Data Structure
interface BackupData {
  version: number;
  timestamp: number;
  categories: Category[];
  background?: string;
  prefs?: UserPreferences;
}

// --- HELPERS ---

const safeJsonParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      if (Array.isArray(fallback) && Array.isArray(parsed.data))
        return parsed.data as T;
      if (!Array.isArray(fallback) && typeof parsed.data === "object")
        return parsed.data as T;
    }
    return parsed as T;
  } catch (e) {
    console.warn("JSON Parse Failed:", e);
    return fallback;
  }
};

const safeLocalStorageSet = (key: string, value: any) => {
  try {
    const stringVal = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, stringVal);
  } catch (e) {
    console.warn("LS Write Failed", e);
  }
};

// --- AUTH LOGIC ---

const onRefreshed = (token: string) => {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
};

const tryRefreshToken = async (): Promise<string | null> => {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });

    if (res.ok) {
      const data = await res.json();
      _accessToken = data.accessToken;
      if (typeof window !== "undefined") {
        const expiryTime = new Date().getTime() + 24 * 60 * 60 * 1000;
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, data.accessToken);
        localStorage.setItem(AUTH_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      }
      return data.accessToken;
    } else if (res.status === 401 || res.status === 403) {
      _accessToken = null;
      localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(AUTH_KEYS.TOKEN_EXPIRY);
      // 刷新令牌失败，也清除登出标记
      localStorage.removeItem(AUTH_KEYS.USER_LOGGED_OUT);
    }
    return null;
  } catch (e) {
    return null;
  }
};

const ensureAccessToken = async (): Promise<string | null> => {
  if (_accessToken) return _accessToken;
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
    const storedExpiry = localStorage.getItem(AUTH_KEYS.TOKEN_EXPIRY);
    if (
      storedToken &&
      storedExpiry &&
      parseInt(storedExpiry, 10) > new Date().getTime()
    ) {
      _accessToken = storedToken;
      return _accessToken;
    }
  }
  // 只有在本地存储中有令牌信息时才尝试刷新令牌
  // 这可以防止在无痕模式下自动登录
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
    const storedExpiry = localStorage.getItem(AUTH_KEYS.TOKEN_EXPIRY);

    // 只有在本地存储中有令牌信息时才尝试刷新令牌
    if (storedToken && storedExpiry) {
      if (_isRefreshing)
        return new Promise((resolve) => _refreshSubscribers.push(resolve));
      _isRefreshing = true;
      const newToken = await tryRefreshToken();
      _isRefreshing = false;
      onRefreshed(newToken || "");
      return newToken;
    }
  }

  // 没有本地令牌信息，不尝试刷新
  return null;
};

// --- STORAGE SERVICE ---

export const storageService = {
  init: () => {
    if (typeof window !== "undefined") {
      // 检查用户是否已主动登出
      const userLoggedOut = localStorage.getItem(AUTH_KEYS.USER_LOGGED_OUT);
      if (userLoggedOut === "true") {
        // 用户已主动登出，不尝试自动刷新令牌
        return;
      }

      const storedToken = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
      const storedExpiry = localStorage.getItem(AUTH_KEYS.TOKEN_EXPIRY);

      // 只有在本地存储中有令牌信息时才尝试刷新令牌
      // 这可以防止在无痕模式下自动登录
      if (storedToken && storedExpiry) {
        if (parseInt(storedExpiry, 10) <= new Date().getTime()) {
          tryRefreshToken();
        }
      }

      // 设置在线状态监听
      storageService._setupOnlineListener();

      // 检查是否有待同步的数据
      if (storageService.checkGlobalDirtyState()) {
        storageService._pendingSync = true;
        storageService.notify("info", "You have unsynced changes. Syncing...");

        // 如果在线，立即尝试同步
        if (storageService._isOnline) {
          storageService.syncPendingChanges();
        }
      }
    }
  },

  subscribeNotifications: (listener: NotifyListener) => {
    _notifyListeners.push(listener);
    return () => {
      _notifyListeners = _notifyListeners.filter((l) => l !== listener);
    };
  },
  notify: (type: NotifyType, message: string) => {
    _notifyListeners.forEach((l) => l(type, message));
  },
  subscribeSyncStatus: (listener: SyncStatusListener) => {
    _syncStatusListeners.push(listener);
    return () => {
      _syncStatusListeners = _syncStatusListeners.filter((l) => l !== listener);
    };
  },
  notifySyncStatus: (isSyncing: boolean) => {
    _syncStatusListeners.forEach((l) => l(isSyncing));
  },
  checkGlobalDirtyState: () => {
    // 检查本地数据是否与云端同步
    const localCategories = safeJsonParse(
      localStorage.getItem(LS_KEYS.CATEGORIES),
      null
    );
    const localBackground = localStorage.getItem(LS_KEYS.BACKGROUND);
    const localPrefs = safeJsonParse(localStorage.getItem(LS_KEYS.PREFS), null);

    // 如果本地有数据但未同步到云端，返回true
    return (
      (localCategories || localBackground || localPrefs) &&
      !storageService._isSynced
    );
  },

  _isSynced: false, // 标记本地数据是否已同步到云端
  _isOnline: navigator.onLine, // 跟踪在线状态
  _pendingSync: false, // 标记是否有待同步的数据

  // 设置在线状态监听
  _setupOnlineListener: () => {
    if (typeof window !== "undefined") {
      const updateOnlineStatus = () => {
        const wasOffline = !storageService._isOnline;
        storageService._isOnline = navigator.onLine;

        // 如果从离线变为在线，尝试同步待处理的数据
        if (
          wasOffline &&
          storageService._isOnline &&
          storageService._pendingSync
        ) {
          storageService.syncPendingChanges();
        }
      };

      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);
    }
  },

  login: async (code: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", code }),
      });
      if (res.ok) {
        const data = await res.json();
        _accessToken = data.accessToken;
        const expiryTime = new Date().getTime() + 24 * 60 * 60 * 1000;
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, data.accessToken);
        localStorage.setItem(AUTH_KEYS.TOKEN_EXPIRY, expiryTime.toString());
        // 清除登出标记
        localStorage.removeItem(AUTH_KEYS.USER_LOGGED_OUT);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } finally {
      _accessToken = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_KEYS.TOKEN_EXPIRY);
        // 添加一个标记，表示用户已主动登出
        localStorage.setItem(AUTH_KEYS.USER_LOGGED_OUT, "true");
      }
    }
  },

  // 💡 保持异步接口
  isAuthenticated: async (): Promise<boolean> => {
    const token = await ensureAccessToken();
    return !!token;
  },

  updateAccessCode: async (
    currentCode: string,
    newCode: string
  ): Promise<boolean> => {
    const token = await ensureAccessToken();
    if (!token) return false;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "update", currentCode, newCode }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  _lastSaveTime: 0,

  fetchAllData: async () => {
    let cloudData = null;
    try {
      const res = await fetch("/api/bootstrap");
      if (res.ok) cloudData = await res.json();
    } catch (e) {
      console.warn("Fetch failed");
    }

    let finalCategories =
      cloudData?.categories ||
      safeJsonParse(
        localStorage.getItem(LS_KEYS.CATEGORIES),
        INITIAL_CATEGORIES
      );
    let finalBackground =
      cloudData?.background ||
      localStorage.getItem(LS_KEYS.BACKGROUND) ||
      DEFAULT_BACKGROUND;
    let finalPrefs =
      cloudData?.prefs ||
      safeJsonParse(localStorage.getItem(LS_KEYS.PREFS), DEFAULT_PREFS);

    // 💡 原始代码中的背景图和 categories 防护逻辑
    if (!Array.isArray(finalCategories)) finalCategories = INITIAL_CATEGORIES;
    if (
      typeof finalBackground === "string" &&
      finalBackground.startsWith('"')
    ) {
      try {
        finalBackground = JSON.parse(finalBackground);
      } catch {}
    }
    if (
      typeof finalBackground === "string" &&
      finalBackground.startsWith("{")
    ) {
      const parsed = safeJsonParse<any>(finalBackground, null);
      if (parsed && parsed.data) finalBackground = parsed.data;
    }
    if (typeof finalBackground !== "string")
      finalBackground = DEFAULT_BACKGROUND;

    safeLocalStorageSet(LS_KEYS.CATEGORIES, finalCategories);
    safeLocalStorageSet(LS_KEYS.BACKGROUND, finalBackground);
    safeLocalStorageSet(LS_KEYS.PREFS, finalPrefs);

    return {
      categories: finalCategories,
      background: finalBackground,
      prefs: finalPrefs,
      isDefaultCode: !!cloudData?.isDefaultCode,
    };
  },

  _saveItem: async (key: string, data: any, type: string, force = false) => {
    safeLocalStorageSet(key, data);
    const token = await ensureAccessToken();
    if (!token) {
      storageService._isSynced = false;
      storageService._pendingSync = true;
      return;
    }

    // 如果不强制同步且离线，标记为待同步
    if (!force && !storageService._isOnline) {
      storageService._isSynced = false;
      storageService._pendingSync = true;
      return;
    }

    // 防抖逻辑（除非强制同步）
    const now = Date.now();
    if (!force && now - storageService._lastSaveTime < 1000) return;
    storageService._lastSaveTime = now;

    storageService.notifySyncStatus(true);
    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, data }),
      });

      if (res.ok) {
        storageService._isSynced = true;
        storageService._pendingSync = false;
      } else if (res.status === 401) {
        _accessToken = null;
        localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_KEYS.TOKEN_EXPIRY);
        storageService._isSynced = false;
        storageService._pendingSync = true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Update failed");
      }
    } catch (e) {
      storageService._isSynced = false;
      storageService._pendingSync = true;
      storageService.notify(
        "error",
        `Cloud sync failed: ${e.message || "Unknown error"}. Saved locally.`
      );
    } finally {
      storageService.notifySyncStatus(false);
    }
  },

  saveCategories: async (categories: Category[]) =>
    storageService._saveItem(LS_KEYS.CATEGORIES, categories, "categories"),
  setBackground: async (url: string) =>
    storageService._saveItem(LS_KEYS.BACKGROUND, url, "background"),
  savePreferences: async (prefs: UserPreferences) =>
    storageService._saveItem(LS_KEYS.PREFS, prefs, "prefs"),
  syncPendingChanges: async (force = false) => {
    if (!storageService._isOnline && !force) {
      storageService._pendingSync = true;
      storageService.notify(
        "info",
        "You are offline. Changes will be synced when you are back online."
      );
      return;
    }

    const token = await ensureAccessToken();
    if (!token) {
      storageService.notify("error", "Authentication required to sync data");
      return;
    }

    try {
      storageService.notifySyncStatus(true);

      // 获取云端数据
      const res = await fetch("/api/bootstrap");
      if (!res.ok) throw new Error("Failed to fetch cloud data");
      const cloudData = await res.json();

      // 获取本地数据
      const localCategories = safeJsonParse(
        localStorage.getItem(LS_KEYS.CATEGORIES),
        null
      );
      const localBackground = localStorage.getItem(LS_KEYS.BACKGROUND);
      const localPrefs = safeJsonParse(
        localStorage.getItem(LS_KEYS.PREFS),
        null
      );

      // 比较数据并处理冲突
      const categoriesChanged =
        JSON.stringify(localCategories) !==
        JSON.stringify(cloudData.categories);
      const backgroundChanged = localBackground !== cloudData.background;
      const prefsChanged =
        JSON.stringify(localPrefs) !== JSON.stringify(cloudData.prefs);

      // 如果有本地更改，推送到云端
      if (categoriesChanged && localCategories) {
        await storageService._saveItem(
          LS_KEYS.CATEGORIES,
          localCategories,
          "categories",
          true
        );
      }

      if (backgroundChanged && localBackground) {
        await storageService._saveItem(
          LS_KEYS.BACKGROUND,
          localBackground,
          "background",
          true
        );
      }

      if (prefsChanged && localPrefs) {
        await storageService._saveItem(
          LS_KEYS.PREFS,
          localPrefs,
          "prefs",
          true
        );
      }

      // 如果没有本地更改，从云端拉取
      if (!categoriesChanged && !backgroundChanged && !prefsChanged) {
        safeLocalStorageSet(LS_KEYS.CATEGORIES, cloudData.categories);
        safeLocalStorageSet(LS_KEYS.BACKGROUND, cloudData.background);
        safeLocalStorageSet(LS_KEYS.PREFS, cloudData.prefs);

        // 通知前端数据已更新
        storageService.notify("info", "Data synced from cloud");
      }

      storageService._isSynced = true;
      storageService._pendingSync = false;
    } catch (error) {
      console.error("Sync failed:", error);
      storageService._pendingSync = true;
      storageService.notify(
        "error",
        "Sync failed. Your changes are saved locally and will be synced later."
      );
    } finally {
      storageService.notifySyncStatus(false);
    }
  },

  exportData: () => {
    const backup: BackupData = {
      version: CURRENT_BACKUP_VERSION,
      timestamp: Date.now(),
      categories: safeJsonParse<Category[]>(
        localStorage.getItem(LS_KEYS.CATEGORIES),
        INITIAL_CATEGORIES
      ),
      background:
        localStorage.getItem(LS_KEYS.BACKGROUND) || DEFAULT_BACKGROUND,
      prefs: safeJsonParse<UserPreferences>(
        localStorage.getItem(LS_KEYS.PREFS),
        DEFAULT_PREFS
      ),
    };
    const dataUri =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = `modern-nav-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
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

storageService.init();
