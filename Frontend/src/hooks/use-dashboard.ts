"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-auth";
import { api } from "@/lib/api/client";

// --- Types ---

export interface AdminDashboardData {
  totalProperties: number;
  availableProperties: number;
  occupiedProperties: number;
  totalUnits: number;
  availableUnits: number;
  totalClients: number;
  totalWorkers: number;
  activeDeals: number;
  closedDeals: number;
  pendingApprovals: number;
  pendingTasks: number;
  upcomingSiteVisits: number;
}

export interface WorkerDashboardData {
  assignedProperties: number;
  pendingChanges: number;
  myTasks: number;
  mySiteVisits: number;
  myDeals: number;
}

export type DashboardData = AdminDashboardData | WorkerDashboardData;

function flattenMetrics(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number") out[k] = v;
    else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(out, flattenMetrics(v as Record<string, unknown>));
    }
  }
  return out;
}

// --- Hooks ---

export function useAdminDashboard() {
  const { user } = useCurrentUser();
  
  return useQuery({
    queryKey: ["dashboard", "admin"],
    enabled: !!user,
    queryFn: async (): Promise<AdminDashboardData> => {
      const raw = await api.get<Record<string, unknown>>("/dashboard/admin");
      const m = flattenMetrics(raw as Record<string, unknown>);
      return {
        totalProperties: m.totalProperties ?? m.totalBuildings ?? 0,
        availableProperties: m.availableProperties ?? 0,
        occupiedProperties: m.occupiedProperties ?? 0,
        totalUnits: m.totalUnits ?? 0,
        availableUnits: m.availableUnits ?? 0,
        totalClients: m.totalClients ?? 0,
        totalWorkers: m.totalWorkers ?? 0,
        activeDeals: m.activeDeals ?? 0,
        closedDeals: m.closedDeals ?? 0,
        pendingApprovals: m.pendingApprovals ?? 0,
        pendingTasks: m.pendingTasks ?? 0,
        upcomingSiteVisits: m.upcomingSiteVisits ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useWorkerDashboard() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["dashboard", "worker"],
    enabled: !!user,
    queryFn: async (): Promise<WorkerDashboardData> => {
      const raw = await api.get<Record<string, unknown>>("/dashboard/worker");
      const m = flattenMetrics(raw as Record<string, unknown>);
      return {
        assignedProperties: m.assignedProperties ?? 0,
        pendingChanges: m.pendingChanges ?? 0,
        myTasks: m.myTasks ?? 0,
        mySiteVisits: m.mySiteVisits ?? 0,
        myDeals: m.myDeals ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  createdAt: string;
}

interface BackendActivityItem {
  id?: string;
  actorUserId?: string | null;
  actor?: { fullName?: string | null; email?: string | null } | null;
  eventType?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  createdAt?: string;
}

function normalizeActivityItem(item: BackendActivityItem, index: number): ActivityItem {
  const entityType = item.entityType ?? "activity";
  const eventType = item.eventType ?? item.action ?? "Activity";

  return {
    id: item.id ?? `${entityType}-${item.entityId ?? index}`,
    userId: item.actorUserId ?? "",
    userName: item.actor?.fullName ?? item.actor?.email ?? "System",
    action: eventType.replaceAll("_", " "),
    entityType,
    entityId: item.entityId ?? "",
    entityName: item.entityName ?? `${entityType} ${item.entityId ?? ""}`.trim(),
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "",
  };
}

export function useActivity(limit = 20) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["dashboard", "activity", limit],
    enabled: !!user,
    queryFn: async (): Promise<ActivityItem[]> => {
      const response = await api.get<{ data: BackendActivityItem[] }>(`/dashboard/activity?limit=${limit}`);
      const data = (response.data ?? response) as BackendActivityItem[];
      return data.map(normalizeActivityItem);
    },
    staleTime: 2 * 60 * 1000,
  });
}
