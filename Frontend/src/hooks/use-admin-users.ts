"use client";

import { useQuery } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { User, PaginatedResponse, FilterParams } from "@/types";

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

interface CreateAdminUserResponse {
  id: string;
  email: string;
  tempPassword?: string;
  message?: string;
}

function adaptUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    role: user.role as User["role"],
    status: user.status as User["status"],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function useAdminUsers(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["admin-users", filters],
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

export function useCreateAdminUser() {
  return {
    mutateAsync: async (data: {
      fullName: string;
      email: string;
      password: string;
      role: string;
      status?: string;
      mobileNumber?: string;
    }) => {
      return api.post<{ data: CreateAdminUserResponse }>("/users/invite", {
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        mobileNumber: data.mobileNumber,
      });
    },
  };
}

export function useUpdateAdminUser() {
  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      return api.patch<{ data: BackendUser }>(`/users/${id}`, data);
    },
  };
}

export function useDeleteAdminUser() {
  return {
    mutateAsync: async (id: string) => {
      return api.delete(`/users/${id}`);
    },
  };
}
