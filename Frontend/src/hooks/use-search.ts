"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export function useSearchProperties(params: Record<string, string>) {
  return useQuery({
    queryKey: ["search", "properties", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params).toString();
      return api.get(`/search/properties?${searchParams}`);
    },
    enabled: Object.values(params).some(Boolean),
    staleTime: 30 * 1000,
  });
}

export function useSearchUnits(params: Record<string, string>) {
  return useQuery({
    queryKey: ["search", "units", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params).toString();
      return api.get(`/search/units?${searchParams}`);
    },
    enabled: Object.values(params).some(Boolean),
    staleTime: 30 * 1000,
  });
}

export function useSearchContacts(params: Record<string, string>) {
  return useQuery({
    queryKey: ["search", "contacts", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params).toString();
      return api.get(`/search/contacts?${searchParams}`);
    },
    enabled: Object.values(params).some(Boolean),
    staleTime: 30 * 1000,
  });
}
