"use client";

import { useState, useCallback, useEffect } from "react";
import { api, storeTokens, clearTokens, getAccessToken } from "@/lib/api/client";

// --- Types ---

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  mobileNumber?: string;
  role: "ADMIN" | "WORKER";
  status: string;
  geographicAssignments?: GeographicAssignment[];
}

export interface GeographicAssignment {
  assignmentType: "state" | "city" | "locality";
  state?: { id: string; name: string; code: string };
  city?: { id: string; name: string };
  locality?: { id: string; name: string };
}

export interface LoginResponse {
  userId: string;
  email: string;
  requiresOtp: boolean;
  message: string;
  devOtp?: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// --- Login (Step 1: email + password → sends OTP) ---

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: LoginResponse }>("/auth/login", { email, password });
      const data = response.data ?? response as unknown as LoginResponse;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { login, isLoading, error };
}

// --- Verify OTP (Step 2: userId + OTP → tokens) ---

export function useVerifyOtp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (userId: string, otp: string): Promise<AuthUser | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: VerifyOtpResponse }>("/auth/verify-email-otp", { userId, otp });
      const data = response.data ?? response as unknown as VerifyOtpResponse;
      storeTokens(data.accessToken, data.refreshToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-user", JSON.stringify(data.user));
      }
      return data.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "OTP verification failed";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { verify, isLoading, error };
}

// --- Resend OTP ---

export function useResendOtp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post("/auth/resend-email-otp", { userId });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { resend, isLoading, error };
}

// --- Get Current User ---

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;

    const stored = localStorage.getItem("auth-user");
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      localStorage.removeItem("auth-user");
      return null;
    }
  });

  const fetchUser = useCallback(async () => {
    if (!getAccessToken()) return null;
    try {
      const response = await api.get<{ data: AuthUser }>("/auth/me");
      const data = response.data ?? response as unknown as AuthUser;
      setUser(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-user", JSON.stringify(data));
      }
      return data;
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-user");
      }
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      const timeout = window.setTimeout(() => void fetchUser(), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [fetchUser, user]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-user");
      window.location.href = "/login";
    }
  }, []);

  return { user, fetchUser, logout, setUser };
}

// --- Forgot Password ---

export function useForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forgotPassword = useCallback(async (email: string): Promise<{ userId: string } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: { message: string; userId: string } }>("/auth/forgot-password", { email });
      const data = response.data ?? response as unknown as { userId: string };
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { forgotPassword, isLoading, error };
}

// --- Reset Password ---

export function useResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useCallback(async (userId: string, otp: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { userId, otp, newPassword });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password reset failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { resetPassword, isLoading, error };
}
