"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { Client, User, PaginatedResponse, FilterParams } from "@/types";

interface BackendClient {
  id: string;
  name: string;
  company?: string;
  email?: string;
  mobileNumber?: string;
  notes?: string;
  assignedWorkerId?: string;
  assignedWorker?: { id: string; fullName: string; email: string };
  requirements?: { id: string; title: string; status: string; requirementType?: string }[];
  createdAt: string;
  updatedAt: string;
}

function adaptClient(client: BackendClient): Client {
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email || "",
    phone: client.mobileNumber || "",
    assignedWorkerId: client.assignedWorkerId || "",
    assignedWorker: client.assignedWorker
      ? { id: client.assignedWorker.id, fullName: client.assignedWorker.fullName, email: client.assignedWorker.email, role: "WORKER", status: "active", createdAt: "", updatedAt: "" } as User
      : undefined,
    requirements: (client.requirements || []).map((r) => ({
      id: r.id,
      clientId: client.id,
      title: r.title,
      status: r.status as "active" | "fulfilled" | "closed" | "expired",
      requirementType: (r.requirementType || "lease") as "lease" | "buy" | "sell",
      preferredState: "",
      preferredCity: "",
      propertyType: "commercial_office",
      minArea: 0,
      maxArea: 0,
      minBudget: 0,
      maxBudget: 0,
      furnishingPreference: "unfurnished",
      parkingRequired: false,
      assignedWorkerId: "",
      shortlistedProperties: [],
      createdAt: "",
      updatedAt: "",
    })),
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export function useClients(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async (): Promise<PaginatedResponse<Client>> => {
      const response = await api.getPaginated<BackendClient>("/clients", buildFilterQuery(filters));
      return {
        ...response,
        data: response.data.map(adaptClient),
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async (): Promise<Client> => {
      const response = await api.get<{ data: BackendClient }>(`/clients/${id}`);
      const client = (response.data ?? response) as unknown as BackendClient;
      return adaptClient(client);
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; company?: string; email?: string; mobileNumber?: string; notes?: string }) => {
      return api.post<{ data: BackendClient }>("/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendClient }>(`/clients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
