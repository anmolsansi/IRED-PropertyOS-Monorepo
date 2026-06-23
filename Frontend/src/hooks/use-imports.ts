"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface ImportJob {
  id: string;
  fileName: string;
  entityType: string;
  status: string;
  totalRows?: number;
  processedRows?: number;
  errorRows?: number;
  columns?: string[];
  mappedColumns?: Record<string, string>;
  errors?: Array<{ row: number; field: string; message: string; value: string }>;
  createdAt: string;
}

export function useImports() {
  return useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      return api.getPaginated<ImportJob>("/imports");
    },
    staleTime: 30 * 1000,
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; entityType: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("entityType", data.entityType);

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const response = await fetch(`${baseUrl}/imports/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useMapColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, columnMap }: { id: string; columnMap: Record<string, string> }) => {
      return api.post(`/imports/${id}/map-columns`, { columnMap });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useValidateImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/imports/${id}/validate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useConfirmImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/imports/${id}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}
