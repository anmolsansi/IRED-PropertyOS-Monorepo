"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
export interface FollowUp {
  id: string;
  taskId?: string;
  clientId: string;
  clientName?: string;
  title: string;
  description?: string;
  dueDate: string;
  type: "call" | "email" | "meeting" | "site_visit" | "other";
  status: "pending" | "completed" | "skipped";
  assignedToId: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendFollowUp {
  id: string;
  taskId?: string;
  title: string;
  description?: string;
  dueDate: string;
  type?: string;
  status: string;
  assignedTo?: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

function adaptFollowUp(fu: BackendFollowUp): FollowUp {
  return {
    id: fu.id,
    taskId: fu.taskId,
    clientId: fu.clientId || "",
    title: fu.title,
    description: fu.description,
    dueDate: fu.dueDate,
    type: (fu.type as FollowUp["type"]) || "call",
    status: fu.status as FollowUp["status"],
    assignedToId: fu.assignedTo || "",
    createdAt: fu.createdAt,
    updatedAt: fu.updatedAt,
  };
}

export function useFollowUps(taskId: string) {
  return useQuery({
    queryKey: ["followUps", taskId],
    queryFn: async (): Promise<FollowUp[]> => {
      if (!taskId) return [];
      const response = await api.get<{ data: BackendFollowUp[] }>(`/tasks/${taskId}/follow-ups`);
      const raw = response.data ?? response;
      return Array.isArray(raw) ? raw.map(adaptFollowUp) : [];
    },
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; dueDate: string; type?: string; taskId?: string; clientId?: string }) => {
      if (data.taskId) {
        return api.post(`/tasks/${data.taskId}/follow-ups`, {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          type: data.type || "call",
        });
      }
      return api.post("/tasks", { title: data.title, description: data.description, type: "follow_up", dueDate: data.dueDate });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: ["followUps", variables.taskId] });
      }
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, taskId }: { id: string; data: Record<string, unknown>; taskId?: string }) => {
      if (taskId) {
        return api.patch(`/tasks/${taskId}/follow-ups/${id}`, data);
      }
      return api.patch(`/tasks/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: ["followUps", variables.taskId] });
      }
    },
  });
}
