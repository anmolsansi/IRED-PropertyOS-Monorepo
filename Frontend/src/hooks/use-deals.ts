"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { Deal, PaginatedResponse, FilterParams, DealStage } from "@/types";

interface BackendDeal {
  id: string;
  title: string;
  clientId?: string;
  client?: { id: string; name: string };
  buildingId?: string;
  building?: { id: string; name: string };
  unitId?: string;
  unit?: { id: string; unitNumber: string };
  dealValue?: number;
  status: DealStage;
  assignedTo?: string;
  assignedWorker?: { id: string; fullName: string };
  commissions?: unknown[];
  invoices?: unknown[];
  createdAt: string;
  updatedAt: string;
}

function adaptDeal(deal: BackendDeal): Deal {
  return {
    id: deal.id,
    title: deal.title || "",
    clientId: deal.clientId || "",
    client: deal.client ? { id: deal.client.id, name: deal.client.name, email: "", phone: "", assignedWorkerId: "", requirements: [], createdAt: "", updatedAt: "" } : undefined,
    buildingId: deal.buildingId || "",
    building: deal.building ? {
      id: deal.building.id, propertyId: deal.building.id, entryType: "building",
      buildingName: deal.building.name, address: "", state: "", city: "", locality: "",
      pincode: "", propertyType: "commercial_office", furnishingStatus: "unfurnished",
      availabilityStatus: "available", verificationStatus: "verified",
      availableArea: 0, totalArea: 0, rentPerSqFt: 0, camCharges: 0,
      maintenanceCharges: 0, securityDeposit: 0, assignedWorkerId: "",
      createdAt: "", updatedAt: "", createdBy: "",
      floors: [], units: [], contacts: [], media: [], documents: [],
    } : undefined,
    unitId: deal.unitId,
    dealValue: deal.dealValue,
    status: deal.status,
    assignedTo: deal.assignedTo,
    commissions: deal.commissions as Deal["commissions"],
    invoices: deal.invoices as Deal["invoices"],
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

export function useDeals(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: async (): Promise<PaginatedResponse<Deal>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      const response = await api.getPaginated<BackendDeal>("/deals", params);
      return { ...response, data: response.data.map(adaptDeal) };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: async (): Promise<Deal> => {
      const response = await api.get<{ data: BackendDeal }>(`/deals/${id}`);
      const deal = (response.data ?? response) as unknown as BackendDeal;
      return adaptDeal(deal);
    },
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      clientId?: string;
      buildingId?: string;
      unitId?: string;
      dealValue?: number;
      status?: string;
      assignedTo?: string;
      priority?: string;
      expectedCloseDate?: string;
      notes?: string;
      requirementId?: string;
    }) => {
      return api.post<{ data: BackendDeal }>("/deals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendDeal }>(`/deals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
