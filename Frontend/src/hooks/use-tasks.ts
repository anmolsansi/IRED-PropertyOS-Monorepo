"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { Task, PaginatedResponse, FilterParams } from "@/types";

interface BackendTask {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  assignedToUser?: { id: string; fullName: string };
  clientId?: string;
  client?: { id: string; name: string };
  buildingId?: string;
  building?: { id: string; name: string };
  followUps?: unknown[];
  createdAt: string;
  updatedAt: string;
}

function adaptTask(task: BackendTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: (task.type as Task["type"]) || "general",
    dueDate: task.dueDate || new Date().toISOString(),
    priority: (task.priority as Task["priority"]) || "Medium",
    status: (task.status as Task["status"]) || "open",
    assignedToId: task.assignedTo || "",
    assignedTo: task.assignedToUser ? { id: task.assignedToUser.id, fullName: task.assignedToUser.fullName, email: "", role: "WORKER", status: "active", createdAt: "", updatedAt: "" } : undefined,
    clientId: task.clientId,
    client: task.client ? { id: task.client.id, name: task.client.name, email: "", phone: "", assignedWorkerId: "", requirements: [], createdAt: "", updatedAt: "" } : undefined,
    buildingId: task.buildingId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function useTasks(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async (): Promise<PaginatedResponse<Task>> => {
      const params = buildFilterQuery(filters);
      if (filters.status) params.status = filters.status;
      const response = await api.getPaginated<BackendTask>("/tasks", params);
      return { ...response, data: response.data.map(adaptTask) };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: async (): Promise<Task> => {
      const response = await api.get<{ data: BackendTask }>(`/tasks/${id}`);
      const task = (response.data ?? response) as unknown as BackendTask;
      return adaptTask(task);
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; type?: string; priority?: string; dueDate?: string; assignedTo?: string; clientId?: string; buildingId?: string }) => {
      return api.post<{ data: BackendTask }>("/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendTask }>(`/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
