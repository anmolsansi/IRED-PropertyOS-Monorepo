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

export function useStates() {
  return useQuery({
    queryKey: ["reference", "states"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/states");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCities(stateId?: string) {
  return useQuery({
    queryKey: ["reference", "cities", stateId],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>(`/reference/states/${stateId}/cities`);
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    enabled: !!stateId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocalities(cityId?: string) {
  return useQuery({
    queryKey: ["reference", "localities", cityId],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>(`/reference/cities/${cityId}/localities`);
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    enabled: !!cityId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePropertyTypes() {
  return useQuery({
    queryKey: ["reference", "property-types"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/property-types");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFurnishingStatuses() {
  return useQuery({
    queryKey: ["reference", "furnishing-statuses"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/furnishing-statuses");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAvailabilityStatuses() {
  return useQuery({
    queryKey: ["reference", "availability-statuses"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/availability-statuses");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVerificationStatuses() {
  return useQuery({
    queryKey: ["reference", "verification-statuses"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/verification-statuses");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSources() {
  return useQuery({
    queryKey: ["reference", "sources"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/sources");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useContactRoles() {
  return useQuery({
    queryKey: ["reference", "contact-roles"],
    queryFn: async (): Promise<ReferenceItem[]> => {
      try {
        const res = await api.get<{ data: ReferenceItem[] }>("/reference/contact-roles");
        return res.data ?? (res as unknown as ReferenceItem[]);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

// --- Helpers ---

export function findByName(items: ReferenceItem[] | undefined, name: string): ReferenceItem | undefined {
  return items?.find((i) => i.name.toLowerCase() === name.toLowerCase());
}

export function findById(items: ReferenceItem[] | undefined, id: string): ReferenceItem | undefined {
  return items?.find((i) => i.id === id);
}
