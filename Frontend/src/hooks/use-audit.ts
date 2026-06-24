"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface AuditEvent {
  id: string;
  actorUserId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadataJson?: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
  } | null;
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

interface WrappedAuditEventsResponse {
  data: AuditEventsResponse;
}

function unwrapAuditResponse(
  response: AuditEventsResponse | WrappedAuditEventsResponse,
): AuditEventsResponse {
  if (Array.isArray((response as AuditEventsResponse).data)) {
    return response as AuditEventsResponse;
  }

  const wrapped = response as WrappedAuditEventsResponse;
  return {
    data: Array.isArray(wrapped.data?.data) ? wrapped.data.data : [],
    pagination: wrapped.data?.pagination ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };
}

export function useAuditEvents() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const response = await api.get<
        AuditEventsResponse | WrappedAuditEventsResponse
      >("/audit", {
        limit: "20",
        page: "1",
      });
      return unwrapAuditResponse(response);
    },
    staleTime: 60 * 1000,
  });
}
