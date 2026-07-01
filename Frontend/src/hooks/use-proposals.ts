"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { PaginatedResponse, FilterParams } from "@/types";

export interface Proposal {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  requirementId?: string;
  title?: string;
  notes?: string;
  status: string;
  fieldsConfig?: { selectedFields: string[] };
  itemCount?: number;
  exportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  entityType: "building" | "floor" | "unit";
  buildingId?: string | null;
  floorId?: string | null;
  unitId?: string | null;
  notes?: string;
  displayOrder: number;
  building?: { id: string; name: string };
  floor?: { id: string; floorNumber: string; floorName?: string };
  unit?: { id: string; unitNumber: string; unitCode: string; chargeableArea: number; rentPerSqftMonth: number; monthlyRent: number };
  createdAt: string;
  updatedAt: string;
}

export interface ExportField {
  key: string;
  label: string;
  group: string;
  restricted: boolean;
}

export function useProposals(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["proposals", filters],
    queryFn: async (): Promise<PaginatedResponse<Proposal>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      const response = await api.getPaginated<Proposal>("/proposals", params);
      return response;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ["proposals", id],
    queryFn: async (): Promise<Proposal> => {
      const response = await api.get<{ data: Proposal }>(`/proposals/${id}`);
      return (response.data ?? response) as unknown as Proposal;
    },
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      requirementId?: string;
      title?: string;
      notes?: string;
    }) => {
      return api.post<{ data: Proposal }>("/proposals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Proposal> }) => {
      return api.patch<{ data: Proposal }>(`/proposals/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id] });
    },
  });
}

// --- Proposal Items Hooks ---

export function useProposalItems(proposalId: string, filters: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ["proposals", proposalId, "items", filters],
    queryFn: async (): Promise<PaginatedResponse<ProposalItem>> => {
      const searchParams = new URLSearchParams();
      if (filters.page) searchParams.set("page", String(filters.page));
      if (filters.limit) searchParams.set("limit", String(filters.limit));
      if (filters.search) searchParams.set("search", filters.search);
      
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return api.getPaginated<ProposalItem>(`/proposals/${proposalId}/items${queryString}`);
    },
    enabled: !!proposalId,
  });
}

export function useAddProposalItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { entityType: string; buildingId?: string; floorId?: string; unitId?: string; notes?: string } }) => {
      return api.post<{ data: ProposalItem }>(`/proposals/${id}/items`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id] });
    },
  });
}

export function useRemoveProposalItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, itemId }: { id: string; itemId: string }) => {
      return api.delete(`/proposals/${id}/items/${itemId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id] });
    },
  });
}

// --- Export Configuration Hooks ---

export function useExportFields() {
  return useQuery({
    queryKey: ["proposals", "export-fields"],
    queryFn: async (): Promise<ExportField[]> => {
      const response = await api.get<{ data: ExportField[] }>("/proposals/export-fields");
      return (response.data ?? response) as unknown as ExportField[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useUpdateProposalFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, selectedFields }: { id: string; selectedFields: string[] }) => {
      return api.patch<{ data: Proposal }>(`/proposals/${id}/fields`, { selectedFields });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id] });
    },
  });
}

export function useExportProposalCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, selectedFields }: { id: string; selectedFields?: string[] }): Promise<Blob> => {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/proposals/${id}/export`;
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ selectedFields }),
      });
      if (!response.ok) {
        throw new Error("Failed to export proposal to CSV");
      }
      return response.blob();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    }
  });
}
