"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Plus, Trash2, Eye, Loader2 } from "lucide-react";
import { useAuditEvents } from "@/hooks/use-audit";

function parseAction(eventType: string): string {
  const method = eventType.split(" ")[0];
  switch (method) {
    case "POST":
      return "created";
    case "PATCH":
      return "updated";
    case "DELETE":
      return "deleted";
    case "APPROVE":
      return "approved";
    case "REJECT":
      return "rejected";
    default:
      return "updated";
  }
}

function formatEntityName(
  entityType: string,
  metadataJson?: Record<string, unknown> | null,
): string {
  if (typeof metadataJson?.name === "string") return metadataJson.name;
  if (typeof metadataJson?.fullName === "string") return metadataJson.fullName;
  if (typeof metadataJson?.title === "string") return metadataJson.title;
  return (
    entityType.charAt(0).toUpperCase() + entityType.slice(1).replace(/_/g, " ")
  );
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  created: { icon: <Plus className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Created" },
  updated: { icon: <Pencil className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", label: "Updated" },
  deleted: { icon: <Trash2 className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Deleted" },
  approved: { icon: <Eye className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Approved" },
  rejected: { icon: <Trash2 className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Rejected" },
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ActivityPage() {
  const { data, isLoading } = useAuditEvents();
  const events = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Audit trail of all changes across properties and approvals."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading activity...
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No activity yet.
            </p>
          ) : (
            <div className="space-y-1">
              {events.map((event) => {
                const action = parseAction(event.eventType);
                const config = ACTION_CONFIG[action] || ACTION_CONFIG.updated;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {event.actor?.fullName ?? event.actor?.email ?? "System"}
                        </span>
                        <span className="text-muted-foreground"> {config.label} </span>
                        <span className="font-medium">{formatEntityName(event.entityType, event.metadataJson)}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(event.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
