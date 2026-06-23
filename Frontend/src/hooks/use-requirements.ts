"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { PaginatedResponse, FilterParams } from "@/types";

export interface Requirement {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  title: string;
  description?: string;
  requirementType?: "lease" | "buy" | "sell";
  preferredState?: string;
  preferredCity?: string;
  preferredLocality?: string;
  propertyType?: string;
  furnishingPreference?: string;
  moveInDate?: string;
  parkingRequired?: boolean;
  specialNotes?: string;
  minArea?: number;
  maxArea?: number;
  minBudget?: number;
  maxBudget?: number;
  preferredLocations?: string[];
  status: string;
  shortlists?: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface BackendRequirement {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  title: string;
  description?: string;
  requirementType?: "lease" | "buy" | "sell";
  preferredState?: string;
  preferredCity?: string;
  preferredLocality?: string;
  propertyType?: string;
  furnishingPreference?: string;
  moveInDate?: string;
  parkingRequired?: boolean;
  specialNotes?: string;
  minArea?: number;
  maxArea?: number;
  minBudget?: number;
  maxBudget?: number;
  preferredLocations?: string[];
  status: string;
  shortlists?: unknown[];
  createdAt: string;
  updatedAt: string;
}

function adaptRequirement(req: BackendRequirement): Requirement {
  return {
    id: req.id,
    clientId: req.clientId,
    client: req.client,
    title: req.title,
    description: req.description,
    requirementType: req.requirementType,
    preferredState: req.preferredState,
    preferredCity: req.preferredCity,
    preferredLocality: req.preferredLocality,
    propertyType: req.propertyType,
    furnishingPreference: req.furnishingPreference,
    moveInDate: req.moveInDate,
    parkingRequired: req.parkingRequired,
    specialNotes: req.specialNotes,
    minArea: req.minArea,
    maxArea: req.maxArea,
    minBudget: req.minBudget,
    maxBudget: req.maxBudget,
    preferredLocations: req.preferredLocations,
    status: req.status,
    shortlists: req.shortlists,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

export function useRequirements(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["requirements", filters],
    queryFn: async (): Promise<PaginatedResponse<Requirement>> => {
      const response = await api.getPaginated<{ id: string; requirements: BackendRequirement[] }>("/clients", buildFilterQuery(filters));
      const allRequirements: Requirement[] = [];
      for (const client of response.data) {
        if (client.requirements) {
          for (const req of client.requirements) {
            allRequirements.push(adaptRequirement({ ...req, clientId: client.id, client: { id: client.id, name: "" } }));
          }
        }
      }
      return {
        data: allRequirements.slice((filters.page ? (filters.page - 1) * (filters.pageSize || 10) : 0), (filters.page || 1) * (filters.pageSize || 10)),
        total: allRequirements.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 10,
        totalPages: Math.ceil(allRequirements.length / (filters.pageSize || 10)),
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useRequirement(id: string) {
  return useQuery({
    queryKey: ["requirements", id],
    queryFn: async (): Promise<Requirement> => {
      const response = await api.get<{ data: BackendRequirement }>(`/clients/requirements/${id}`);
      const req = (response.data ?? response) as unknown as BackendRequirement;
      return adaptRequirement(req);
    },
    enabled: !!id,
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      title: string;
      description?: string;
      requirementType?: string;
      preferredState?: string;
      preferredCity?: string;
      preferredLocality?: string;
      propertyType?: string;
      furnishingPreference?: string;
      moveInDate?: string;
      parkingRequired?: boolean;
      specialNotes?: string;
      minArea?: number;
      maxArea?: number;
      minBudget?: number;
      maxBudget?: number;
    }) => {
      return api.post<{ data: BackendRequirement }>(`/clients/${data.clientId}/requirements`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendRequirement }>(`/clients/requirements/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["requirements", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/clients/requirements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
