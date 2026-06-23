"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Contact } from "@/types";

interface CreateContactData {
  buildingId?: string;
  floorId?: string;
  unitId?: string;
  entityType: "building" | "floor" | "unit";
  entityId: string;
  contactType: Contact["contactType"];
  name: string;
  phone?: string;
  mobileNumber?: string;
  email?: string;
  designation?: string;
  isPrimary?: boolean;
}

interface UpdateContactData {
  contactType?: Contact["contactType"];
  name?: string;
  phone?: string;
  mobileNumber?: string;
  email?: string;
  designation?: string;
  isPrimary?: boolean;
}

export function useContacts(entityId?: string) {
  return useQuery({
    queryKey: ["contacts", entityId].filter(Boolean),
    queryFn: async () => {
      if (!entityId) return [] as Contact[];
      const response = await api.get<{ data: Contact[] }>(`/buildings/${entityId}/contacts`);
      const raw = response.data ?? response;
      return Array.isArray(raw) ? (raw as Contact[]) : [];
    },
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateContactData) => {
      return api.post("/contacts", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateContactData }) => {
      return api.patch(`/contacts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useLogContactView() {
  return {
    mutateAsync: async (contactId: string) => {
      return api.post(`/contacts/${contactId}/view-log`);
    },
  };
}
