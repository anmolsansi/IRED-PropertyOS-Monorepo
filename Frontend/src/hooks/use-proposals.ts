"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { PaginatedResponse, FilterParams } from "@/types";

export interface Proposal {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  requirementId?: string;
  unitIds: string[];
  units?: { id: string; unitNumber: string; unitCode?: string; building?: { id: string; name: string } }[];
  status: string;
  title?: string;
  clientName?: string;
  propertyName?: string;
  propertyId?: string;
  rentValue?: number;
  leaseTerms?: string;
  securityDeposit?: number;
  validUntil?: string;
  camCharges?: number;
  dealId?: string;
  notes?: string;
  pdfStorageKey?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendProposal {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  requirementId?: string;
  unitIds: string[];
  units?: { id: string; unitNumber: string; unitCode?: string; building?: { id: string; name: string } }[];
  status: string;
  title?: string;
  clientName?: string;
  propertyName?: string;
  propertyId?: string;
  rentValue?: number;
  leaseTerms?: string;
  securityDeposit?: number;
  validUntil?: string;
  camCharges?: number;
  dealId?: string;
  notes?: string;
  pdfStorageKey?: string;
  createdAt: string;
  updatedAt: string;
}

function adaptProposal(p: BackendProposal): Proposal {
  return {
    id: p.id,
    clientId: p.clientId,
    client: p.client,
    requirementId: p.requirementId,
    unitIds: p.unitIds || [],
    units: p.units,
    status: p.status,
    title: p.title,
    clientName: p.clientName,
    propertyName: p.propertyName,
    propertyId: p.propertyId,
    rentValue: p.rentValue,
    leaseTerms: p.leaseTerms,
    securityDeposit: p.securityDeposit,
    validUntil: p.validUntil,
    camCharges: p.camCharges,
    dealId: p.dealId,
    notes: p.notes,
    pdfStorageKey: p.pdfStorageKey,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function useProposals(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["proposals", filters],
    queryFn: async (): Promise<PaginatedResponse<Proposal>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      const response = await api.getPaginated<BackendProposal>("/proposals", params);
      return { ...response, data: response.data.map(adaptProposal) };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ["proposals", id],
    queryFn: async (): Promise<Proposal> => {
      const response = await api.get<{ data: BackendProposal }>(`/proposals/${id}`);
      const proposal = (response.data ?? response) as unknown as BackendProposal;
      return adaptProposal(proposal);
    },
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      unitIds: string[];
      notes?: string;
      title?: string;
      dealId?: string;
      rentValue?: number;
      camCharges?: number;
      securityDeposit?: number;
      leaseTerms?: string;
      validUntil?: string;
    }) => {
      return api.post<{ data: BackendProposal }>("/proposals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendProposal }>(`/proposals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch<{ data: BackendProposal }>(`/proposals/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useGeneratePdf() {
  return useMutation({
    mutationFn: async (id: string): Promise<Blob> => {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/proposals/${id}/generate-pdf`;
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      return response.blob();
    },
  });
}
