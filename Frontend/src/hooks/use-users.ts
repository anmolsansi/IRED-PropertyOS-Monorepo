"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { User, PaginatedResponse, FilterParams } from "@/types";

// --- Backend types ---

interface BackendUser {
  id: string;
  email: string;
  fullName: string;
  mobileNumber?: string;
  role: string;
  status: string;
  geographicAssignments?: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface InviteUserResponse {
  id: string;
  email: string;
  tempPassword?: string;
  message?: string;
}

// --- Adapter ---

function adaptUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    role: user.role as User["role"],
    status: user.status as User["status"],
    geographicAssignments: user.geographicAssignments as User["geographicAssignments"],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// --- Hooks ---

export function useUsers(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async (): Promise<PaginatedResponse<User>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const response = await api.getPaginated<BackendUser>("/users", params);
      return { ...response, data: response.data.map(adaptUser) };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      role: string;
      mobileNumber?: string;
    }) => {
      const response = await api.post<{ data: InviteUserResponse }>("/users/invite", {
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        mobileNumber: data.mobileNumber,
      });
      return response.data ?? (response as unknown as InviteUserResponse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const response = await api.patch<{ data: BackendUser }>(`/users/${id}`, data);
      return response.data ?? (response as unknown as BackendUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAssignGeography() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { stateId?: string; cityId?: string; localityId?: string };
    }) => {
      const response = await api.post<{ data: unknown }>(
        `/users/${userId}/geographic-assignments`,
        data
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAdminResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post<{ data: { message: string } }>(
        `/users/${userId}/reset-password`
      );
      return response.data ?? (response as unknown as { message: string });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
