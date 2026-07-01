import type { FilterParams, PaginatedResponse } from "@/types";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const AUTH_DEBUG =
  process.env.NEXT_PUBLIC_AUTH_DEBUG === "true" ||
  process.env.NODE_ENV !== "production";

type ClerkTokenGetter = () => Promise<string | null>;

let clerkTokenGetter: ClerkTokenGetter | null = null;

function logAuthDebug(message: string, context?: Record<string, unknown>) {
  if (!AUTH_DEBUG) return;
  console.info(`[auth] ${message}`, context ?? {});
}

function logAuthWarning(message: string, context?: Record<string, unknown>) {
  console.warn(`[auth] ${message}`, context ?? {});
}

export function setClerkTokenGetter(getter: ClerkTokenGetter | null) {
  clerkTokenGetter = getter;
  logAuthDebug(getter ? "registered Clerk token source" : "cleared Clerk token source");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-token-source-changed"));
  }
}

export function hasClerkTokenGetter() {
  return Boolean(clerkTokenGetter);
}

// --- Token Management ---

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

if (typeof window !== "undefined") {
  accessToken = localStorage.getItem("access_token");
  refreshTokenValue = localStorage.getItem("refresh_token");
}

export function storeTokens(access: string, refresh: string) {
  accessToken = access;
  refreshTokenValue = refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    document.cookie = "auth-session=1; path=/; max-age=" + (7 * 24 * 60 * 60);
  }
}

export function clearTokens() {
  accessToken = null;
  refreshTokenValue = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    document.cookie = "auth-session=; path=/; max-age=0";
  }
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshTokenValue;
}

// --- Token Refresh ---

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshTokenValue) return null;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const result = await response.json();
    const data = result.data ?? result;
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  if (clerkTokenGetter) {
    try {
      const token = await clerkTokenGetter();
      if (!token) {
        logAuthWarning("Clerk token source returned no token");
      }
      return token;
    } catch (error) {
      logAuthWarning("Clerk token source failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return null;
    }
  }

  return accessToken;
}

// --- API Error ---

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --- Request ---

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);

  let toastId: string | number | undefined;
  const coldStartTimeout = window.setTimeout(() => {
    toastId = toast.loading("Waking up server, this may take a moment...", {
      description: "Render free tier takes ~30s to start.",
    });
  }, 3000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add auth token
  const token = await getValidAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  logAuthDebug("sending API request", {
    endpoint,
    method: options.method ?? "GET",
    hasToken: Boolean(token),
    tokenSource: clerkTokenGetter ? "clerk" : accessToken ? "legacy-jwt" : "none",
  });

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`Request timed out. Check that the backend is running and reachable at ${BASE_URL}`, 408);
    }
    if (error instanceof TypeError) {
      throw new ApiError(`Network error. Could not connect to backend at ${BASE_URL}. Is it running?`, 503);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    window.clearTimeout(coldStartTimeout);
    if (toastId) {
      toast.dismiss(toastId);
    }
  }

  // If 401, try refresh once
  if (response.status === 401 && refreshTokenValue) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    logAuthWarning("API request failed", {
      endpoint,
      status: response.status,
      message: body.message || body.error || "unknown",
      hasToken: Boolean(headers.Authorization),
      tokenSource: clerkTokenGetter ? "clerk" : accessToken ? "legacy-jwt" : "none",
    });
    throw new ApiError(
      body.message || body.error || `Request failed with status ${response.status}`,
      response.status
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// --- Pagination Adapter ---

// Backend returns: { data: [], meta: { total, page, limit, totalPages, hasNext, hasPrev } }
// Frontend expects: { data: [], total, page, pageSize, totalPages }

interface BackendPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

function adaptPaginatedResponse<T>(response: unknown): PaginatedResponse<T> {
  const res = response as BackendPaginatedResponse<T>;
  if (res?.meta) {
    return {
      data: res.data || [],
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.limit,
      totalPages: res.meta.totalPages,
    };
  }
  // Fallback if already in expected format
  const flat = response as PaginatedResponse<T>;
  return {
    data: flat.data || [],
    total: flat.total || 0,
    page: flat.page || 1,
    pageSize: flat.pageSize || 20,
    totalPages: flat.totalPages || 0,
  };
}

// --- API Client ---

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) => {
    const searchParams = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request<T>(`${endpoint}${searchParams}`);
  },

  getPaginated: <T>(endpoint: string, params?: Record<string, string>) => {
    const searchParams = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request<BackendPaginatedResponse<T>>(`${endpoint}${searchParams}`).then(adaptPaginatedResponse<T>);
  },

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

// --- Auth Helpers ---

export function logout() {
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/sign-in";
  }
}

// --- Filter Query Builder ---

export function buildFilterQuery(filters: FilterParams): Record<string, string> {
  const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (isUuid(filters.state)) params.stateId = filters.state!;
  if (isUuid(filters.city)) params.cityId = filters.city!;
  if (isUuid(filters.locality)) params.localityId = filters.locality!;
  if (filters.propertyType) params.propertyTypeId = filters.propertyType;
  if (filters.furnishingStatus) params.furnishingStatusId = filters.furnishingStatus;
  if (filters.availabilityStatus) params.availabilityStatusId = filters.availabilityStatus;
  if (filters.verificationStatus) params.verificationStatusId = filters.verificationStatus;
  if (filters.assignedWorkerId) params.assignedTo = filters.assignedWorkerId;
  if (filters.minArea) params.minArea = String(filters.minArea);
  if (filters.maxArea) params.maxArea = String(filters.maxArea);
  if (filters.minRent) params.minRent = String(filters.minRent);
  if (filters.maxRent) params.maxRent = String(filters.maxRent);
  if (filters.hasDuplicate !== undefined) params.hasDuplicate = String(filters.hasDuplicate);
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.limit = String(filters.pageSize);
  return params;
}

export { adaptPaginatedResponse };
