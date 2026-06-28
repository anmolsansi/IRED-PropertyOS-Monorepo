"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

// --- Reference Data Types ---

export interface ReferenceItem {
  id: string;
  name: string;
  code?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --- Hooks ---

function unwrapReferenceItems(response: ReferenceItem[] | { data?: ReferenceItem[] }) {
  return Array.isArray(response) ? response : response.data ?? [];
}

export function useStates() {
  return useQuery({
    queryKey: ["reference", "states"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/states");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useCities(stateId?: string) {
  return useQuery({
    queryKey: ["reference", "cities", stateId],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>(`/reference/states/${stateId}/cities`);
      return unwrapReferenceItems(res);
    },
    enabled: !!stateId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useLocalities(cityId?: string) {
  return useQuery({
    queryKey: ["reference", "localities", cityId],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>(`/reference/cities/${cityId}/localities`);
      return unwrapReferenceItems(res);
    },
    enabled: !!cityId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function usePropertyTypes() {
  return useQuery({
    queryKey: ["reference", "property-types"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/property-types");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useFurnishingStatuses() {
  return useQuery({
    queryKey: ["reference", "furnishing-statuses"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/furnishing-statuses");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useAvailabilityStatuses() {
  return useQuery({
    queryKey: ["reference", "availability-statuses"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/availability-statuses");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useVerificationStatuses() {
  return useQuery({
    queryKey: ["reference", "verification-statuses"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/verification-statuses");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useSources() {
  return useQuery({
    queryKey: ["reference", "sources"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/sources");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useContactRoles() {
  return useQuery({
    queryKey: ["reference", "contact-roles"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      const res = await api.get<ReferenceItem[] | { data: ReferenceItem[] }>("/reference/contact-roles");
      return unwrapReferenceItems(res);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// --- Helpers ---

export function findByName(items: ReferenceItem[] | undefined, name: string): ReferenceItem | undefined {
  return items?.find((i) => i.name.toLowerCase() === name.toLowerCase());
}

export function findById(items: ReferenceItem[] | undefined, id: string): ReferenceItem | undefined {
  return items?.find((i) => i.id === id);
}
