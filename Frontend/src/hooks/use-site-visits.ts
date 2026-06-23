"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { SiteVisit, PaginatedResponse, FilterParams } from "@/types";

interface BackendSiteVisit {
  id: string;
  clientId?: string;
  client?: { id: string; name: string };
  buildingId?: string;
  building?: { id: string; name: string };
  unitId?: string;
  scheduledAt: string;
  assignedTo?: string;
  assignedWorker?: { id: string; fullName: string };
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function adaptSiteVisit(sv: BackendSiteVisit): SiteVisit {
  return {
    id: sv.id,
    clientId: sv.clientId || "",
    client: sv.client ? { id: sv.client.id, name: sv.client.name, email: "", phone: "", assignedWorkerId: "", requirements: [], createdAt: "", updatedAt: "" } : undefined,
    buildingId: sv.buildingId || "",
    building: sv.building ? { id: sv.building.id, propertyId: sv.building.id, entryType: "building" as const, buildingName: sv.building.name, address: "", state: "", city: "", locality: "", pincode: "", propertyType: "commercial_office" as const, furnishingStatus: "unfurnished" as const, availabilityStatus: "available" as const, verificationStatus: "verified" as const, availableArea: 0, totalArea: 0, rentPerSqFt: 0, camCharges: 0, maintenanceCharges: 0, securityDeposit: 0, assignedWorkerId: "", createdAt: "", updatedAt: "", createdBy: "", floors: [], units: [], contacts: [], media: [], documents: [] } : undefined,
    unitId: sv.unitId,
    scheduledAt: sv.scheduledAt,
    assignedToId: sv.assignedTo || "",
    assignedTo: sv.assignedWorker ? { id: sv.assignedWorker.id, fullName: sv.assignedWorker.fullName, email: "", role: "WORKER", status: "active", createdAt: "", updatedAt: "" } : undefined,
    notes: sv.notes,
    status: sv.status as SiteVisit["status"],
    createdAt: sv.createdAt,
    updatedAt: sv.updatedAt,
  };
}

export function useSiteVisits(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["siteVisits", filters],
    queryFn: async (): Promise<PaginatedResponse<SiteVisit>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      const response = await api.getPaginated<BackendSiteVisit>("/site-visits", params);
      return { ...response, data: response.data.map(adaptSiteVisit) };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useSiteVisit(id: string) {
  return useQuery({
    queryKey: ["siteVisits", id],
    queryFn: async (): Promise<SiteVisit> => {
      const response = await api.get<{ data: BackendSiteVisit }>(`/site-visits/${id}`);
      const sv = (response.data ?? response) as unknown as BackendSiteVisit;
      return adaptSiteVisit(sv);
    },
    enabled: !!id,
  });
}

export function useCreateSiteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { clientId?: string; buildingId?: string; unitId?: string; scheduledAt: string; assignedTo?: string; notes?: string }) => {
      return api.post<{ data: BackendSiteVisit }>("/site-visits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteVisits"] });
    },
  });
}

export function useUpdateSiteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendSiteVisit }>(`/site-visits/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteVisits"] });
    },
  });
}

export function useDeleteSiteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/site-visits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteVisits"] });
    },
  });
}
