"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface AuditEvent {
  id: string;
  actorUserId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadataJson: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface AuditEventsResponse {
  data: AuditEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useAuditEvents() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const response = await api.get<AuditEventsResponse>("/audit", {
        limit: "20",
        page: "1",
      });
      return response;
    },
    staleTime: 60 * 1000,
  });
}
