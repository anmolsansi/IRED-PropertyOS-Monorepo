"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { PaginatedResponse, FilterParams } from "@/types";
import type { ChangeRequest } from "@/types";

interface BackendChangeRequest {
  id: string;
  entityType: string;
  entityId: string;
  requestedBy?: string;
  requester?: { id: string; fullName: string };
  status: string;
  changeItems?: unknown[];
  createdAt: string;
  updatedAt: string;
}

function adaptChangeRequest(cr: BackendChangeRequest): ChangeRequest {
  return {
    id: cr.id,
    requestId: cr.id,
    entityType: cr.entityType as ChangeRequest["entityType"],
    entityId: cr.entityId,
    entityName: "",
    city: "",
    state: "",
    locality: "",
    workerId: cr.requestedBy || "",
    worker: cr.requester
      ? {
          id: cr.requester.id,
          email: "",
          fullName: cr.requester.fullName,
          role: "WORKER" as const,
          status: "active" as const,
          createdAt: "",
          updatedAt: "",
        }
      : undefined,
    fieldChanges: [],
    status: cr.status as ChangeRequest["status"],
    priority: "medium",
    requestedAt: cr.createdAt,
    createdAt: cr.createdAt,
    updatedAt: cr.updatedAt,
  };
}

export function useApprovals(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["approvals", filters],
    queryFn: async (): Promise<PaginatedResponse<ChangeRequest>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      const response = await api.getPaginated<BackendChangeRequest>(
        "/change-requests",
        params
      );
      return { ...response, data: response.data.map(adaptChangeRequest) };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: ["approvals", id],
    queryFn: async (): Promise<ChangeRequest> => {
      const response = await api.get<{ data: BackendChangeRequest }>(
        `/change-requests/${id}`
      );
      const cr = (response.data ?? response) as unknown as BackendChangeRequest;
      return adaptChangeRequest(cr);
    },
    enabled: !!id,
  });
}

export function useApproveChangeRequestItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string;
      items: { changeItemId: string; finalValue: string; comment?: string }[];
    }) => {
      return api.post(`/change-requests/${id}/approve-items`, { items });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["approvals", variables.id],
      });
    },
  });
}

export function useRejectChangeRequestItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string;
      items: { changeItemId: string; comment: string }[];
    }) => {
      return api.post(`/change-requests/${id}/reject-items`, { items });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["approvals", variables.id],
      });
    },
  });
}

export function useWithdrawChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/change-requests/${id}/withdraw`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fieldId,
      resolution,
      adminValue,
    }: {
      id: string;
      fieldId: string;
      resolution: "worker" | "admin";
      adminValue?: string;
    }) => {
      return api.post(`/change-requests/${id}/resolve-conflict`, {
        fieldId,
        resolution,
        adminValue,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["approvals", variables.id],
      });
    },
  });
}
