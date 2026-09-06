import { ApiResponse } from "../types";
import { ApiError } from "../types/errors";
import type { PageMetadata } from "../utils/parseMetadata";

const AUTH_KEYS = {
  ACCESS_TOKEN: "modernNav_token",
  TOKEN_EXPIRY: "modernNav_tokenExpiry",
  USER_LOGGED_OUT: "modernNav_userLoggedOut",
};

const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

class ApiClient {
  private _accessToken: string | null = null;
  private _isRefreshing = false;
  private _refreshSubscribers: ((token: string | null) => void)[] = [];

  constructor() {
    this._loadTokenFromStorage();
  }

  private _loadTokenFromStorage() {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
    const expiry = localStorage.getItem(AUTH_KEYS.TOKEN_EXPIRY);

    if (!this._isValidStoredToken(token) || !expiry || parseInt(expiry, 10) <= Date.now()) {
      if (token !== null || expiry !== null) {
        localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_KEYS.TOKEN_EXPIRY);
      }
      return;
    }
    this._accessToken = token;
  }

  private _isValidStoredToken(token: string | null): token is string {
    return (
      typeof token === "string" &&
      token.length > 0 &&
      token !== "undefined" &&
      token !== "null" &&
      token.includes(".")
    );
  }

  private _saveTokenToStorage(token: string, expiresInMs: number = 60 * 60 * 1000) {
    if (typeof token !== "string" || token.length === 0) {
      this._clearTokenStorage();
      return;
    }
    this._accessToken = token;
    if (typeof window === "undefined") return;
    const expiryTime = Date.now() + expiresInMs;
    localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(AUTH_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    localStorage.removeItem(AUTH_KEYS.USER_LOGGED_OUT);
    this._emitAuthChanged();
  }

  private _clearTokenStorage() {
    this._accessToken = null;
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_KEYS.TOKEN_EXPIRY);
    localStorage.setItem(AUTH_KEYS.USER_LOGGED_OUT, "true");
    this._emitAuthChanged();
  }

  // Lets UI (e.g. SyncIndicator's local-mode badge) react to auth transitions
  // without polling or duplicating token bookkeeping.
  private _emitAuthChanged() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("modernnav:auth-changed"));
  }

  async getAccessToken(): Promise<string | null> {
    if (this._accessToken) {
      const expiry = localStorage.getItem(AUTH_KEYS.TOKEN_EXPIRY);
      if (expiry && parseInt(expiry, 10) > Date.now()) {
        return this._accessToken;
      }
    }

    if (localStorage.getItem(AUTH_KEYS.USER_LOGGED_OUT) === "true") return null;
    return await this.refreshAccessToken();
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this._isRefreshing) {
      return new Promise((resolve) => {
        this._refreshSubscribers.push(resolve);
      });
    }

    this._isRefreshing = true;

    try {
      const response = await this._fetchWithTimeout("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });

      if (response.ok) {
        const data = await response.json();
        const newToken = data?.accessToken;
        if (typeof newToken === "string" && newToken.length > 0) {
          this._saveTokenToStorage(newToken);
          this._onTokenRefreshed(newToken);
          return newToken;
        }
        this._clearTokenStorage();
        this._onTokenRefreshed(null);
        return null;
      } else {
        this._clearTokenStorage();
        this._onTokenRefreshed(null);
        return null;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      this._onTokenRefreshed(null);
      return null;
    } finally {
      this._isRefreshing = false;
    }
  }

  private _onTokenRefreshed(token: string | null) {
    this._refreshSubscribers.forEach((callback) => callback(token));
    this._refreshSubscribers = [];
  }

  private _fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  }

  private async _fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await this._fetchWithTimeout(url, options);
        if (response.ok || response.status === 401) return response;
        lastError = new ApiError(`HTTP ${response.status}`, response.status);
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
        }
      }
    }
    throw lastError!;
  }

  async request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;

    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) {
      const token = await this.getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await this._fetchWithRetry(url, { ...options, headers });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryResponse = await this._fetchWithTimeout(url, { ...options, headers });
        const data = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new ApiError(
            (data as ApiResponse).error || `HTTP error! status: ${retryResponse.status}`,
            retryResponse.status
          );
        }
        return data as T;
      } else {
        throw new ApiError("Unauthorized: Session expired", 401);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `HTTP error! status: ${response.status}`,
        response.status
      );
    }

    return await response.json();
  }

  async fetchMetadata(url: string, signal?: AbortSignal): Promise<PageMetadata> {
    const token = await this.getAccessToken();
    if (!token) throw new ApiError("Unauthorized", 401);

    const endpoint = `/api/metadata?url=${encodeURIComponent(url)}`;
    const response = await this._fetchWithTimeout(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || "Fetch failed", response.status);
    }

    return await response.json();
  }

  async login(code: string): Promise<boolean> {
    try {
      const response = await this._fetchWithTimeout("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", code }),
      });

      if (response.ok) {
        const data = await response.json();
        this._saveTokenToStorage(data.accessToken);
        return true;
      }

      if (response.status === 429) {
        const error = new ApiError("RATE_LIMITED", 429);
        throw error;
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this._fetchWithTimeout("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } finally {
      this._clearTokenStorage();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
}

export const apiClient = new ApiClient();
