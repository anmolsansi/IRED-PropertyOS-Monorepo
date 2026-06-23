"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoSection } from "@/components/properties/InfoSection";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSiteVisit, useUpdateSiteVisit } from "@/hooks/use-site-visits";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

const SV_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const SV_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  no_show: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function SiteVisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: siteVisit, isLoading, error } = useSiteVisit(id);
  const updateSiteVisit = useUpdateSiteVisit();
  const queryClient = useQueryClient();

  async function handleStatusChange(newStatus: string) {
    try {
      await updateSiteVisit.mutateAsync({ id, data: { status: newStatus } });
      toast.success(`Site visit marked as ${SV_STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update site visit");
    }
  }

  if (isLoading) return <LoadingSkeleton type="detail" />;

  if (error || !siteVisit) {
    return (
      <EmptyState
        title="Site visit not found"
        description="The site visit you're looking for doesn't exist."
        action={
          <Link href="/site-visits">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Site Visits
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Visit Detail"
        description={SV_STATUS_LABELS[siteVisit.status]}
      >
        <Link href="/site-visits">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {siteVisit.status === "scheduled" || siteVisit.status === "confirmed" ? (
          <>
            <Button
              size="sm"
              onClick={() => handleStatusChange("completed")}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("cancelled")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection
          title="Visit Information"
          fields={[
            {
              label: "Status",
              value: (
                <Badge variant="secondary" className={SV_STATUS_COLORS[siteVisit.status]}>
                  {SV_STATUS_LABELS[siteVisit.status]}
                </Badge>
              ),
            },
            {
              label: "Scheduled Date/Time",
              value: new Date(siteVisit.scheduledAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            { label: "Client", value: siteVisit.client?.name || "—" },
            { label: "Building", value: siteVisit.building?.buildingName || "—" },
            { label: "Unit", value: siteVisit.unitId || "—" },
            { label: "Assigned To", value: siteVisit.assignedTo?.fullName || siteVisit.assignedToId || "—" },
          ]}
        />

        <InfoSection
          title="Record Info"
          fields={[
            { label: "Site Visit ID", value: siteVisit.id },
            {
              label: "Created At",
              value: new Date(siteVisit.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            {
              label: "Last Updated",
              value: new Date(siteVisit.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
          ]}
        />
      </div>

      {siteVisit.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {siteVisit.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {siteVisit.clientId && (
              <Link href={`/clients/${siteVisit.clientId}`}>
                <Button variant="outline" size="sm">View Client</Button>
              </Link>
            )}
            {siteVisit.buildingId && (
              <Link href={`/properties/${siteVisit.buildingId}`}>
                <Button variant="outline" size="sm">View Building</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
