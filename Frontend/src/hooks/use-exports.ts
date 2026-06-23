"use client";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface ExportResponse {
  data: {
    headers: string[];
    rows: unknown[][];
  };
}

export function useExportData() {
  return useMutation({
    mutationFn: async ({ entityType, filters }: { entityType: string; filters?: Record<string, string> }) => {
      const params = filters ? "?" + new URLSearchParams(filters).toString() : "";
      return api.get<ExportResponse>(`/exports/${entityType}${params}`);
    },
  });
}
